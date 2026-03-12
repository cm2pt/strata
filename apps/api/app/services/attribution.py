"""
Attribution Service — maps raw connector events to data products,
computes monthly aggregates, ROI history, and updates lifecycle flags.

This is the core computation engine that turns raw usage/cost events into
business-meaningful financial metrics.
"""
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connector import (
    AssetMapping,
    ConnectorConfig,
    CostEvent,
    SourceAsset,
    UsageEvent,
)
from app.models.data_product import DataProduct, LifecycleStage, ROIBand
from app.models.time_series import CostMonthly, PortfolioMonthly, ROIMonthly, UsageMonthly

logger = logging.getLogger(__name__)


class AttributionService:
    """
    Takes raw events from connectors, attributes them to data products,
    and produces monthly aggregate time-series + ROI calculations.
    """

    def __init__(self, db: AsyncSession, org_id):
        self.db = db
        self.org_id = org_id

    async def run_full_attribution(self) -> dict:
        """
        Main entry point — run after connector sync.
        Returns summary stats of what was computed.
        """
        stats = {
            "products_updated": 0,
            "months_computed": 0,
            "usage_events_attributed": 0,
            "cost_events_attributed": 0,
        }

        # Step 1: Build asset → product mapping
        mapping = await self._build_mapping()
        if not mapping:
            logger.warning("No asset mappings found. Skipping attribution.")
            return stats

        # Step 2: Compute monthly usage aggregates
        usage_stats = await self._compute_monthly_usage(mapping)
        stats["usage_events_attributed"] = usage_stats

        # Step 3: Compute monthly cost aggregates
        cost_stats = await self._compute_monthly_cost(mapping)
        stats["cost_events_attributed"] = cost_stats

        # Step 4: Update product-level current metrics
        products_updated = await self._update_product_metrics()
        stats["products_updated"] = products_updated

        # Step 5: Compute ROI history per product
        months_computed = await self._compute_roi_history()
        stats["months_computed"] = months_computed

        # Step 6: Compute portfolio monthly snapshots
        await self._compute_portfolio_monthly()

        # Step 7: Update lifecycle flags
        await self._update_lifecycle_flags()

        # Step 8: Update coverage on connectors
        await self._update_connector_coverage()

        await self.db.commit()

        logger.info(f"Attribution complete: {stats}")
        return stats

    # ------------------------------------------------------------------
    # Step 1: Build mapping from source_asset_id → data_product_id
    # ------------------------------------------------------------------
    async def _build_mapping(self) -> dict:
        """
        Build a lookup from source_asset_id → data_product_id.
        If no explicit mappings exist, attempt auto-mapping by name similarity.
        """
        # Get all source assets for connectors in this org
        q = (
            select(AssetMapping.source_asset_id, AssetMapping.data_product_id)
            .join(SourceAsset, AssetMapping.source_asset_id == SourceAsset.id)
            .join(ConnectorConfig, SourceAsset.connector_id == ConnectorConfig.id)
            .where(ConnectorConfig.org_id == self.org_id)
        )
        result = await self.db.execute(q)
        rows = result.all()

        if rows:
            return {r.source_asset_id: r.data_product_id for r in rows}

        # Auto-map: try matching source_asset.asset_name → data_product.name
        logger.info("No explicit mappings found. Attempting auto-mapping by name...")
        return await self._auto_map_assets()

    async def _auto_map_assets(self) -> dict:
        """
        Heuristic auto-mapping: match source asset names to data product names.
        Uses case-insensitive partial matching.
        """
        # Get all source assets
        q_assets = (
            select(SourceAsset)
            .join(ConnectorConfig, SourceAsset.connector_id == ConnectorConfig.id)
            .where(ConnectorConfig.org_id == self.org_id)
        )
        result = await self.db.execute(q_assets)
        source_assets = result.scalars().all()

        # Get all data products
        q_products = select(DataProduct).where(DataProduct.org_id == self.org_id)
        result = await self.db.execute(q_products)
        products = result.scalars().all()

        # Build name → product lookup (lowercase)
        product_lookup = {}
        for p in products:
            product_lookup[p.name.lower()] = p.id
            # Also index by slug-like forms
            slug = p.name.lower().replace(" ", "_").replace("-", "_")
            product_lookup[slug] = p.id

        mapping = {}
        for sa in source_assets:
            # Try exact match
            asset_lower = sa.asset_name.lower().replace("-", "_").replace(".", "_")
            matched_product = None

            # Try direct match
            if asset_lower in product_lookup:
                matched_product = product_lookup[asset_lower]
            else:
                # Try partial matching: if product name is substring of asset name
                for pname, pid in product_lookup.items():
                    if pname in asset_lower or asset_lower in pname:
                        matched_product = pid
                        break

            if matched_product:
                mapping[sa.id] = matched_product
                # Persist the mapping
                self.db.add(AssetMapping(
                    source_asset_id=sa.id,
                    data_product_id=matched_product,
                    mapping_type="auto",
                ))

        if mapping:
            await self.db.flush()
            logger.info(f"Auto-mapped {len(mapping)} assets to data products")
        else:
            logger.warning("Could not auto-map any assets")

        return mapping

    # ------------------------------------------------------------------
    # Step 2: Compute monthly usage aggregates
    # ------------------------------------------------------------------
    async def _compute_monthly_usage(self, mapping: dict) -> int:
        """
        Aggregate raw usage events into monthly per-product summaries.
        Handles multi-asset attribution (split evenly if no bytes_scanned).
        """
        # Get all usage events for mapped assets
        source_asset_ids = list(mapping.keys())
        if not source_asset_ids:
            return 0

        q = select(UsageEvent).where(UsageEvent.source_asset_id.in_(source_asset_ids))
        result = await self.db.execute(q)
        events = result.scalars().all()

        # Group by (product_id, month)
        monthly: dict[tuple, dict] = defaultdict(lambda: {
            "consumers": set(),
            "queries": 0,
            "bytes_scanned": 0,
        })

        for ev in events:
            product_id = mapping.get(ev.source_asset_id)
            if not product_id:
                continue
            month_key = date(ev.event_at.year, ev.event_at.month, 1)
            bucket = monthly[(product_id, month_key)]
            if ev.user_identifier:
                bucket["consumers"].add(ev.user_identifier)
            bucket["queries"] += 1
            bucket["bytes_scanned"] += ev.bytes_scanned or 0

        # Upsert monthly usage records
        count = 0
        for (product_id, month), agg in monthly.items():
            existing = await self.db.execute(
                select(UsageMonthly).where(
                    UsageMonthly.data_product_id == product_id,
                    UsageMonthly.month == month,
                )
            )
            row = existing.scalar_one_or_none()
            consumers = len(agg["consumers"])
            queries = agg["queries"]
            bytes_val = agg["bytes_scanned"]

            if row:
                row.consumers = consumers
                row.queries = queries
                row.bytes_scanned = bytes_val
            else:
                self.db.add(UsageMonthly(
                    data_product_id=product_id,
                    month=month,
                    consumers=consumers,
                    queries=queries,
                    bytes_scanned=bytes_val,
                ))
            count += 1

        await self.db.flush()
        return count

    # ------------------------------------------------------------------
    # Step 3: Compute monthly cost aggregates
    # ------------------------------------------------------------------
    async def _compute_monthly_cost(self, mapping: dict) -> int:
        """
        Aggregate raw cost events into monthly per-product summaries.
        Attribution rules:
        - Direct: if cost event has a mapped source_asset_id → attribute fully
        - Shared: if not mapped, mark as unattributed (reduce confidence)
        """
        source_asset_ids = list(mapping.keys())
        if not source_asset_ids:
            return 0

        q = select(CostEvent).where(CostEvent.source_asset_id.in_(source_asset_ids))
        result = await self.db.execute(q)
        events = result.scalars().all()

        # Group by (product_id, month)
        monthly: dict[tuple, dict] = defaultdict(lambda: {
            "compute": Decimal("0"),
            "storage": Decimal("0"),
            "pipeline": Decimal("0"),
            "total": Decimal("0"),
        })

        for ev in events:
            product_id = mapping.get(ev.source_asset_id)
            if not product_id:
                continue
            month_key = date(ev.period_start.year, ev.period_start.month, 1)
            bucket = monthly[(product_id, month_key)]
            amount = Decimal(str(ev.amount))

            if ev.cost_type == "compute":
                bucket["compute"] += amount
            elif ev.cost_type == "storage":
                bucket["storage"] += amount
            elif ev.cost_type == "pipeline":
                bucket["pipeline"] += amount
            bucket["total"] += amount

        # Upsert monthly cost records
        count = 0
        for (product_id, month), agg in monthly.items():
            existing = await self.db.execute(
                select(CostMonthly).where(
                    CostMonthly.data_product_id == product_id,
                    CostMonthly.month == month,
                )
            )
            row = existing.scalar_one_or_none()

            if row:
                row.compute = float(agg["compute"])
                row.storage = float(agg["storage"])
                row.pipeline = float(agg["pipeline"])
                row.total_cost = float(agg["total"])
                row.coverage_pct = 1.0  # Directly attributed
            else:
                self.db.add(CostMonthly(
                    data_product_id=product_id,
                    month=month,
                    compute=float(agg["compute"]),
                    storage=float(agg["storage"]),
                    pipeline=float(agg["pipeline"]),
                    total_cost=float(agg["total"]),
                    coverage_pct=1.0,
                ))
            count += 1

        await self.db.flush()
        return count

    # ------------------------------------------------------------------
    # Step 4: Update product-level current metrics
    # ------------------------------------------------------------------
    async def _update_product_metrics(self) -> int:
        """
        Update DataProduct.monthly_cost, monthly_consumers, total_queries, etc.
        from the latest month's aggregated data.
        """
        products = await self.db.execute(
            select(DataProduct).where(DataProduct.org_id == self.org_id)
        )
        products = products.scalars().all()

        count = 0
        for product in products:
            # Get the latest cost monthly
            latest_cost = await self.db.execute(
                select(CostMonthly)
                .where(CostMonthly.data_product_id == product.id)
                .order_by(CostMonthly.month.desc())
                .limit(1)
            )
            cost_row = latest_cost.scalar_one_or_none()

            # Get previous month for trend
            prev_cost = await self.db.execute(
                select(CostMonthly)
                .where(CostMonthly.data_product_id == product.id)
                .order_by(CostMonthly.month.desc())
                .offset(1)
                .limit(1)
            )
            prev_cost_row = prev_cost.scalar_one_or_none()

            if cost_row:
                product.monthly_cost = cost_row.total_cost
                product.cost_coverage = cost_row.coverage_pct
                if prev_cost_row and prev_cost_row.total_cost > 0:
                    trend = ((cost_row.total_cost - prev_cost_row.total_cost) / prev_cost_row.total_cost) * 100
                    product.cost_trend = round(trend, 2)
                    product.has_cost_spike = trend > 30  # >30% MoM increase

            # Get the latest usage monthly
            latest_usage = await self.db.execute(
                select(UsageMonthly)
                .where(UsageMonthly.data_product_id == product.id)
                .order_by(UsageMonthly.month.desc())
                .limit(1)
            )
            usage_row = latest_usage.scalar_one_or_none()

            prev_usage = await self.db.execute(
                select(UsageMonthly)
                .where(UsageMonthly.data_product_id == product.id)
                .order_by(UsageMonthly.month.desc())
                .offset(1)
                .limit(1)
            )
            prev_usage_row = prev_usage.scalar_one_or_none()

            if usage_row:
                product.monthly_consumers = usage_row.consumers
                product.total_queries = usage_row.queries
                if prev_usage_row and prev_usage_row.consumers > 0:
                    usage_trend = ((usage_row.consumers - prev_usage_row.consumers) / prev_usage_row.consumers) * 100
                    product.usage_trend = round(usage_trend, 2)
                    product.has_usage_decline = usage_trend < -20  # >20% decline

                # Update peak
                if usage_row.consumers > product.peak_consumers:
                    product.peak_consumers = usage_row.consumers

            # Compute ROI
            if product.monthly_cost and float(product.monthly_cost) > 0:
                composite = float(product.composite_value or 0)
                cost = float(product.monthly_cost)
                roi = round(composite / cost, 4) if cost > 0 else 0
                product.roi = roi
                # Assign ROI band
                if roi >= 3:
                    product.roi_band = ROIBand.high
                elif roi >= 1.5:
                    product.roi_band = ROIBand.healthy
                elif roi >= 0.5:
                    product.roi_band = ROIBand.underperforming
                else:
                    product.roi_band = ROIBand.critical

            count += 1

        await self.db.flush()
        return count

    # ------------------------------------------------------------------
    # Step 5: Compute ROI history per product
    # ------------------------------------------------------------------
    async def _compute_roi_history(self) -> int:
        """
        For each product, compute ROI for each month where we have both cost and value data.
        """
        products = await self.db.execute(
            select(DataProduct.id, DataProduct.composite_value)
            .where(DataProduct.org_id == self.org_id)
        )
        products = products.all()

        count = 0
        for product_id, composite_value in products:
            # Get all monthly costs for this product
            costs = await self.db.execute(
                select(CostMonthly)
                .where(CostMonthly.data_product_id == product_id)
                .order_by(CostMonthly.month)
            )
            cost_rows = costs.scalars().all()

            for cost_row in cost_rows:
                cost_val = float(cost_row.total_cost)
                value_val = float(composite_value or 0)
                roi = round(value_val / cost_val, 4) if cost_val > 0 else None

                # Upsert ROI monthly
                existing = await self.db.execute(
                    select(ROIMonthly).where(
                        ROIMonthly.data_product_id == product_id,
                        ROIMonthly.month == cost_row.month,
                    )
                )
                row = existing.scalar_one_or_none()
                if row:
                    row.roi = roi
                    row.cost = cost_val
                    row.composite_value = value_val
                else:
                    self.db.add(ROIMonthly(
                        data_product_id=product_id,
                        month=cost_row.month,
                        roi=roi,
                        cost=cost_val,
                        composite_value=value_val,
                    ))
                count += 1

        await self.db.flush()
        return count

    # ------------------------------------------------------------------
    # Step 6: Compute portfolio monthly snapshots
    # ------------------------------------------------------------------
    async def _compute_portfolio_monthly(self) -> None:
        """
        Roll up product metrics into org-level monthly snapshots.
        """
        # Get distinct months from cost_monthly
        months_q = await self.db.execute(
            select(CostMonthly.month)
            .join(DataProduct, CostMonthly.data_product_id == DataProduct.id)
            .where(DataProduct.org_id == self.org_id)
            .distinct()
            .order_by(CostMonthly.month)
        )
        months = [r[0] for r in months_q.all()]

        for month in months:
            # Aggregate across all products for this month
            cost_agg = await self.db.execute(
                select(
                    func.count(CostMonthly.id).label("product_count"),
                    func.sum(CostMonthly.total_cost).label("total_cost"),
                )
                .join(DataProduct, CostMonthly.data_product_id == DataProduct.id)
                .where(DataProduct.org_id == self.org_id, CostMonthly.month == month)
            )
            cost_row = cost_agg.one()

            usage_agg = await self.db.execute(
                select(func.sum(UsageMonthly.consumers).label("total_consumers"))
                .join(DataProduct, UsageMonthly.data_product_id == DataProduct.id)
                .where(DataProduct.org_id == self.org_id, UsageMonthly.month == month)
            )
            usage_row = usage_agg.one()

            total_cost = float(cost_row.total_cost or 0)
            total_products = cost_row.product_count or 0
            total_consumers = int(usage_row.total_consumers or 0)

            # Total value: sum of composite_value from all products
            value_agg = await self.db.execute(
                select(func.sum(DataProduct.composite_value))
                .where(DataProduct.org_id == self.org_id)
            )
            total_value = float(value_agg.scalar() or 0)

            avg_roi = round(total_value / total_cost, 4) if total_cost > 0 else None

            # Upsert portfolio monthly
            existing = await self.db.execute(
                select(PortfolioMonthly).where(
                    PortfolioMonthly.org_id == self.org_id,
                    PortfolioMonthly.month == month,
                )
            )
            row = existing.scalar_one_or_none()
            if row:
                row.total_products = total_products
                row.total_cost = total_cost
                row.total_value = total_value
                row.average_roi = avg_roi
                row.total_consumers = total_consumers
            else:
                self.db.add(PortfolioMonthly(
                    org_id=self.org_id,
                    month=month,
                    total_products=total_products,
                    total_cost=total_cost,
                    total_value=total_value,
                    average_roi=avg_roi,
                    total_consumers=total_consumers,
                ))

        await self.db.flush()

    # ------------------------------------------------------------------
    # Step 7: Update lifecycle flags
    # ------------------------------------------------------------------
    async def _update_lifecycle_flags(self) -> None:
        """
        Detect retirement candidates and lifecycle stage suggestions.
        Rule: product is retirement candidate if consumers < 20% of peak for 90+ days.
        """
        products = await self.db.execute(
            select(DataProduct).where(
                DataProduct.org_id == self.org_id,
                DataProduct.lifecycle_stage != LifecycleStage.retired,
            )
        )
        for product in products.scalars().all():
            # Retirement candidate: < 20% of peak consumers
            if product.peak_consumers and product.peak_consumers > 0:
                threshold = product.peak_consumers * 0.2
                if product.monthly_consumers < threshold:
                    product.is_retirement_candidate = True

        await self.db.flush()

    # ------------------------------------------------------------------
    # Step 8: Update coverage on connectors
    # ------------------------------------------------------------------
    async def _update_connector_coverage(self) -> None:
        """
        Compute and update coverage percentages on connectors.
        Coverage = % of data products that have at least one mapped source asset.
        """
        # Total products in org
        total_products = await self.db.execute(
            select(func.count(DataProduct.id)).where(DataProduct.org_id == self.org_id)
        )
        total = total_products.scalar() or 1

        # Get connectors for org
        connectors = await self.db.execute(
            select(ConnectorConfig).where(ConnectorConfig.org_id == self.org_id)
        )
        for conn in connectors.scalars().all():
            # Count products with mappings through this connector's assets
            mapped = await self.db.execute(
                select(func.count(func.distinct(AssetMapping.data_product_id)))
                .join(SourceAsset, AssetMapping.source_asset_id == SourceAsset.id)
                .where(SourceAsset.connector_id == conn.id)
            )
            mapped_count = mapped.scalar() or 0

            # Usage coverage = % of products with usage events
            conn.usage_coverage = round(mapped_count / total, 3)

            # Cost coverage: check if cost events exist for mapped assets
            cost_count = await self.db.execute(
                select(func.count(func.distinct(CostEvent.source_asset_id)))
                .where(CostEvent.connector_id == conn.id)
            )
            cost_assets = cost_count.scalar() or 0
            conn.cost_coverage = round(cost_assets / max(conn.products_found, 1), 3)

        await self.db.flush()
