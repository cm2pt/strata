"""Connector runner — orchestrates discover -> fetch -> store -> attribute."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connector import (
    AssetMapping,
    ConnectorConfig,
    ConnectorRun,
    ConnectorStatus,
    CostEvent as CostEventModel,
    RunStatus,
    SourceAsset as SourceAssetModel,
    UsageEvent as UsageEventModel,
)
from app.models.edge import Edge as EdgeModel
from .registry import get_connector
from .types import CostEvent, EdgeRecord, SourceAsset, UsageEvent

logger = logging.getLogger(__name__)


class ConnectorRunner:
    """Runs a connector: discover assets, fetch usage/cost, store results."""

    def __init__(self, db: AsyncSession, connector_config: ConnectorConfig):
        self.db = db
        self.config = connector_config

    async def run(self) -> ConnectorRun:
        """Execute a full connector sync."""
        # Create run record
        run = ConnectorRun(
            connector_id=self.config.id,
            status=RunStatus.running,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(run)
        self.config.status = ConnectorStatus.syncing
        await self.db.flush()

        try:
            # Instantiate connector
            credentials = self.config.credentials or {}
            connector = get_connector(
                self.config.connector_type.value,
                {**credentials, "connector_id": str(self.config.id)},
            )

            # Phase 1: Discover assets
            logger.info(f"[{self.config.name}] Discovering assets...")
            discovered = await connector.discover_assets()
            await self._store_assets(discovered)

            # Phase 1b: Discover edges (if connector supports it)
            if hasattr(connector, "discover_edges"):
                logger.info(f"[{self.config.name}] Discovering edges...")
                edges = await connector.discover_edges()
                await self._store_edges(edges)

            # Phase 2: Fetch usage events (last 6 months)
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=180)

            logger.info(f"[{self.config.name}] Fetching usage events...")
            usage_events = await connector.fetch_usage_events(start, end)
            await self._store_usage_events(usage_events)

            # Phase 3: Fetch cost events
            logger.info(f"[{self.config.name}] Fetching cost events...")
            cost_events = await connector.fetch_cost_events(start, end)
            await self._store_cost_events(cost_events)

            # Phase 4: Update run + config
            run.status = RunStatus.completed
            run.ended_at = datetime.now(timezone.utc)
            run.records_found = len(discovered)
            run.usage_events_found = len(usage_events)
            run.cost_events_found = len(cost_events)

            self.config.status = ConnectorStatus.connected
            self.config.last_sync_at = datetime.now(timezone.utc)
            self.config.products_found = len(discovered)

            logger.info(
                f"[{self.config.name}] Sync complete: "
                f"{len(discovered)} assets, {len(usage_events)} usage events, {len(cost_events)} cost events"
            )

        except Exception as e:
            logger.error(f"[{self.config.name}] Sync failed: {e}")
            run.status = RunStatus.failed
            run.ended_at = datetime.now(timezone.utc)
            run.errors = {"message": str(e)}
            self.config.status = ConnectorStatus.error

        await self.db.commit()
        return run

    async def _store_assets(self, assets: list[SourceAsset]) -> None:
        """Upsert discovered source assets with enriched fields."""
        for asset in assets:
            # Check if asset already exists
            existing = await self.db.execute(
                select(SourceAssetModel).where(
                    SourceAssetModel.connector_id == self.config.id,
                    SourceAssetModel.external_id == asset.external_id,
                )
            )
            sa = existing.scalar_one_or_none()
            if sa:
                sa.asset_name = asset.asset_name
                sa.asset_type = asset.asset_type
                sa.metadata_json = asset.metadata
                # Update enrichment fields
                if asset.platform:
                    sa.platform = asset.platform
                if asset.qualified_name:
                    sa.qualified_name = asset.qualified_name
                if asset.display_name:
                    sa.display_name = asset.display_name
                if asset.owner_hint:
                    sa.owner_hint = asset.owner_hint
                if asset.tags:
                    sa.tags_json = asset.tags
            else:
                sa = SourceAssetModel(
                    connector_id=self.config.id,
                    org_id=self.config.org_id,
                    external_id=asset.external_id,
                    asset_name=asset.asset_name,
                    asset_type=asset.asset_type,
                    metadata_json=asset.metadata,
                    platform=asset.platform,
                    qualified_name=asset.qualified_name,
                    display_name=asset.display_name,
                    owner_hint=asset.owner_hint,
                    tags_json=asset.tags or [],
                )
                self.db.add(sa)
        await self.db.flush()

    async def _store_edges(self, edges: list[EdgeRecord]) -> None:
        """Store discovered edges, resolving qualified_name references."""
        # Build a lookup: qualified_name → source_asset_id
        result = await self.db.execute(
            select(SourceAssetModel).where(
                SourceAssetModel.connector_id == self.config.id,
            )
        )
        all_assets = result.scalars().all()

        ext_id_to_id = {a.external_id: a.id for a in all_assets}
        qn_to_id = {}
        for a in all_assets:
            if a.qualified_name:
                qn_to_id[a.qualified_name] = a.id

        for edge in edges:
            # Resolve from
            from_id = self._resolve_asset_id(edge.from_external_id, ext_id_to_id, qn_to_id)
            to_id = self._resolve_asset_id(edge.to_external_id, ext_id_to_id, qn_to_id)
            if not from_id or not to_id:
                continue

            self.db.add(EdgeModel(
                org_id=self.config.org_id,
                from_asset_id=from_id,
                to_asset_id=to_id,
                edge_type=edge.edge_type,
                evidence_source=edge.evidence_source,
                confidence=edge.confidence,
            ))
        await self.db.flush()

    def _resolve_asset_id(self, ref: str, ext_id_map: dict, qn_map: dict):
        """Resolve an external_id or qn:qualified_name reference to a UUID."""
        if ref.startswith("qn:"):
            qn = ref[3:]
            return qn_map.get(qn)
        return ext_id_map.get(ref)

    async def _store_usage_events(self, events: list[UsageEvent]) -> None:
        """Bulk insert usage events, resolving qn: references."""
        # Pre-build lookup maps for faster resolution
        result = await self.db.execute(
            select(SourceAssetModel).where(
                SourceAssetModel.connector_id == self.config.id,
            )
        )
        all_assets = result.scalars().all()
        ext_id_to_asset = {a.external_id: a for a in all_assets}
        qn_to_asset: dict[str, SourceAssetModel] = {}
        for a in all_assets:
            if a.qualified_name:
                qn_to_asset[a.qualified_name] = a

        for event in events:
            ref = event.source_asset_external_id
            if ref.startswith("qn:"):
                sa = qn_to_asset.get(ref[3:])
            else:
                sa = ext_id_to_asset.get(ref)

            if not sa:
                continue

            self.db.add(UsageEventModel(
                connector_id=self.config.id,
                source_asset_id=sa.id,
                user_identifier=event.user_identifier,
                team_identifier=event.team_identifier,
                event_type="query",
                event_at=event.event_at,
                bytes_scanned=event.bytes_scanned,
            ))
        await self.db.flush()

    async def _store_cost_events(self, events: list[CostEvent]) -> None:
        """Bulk insert cost events, resolving qn: references."""
        # Pre-build lookup maps
        result = await self.db.execute(
            select(SourceAssetModel).where(
                SourceAssetModel.connector_id == self.config.id,
            )
        )
        all_assets = result.scalars().all()
        ext_id_to_asset = {a.external_id: a for a in all_assets}
        qn_to_asset: dict[str, SourceAssetModel] = {}
        for a in all_assets:
            if a.qualified_name:
                qn_to_asset[a.qualified_name] = a

        for event in events:
            ref = event.source_asset_external_id
            if ref.startswith("qn:"):
                sa = qn_to_asset.get(ref[3:])
            elif ref.startswith("wh:") or ref.startswith("cluster:") or ref.startswith("pbi-workspace:"):
                # Infrastructure-level costs — store without asset linkage
                self.db.add(CostEventModel(
                    connector_id=self.config.id,
                    source_asset_id=None,
                    cost_type=event.cost_type,
                    amount=event.amount,
                    period_start=event.period_start,
                    period_end=event.period_end,
                    metadata_json={"ref": ref, **(event.metadata or {})},
                ))
                continue
            else:
                sa = ext_id_to_asset.get(ref)

            if not sa:
                continue

            self.db.add(CostEventModel(
                connector_id=self.config.id,
                source_asset_id=sa.id,
                cost_type=event.cost_type,
                amount=event.amount,
                period_start=event.period_start,
                period_end=event.period_end,
            ))
        await self.db.flush()
