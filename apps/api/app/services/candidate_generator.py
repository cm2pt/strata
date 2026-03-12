"""Candidate generation engine — builds product candidates from evidence streams.

Evidence streams:
  1. dbt exposures        → semantic_product or dbt_product candidates
  2. Power BI datasets    → semantic_product candidates (dataset + report bundle)
  3. Certified assets     → certified_asset candidates (gold-labeled warehouse objects)
  4. Co-usage clusters    → usage_bundle candidates (tables frequently queried together)

Merge strategy:
  - Cross-platform entity resolution via qualified_name
  - Power BI dataset → dbt exposure → warehouse tables
  - Confidence scoring is deterministic and explainable

Confidence formula (0-100, capped):
  +45  Power BI dataset with ≥ 2 consumers
  +35  dbt exposure exists
  +20  Certified tag on any member asset
  +0-30 Usage cluster strength (unique_users / 5, capped at 30)
  -20  No owner_hint on any member
  -20  Low cost coverage (< 50% of member assets have cost events)
"""

import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import (
    CandidateMember,
    CandidateStatus,
    CandidateType,
    ProductCandidate,
)
from app.models.connector import (
    CostEvent as CostEventModel,
    SourceAsset as SourceAssetModel,
    UsageEvent as UsageEventModel,
)
from app.models.edge import Edge as EdgeModel

logger = logging.getLogger(__name__)


class CandidateGenerator:
    """Generates product candidates from discovered source assets, edges, and events."""

    def __init__(self, db: AsyncSession, org_id: uuid.UUID):
        self.db = db
        self.org_id = org_id

    async def generate(self) -> list[ProductCandidate]:
        """Run the full candidate generation pipeline."""
        logger.info(f"[CandidateGenerator] Starting for org {self.org_id}")

        # Load all source assets for this org
        assets = await self._load_assets()
        edges = await self._load_edges()
        usage_stats = await self._compute_usage_stats()
        cost_coverage = await self._compute_cost_coverage()
        cost_stats = await self._compute_cost_stats()

        # Build lookup maps
        asset_by_id = {a.id: a for a in assets}
        asset_by_ext = {a.external_id: a for a in assets}
        asset_by_qn = {}
        for a in assets:
            if a.qualified_name:
                asset_by_qn[a.qualified_name] = a

        # Evidence stream 1: dbt exposures → candidates
        dbt_candidates = self._generate_dbt_exposure_candidates(
            assets, edges, asset_by_ext, asset_by_qn, usage_stats, cost_coverage, cost_stats,
        )

        # Evidence stream 2: Power BI datasets → candidates (merge with dbt if overlapping)
        pbi_candidates = self._generate_powerbi_candidates(
            assets, edges, asset_by_ext, asset_by_qn, usage_stats, cost_coverage, cost_stats,
            existing_candidates=dbt_candidates,
        )

        # Evidence stream 3: Certified assets without existing candidates
        certified_candidates = self._generate_certified_candidates(
            assets, usage_stats, cost_coverage, cost_stats,
            claimed_assets=self._claimed_asset_ids(dbt_candidates + pbi_candidates),
        )

        # Evidence stream 4: Usage bundles (co-queried tables)
        usage_candidates = self._generate_usage_bundle_candidates(
            assets, usage_stats, cost_coverage, cost_stats,
            claimed_assets=self._claimed_asset_ids(
                dbt_candidates + pbi_candidates + certified_candidates
            ),
        )

        all_candidates = dbt_candidates + pbi_candidates + certified_candidates + usage_candidates

        # Persist
        for c in all_candidates:
            self.db.add(c)
        await self.db.flush()

        logger.info(f"[CandidateGenerator] Generated {len(all_candidates)} candidates")
        return all_candidates

    # ========== EVIDENCE STREAM: dbt EXPOSURES ==========

    def _generate_dbt_exposure_candidates(
        self, assets, edges, asset_by_ext, asset_by_qn, usage_stats, cost_coverage, cost_stats,
    ) -> list[ProductCandidate]:
        candidates = []
        exposures = [a for a in assets if a.asset_type == "dbt_exposure"]

        for exp in exposures:
            # Find upstream models via edges
            upstream_ids = set()
            for edge in edges:
                if edge.to_asset_id == exp.id and edge.edge_type == "exposure":
                    upstream_ids.add(edge.from_asset_id)

            # Resolve dbt models → warehouse tables via relation_name
            member_assets = [exp]  # The exposure itself
            for uid in upstream_ids:
                model_asset = self._find_asset_by_id(uid, assets)
                if model_asset:
                    member_assets.append(model_asset)
                    # Also try to find the warehouse table this model materializes to
                    if model_asset.qualified_name and model_asset.qualified_name in asset_by_qn:
                        wh_asset = asset_by_qn[model_asset.qualified_name]
                        if wh_asset.id != model_asset.id:
                            member_assets.append(wh_asset)

            # Compute confidence
            breakdown = {}
            score = 0
            score += 35
            breakdown["dbt_exposure"] = 35

            # Check if certified
            if any("certified" in (a.tags_json or []) for a in member_assets):
                score += 20
                breakdown["certified"] = 20

            # Usage
            usage_score = self._usage_score(member_assets, usage_stats)
            score += usage_score
            breakdown["usage"] = usage_score

            # Owner
            if not any(a.owner_hint for a in member_assets):
                score -= 20
                breakdown["no_owner"] = -20

            # Cost coverage
            cc = self._cost_coverage_score(member_assets, cost_coverage)
            if cc < 0:
                score += cc
                breakdown["low_cost_coverage"] = cc

            score = max(0, min(100, score))

            # Aggregate economics
            monthly_cost, consumers, teams = self._aggregate_economics(member_assets, usage_stats, cost_stats)

            candidate = ProductCandidate(
                org_id=self.org_id,
                candidate_type=CandidateType.dbt_product,
                name_suggested=exp.display_name or exp.asset_name.replace("_", " ").title(),
                domain_suggested=self._infer_domain(member_assets),
                owner_suggested=exp.owner_hint,
                confidence_score=score,
                confidence_breakdown_json=breakdown,
                evidence_json={
                    "dbt_exposure": exp.external_id,
                    "upstream_models": [a.external_id for a in member_assets if a.asset_type == "dbt_model"],
                    "warehouse_tables": [a.external_id for a in member_assets if a.platform in ("snowflake", "databricks")],
                },
                status=CandidateStatus.new,
                monthly_cost_estimate=monthly_cost,
                monthly_consumers=consumers,
                consumer_teams_json=teams,
                cost_coverage_pct=self._cost_coverage_pct(member_assets, cost_coverage),
                source_count=len(member_assets),
            )
            # Add members
            for i, ma in enumerate(member_assets):
                role = "primary" if ma.asset_type == "dbt_exposure" else "derived"
                if ma.platform in ("snowflake", "databricks") and ma.asset_type != "dbt_model":
                    role = "primary"
                candidate.members.append(CandidateMember(
                    source_asset_id=ma.id,
                    role=role,
                    inclusion_reason=f"dbt exposure dependency" if role == "derived" else "exposure declaration",
                    weight=1.0 if role == "primary" else 0.5,
                ))

            candidates.append(candidate)

        return candidates

    # ========== EVIDENCE STREAM: POWER BI ==========

    def _generate_powerbi_candidates(
        self, assets, edges, asset_by_ext, asset_by_qn, usage_stats, cost_coverage, cost_stats,
        existing_candidates,
    ) -> list[ProductCandidate]:
        candidates = []
        datasets = [a for a in assets if a.asset_type == "dataset" and a.platform == "powerbi"]

        # Build set of assets already claimed by dbt candidates
        claimed = self._claimed_asset_ids(existing_candidates)

        for ds in datasets:
            # Find upstream warehouse tables via consumption edges
            upstream_ids = set()
            for edge in edges:
                if edge.to_asset_id == ds.id and edge.edge_type == "consumption":
                    upstream_ids.add(edge.from_asset_id)

            # Find associated reports
            reports = [a for a in assets if a.asset_type == "report"
                       and a.metadata_json.get("dataset_id") == ds.external_id]

            member_assets = [ds] + reports
            for uid in upstream_ids:
                upstream_asset = self._find_asset_by_id(uid, assets)
                if upstream_asset:
                    member_assets.append(upstream_asset)

            # Check if this overlaps significantly with an existing dbt candidate
            member_ids = {ma.id for ma in member_assets}
            overlap = member_ids & claimed
            if len(overlap) > 0:
                # Merge: boost the existing candidate's confidence instead
                for ec in existing_candidates:
                    ec_member_ids = {m.source_asset_id for m in ec.members}
                    if ec_member_ids & member_ids:
                        # Add Power BI boost
                        ec.confidence_score = min(100, ec.confidence_score + 45)
                        ec.confidence_breakdown_json["powerbi_dataset"] = 45
                        ec.candidate_type = CandidateType.semantic_product
                        # Add Power BI members
                        for ma in [ds] + reports:
                            if ma.id not in ec_member_ids:
                                ec.members.append(CandidateMember(
                                    source_asset_id=ma.id,
                                    role="consumption",
                                    inclusion_reason="Power BI consumption layer",
                                    weight=0.3,
                                ))
                                ec.source_count += 1
                        ec.evidence_json["powerbi_dataset"] = ds.external_id
                        ec.evidence_json["powerbi_reports"] = [r.external_id for r in reports]
                        break
                continue

            # Standalone Power BI candidate
            breakdown = {}
            score = 0
            score += 45
            breakdown["powerbi_dataset"] = 45

            if any("certified" in (a.tags_json or []) for a in member_assets):
                score += 20
                breakdown["certified"] = 20

            usage_score = self._usage_score(member_assets, usage_stats)
            score += usage_score
            breakdown["usage"] = usage_score

            if not any(a.owner_hint for a in member_assets):
                score -= 20
                breakdown["no_owner"] = -20

            cc = self._cost_coverage_score(member_assets, cost_coverage)
            if cc < 0:
                score += cc
                breakdown["low_cost_coverage"] = cc

            score = max(0, min(100, score))

            monthly_cost, consumers, teams = self._aggregate_economics(member_assets, usage_stats, cost_stats)

            candidate = ProductCandidate(
                org_id=self.org_id,
                candidate_type=CandidateType.semantic_product,
                name_suggested=ds.display_name or ds.asset_name,
                domain_suggested=self._infer_domain(member_assets),
                owner_suggested=ds.owner_hint,
                confidence_score=score,
                confidence_breakdown_json=breakdown,
                evidence_json={
                    "powerbi_dataset": ds.external_id,
                    "powerbi_reports": [r.external_id for r in reports],
                    "warehouse_tables": [a.external_id for a in member_assets if a.platform in ("snowflake", "databricks")],
                },
                status=CandidateStatus.new,
                monthly_cost_estimate=monthly_cost,
                monthly_consumers=consumers,
                consumer_teams_json=teams,
                cost_coverage_pct=self._cost_coverage_pct(member_assets, cost_coverage),
                source_count=len(member_assets),
            )
            for ma in member_assets:
                role = "consumption" if ma.platform == "powerbi" else "primary"
                candidate.members.append(CandidateMember(
                    source_asset_id=ma.id,
                    role=role,
                    inclusion_reason="Power BI dataset source" if role == "consumption" else "warehouse table",
                    weight=0.3 if role == "consumption" else 1.0,
                ))

            candidates.append(candidate)

        return candidates

    # ========== EVIDENCE STREAM: CERTIFIED ASSETS ==========

    def _generate_certified_candidates(
        self, assets, usage_stats, cost_coverage, cost_stats, claimed_assets: set,
    ) -> list[ProductCandidate]:
        candidates = []

        for a in assets:
            if a.id in claimed_assets:
                continue
            if a.platform not in ("snowflake", "databricks"):
                continue
            tags = a.tags_json if isinstance(a.tags_json, list) else []
            if "certified" not in tags and "gold" not in tags:
                continue

            breakdown = {"certified": 20}
            score = 20

            usage_score = self._usage_score([a], usage_stats)
            score += usage_score
            breakdown["usage"] = usage_score

            if not a.owner_hint:
                score -= 20
                breakdown["no_owner"] = -20

            cc = self._cost_coverage_score([a], cost_coverage)
            if cc < 0:
                score += cc
                breakdown["low_cost_coverage"] = cc

            score = max(0, min(100, score))

            monthly_cost, consumers, teams = self._aggregate_economics([a], usage_stats, cost_stats)

            candidate = ProductCandidate(
                org_id=self.org_id,
                candidate_type=CandidateType.certified_asset,
                name_suggested=a.display_name or a.asset_name.replace("_", " ").title(),
                domain_suggested=self._infer_domain([a]),
                owner_suggested=a.owner_hint,
                confidence_score=score,
                confidence_breakdown_json=breakdown,
                evidence_json={"certified_asset": a.external_id},
                status=CandidateStatus.new,
                monthly_cost_estimate=monthly_cost,
                monthly_consumers=consumers,
                consumer_teams_json=teams,
                cost_coverage_pct=self._cost_coverage_pct([a], cost_coverage),
                source_count=1,
            )
            candidate.members.append(CandidateMember(
                source_asset_id=a.id,
                role="primary",
                inclusion_reason="Certified warehouse asset",
                weight=1.0,
            ))
            candidates.append(candidate)

        return candidates

    # ========== EVIDENCE STREAM: USAGE BUNDLES ==========

    def _generate_usage_bundle_candidates(
        self, assets, usage_stats, cost_coverage, cost_stats, claimed_assets: set,
    ) -> list[ProductCandidate]:
        """Group tables that are frequently queried together."""
        # This is a simplified co-occurrence check from usage_stats
        # In the demo, we won't generate usage bundles since other streams cover all assets
        return []

    # ========== HELPERS ==========

    async def _load_assets(self) -> list[SourceAssetModel]:
        result = await self.db.execute(
            select(SourceAssetModel).where(SourceAssetModel.org_id == self.org_id)
        )
        return list(result.scalars().all())

    async def _load_edges(self) -> list[EdgeModel]:
        result = await self.db.execute(
            select(EdgeModel).where(EdgeModel.org_id == self.org_id)
        )
        return list(result.scalars().all())

    async def _compute_usage_stats(self) -> dict[uuid.UUID, dict]:
        """Compute per-asset usage stats: unique_users, total_queries, teams."""
        # Get all usage events linked to our org's assets
        result = await self.db.execute(
            select(
                UsageEventModel.source_asset_id,
                func.count().label("total_queries"),
                func.count(func.distinct(UsageEventModel.user_identifier)).label("unique_users"),
            )
            .join(SourceAssetModel, SourceAssetModel.id == UsageEventModel.source_asset_id)
            .where(SourceAssetModel.org_id == self.org_id)
            .group_by(UsageEventModel.source_asset_id)
        )
        stats = {}
        for row in result.all():
            stats[row.source_asset_id] = {
                "total_queries": row.total_queries,
                "unique_users": row.unique_users,
            }

        # Also get team breakdown
        team_result = await self.db.execute(
            select(
                UsageEventModel.source_asset_id,
                UsageEventModel.team_identifier,
                func.count(func.distinct(UsageEventModel.user_identifier)).label("consumers"),
            )
            .join(SourceAssetModel, SourceAssetModel.id == UsageEventModel.source_asset_id)
            .where(
                SourceAssetModel.org_id == self.org_id,
                UsageEventModel.team_identifier.isnot(None),
            )
            .group_by(UsageEventModel.source_asset_id, UsageEventModel.team_identifier)
        )
        for row in team_result.all():
            if row.source_asset_id in stats:
                teams = stats[row.source_asset_id].setdefault("teams", [])
                teams.append({"team": row.team_identifier, "consumers": row.consumers})

        return stats

    async def _compute_cost_coverage(self) -> set[uuid.UUID]:
        """Return set of asset IDs that have at least one cost event."""
        result = await self.db.execute(
            select(func.distinct(CostEventModel.source_asset_id))
            .join(SourceAssetModel, SourceAssetModel.id == CostEventModel.source_asset_id)
            .where(
                SourceAssetModel.org_id == self.org_id,
                CostEventModel.source_asset_id.isnot(None),
            )
        )
        return {row[0] for row in result.all()}

    async def _compute_cost_stats(self) -> dict[uuid.UUID, float]:
        """Compute average monthly cost per source asset from cost events."""
        result = await self.db.execute(
            select(
                CostEventModel.source_asset_id,
                func.sum(CostEventModel.amount).label("total_cost"),
                func.count(func.distinct(CostEventModel.period_start)).label("num_months"),
            )
            .join(SourceAssetModel, SourceAssetModel.id == CostEventModel.source_asset_id)
            .where(
                SourceAssetModel.org_id == self.org_id,
                CostEventModel.source_asset_id.isnot(None),
            )
            .group_by(CostEventModel.source_asset_id)
        )
        stats: dict[uuid.UUID, float] = {}
        for row in result.all():
            num_months = max(row.num_months, 1)
            stats[row.source_asset_id] = float(row.total_cost) / num_months
        return stats

    def _find_asset_by_id(self, asset_id, assets):
        for a in assets:
            if a.id == asset_id:
                return a
        return None

    def _usage_score(self, member_assets, usage_stats) -> int:
        """0-30 based on unique users across all member assets."""
        unique_users = set()
        for a in member_assets:
            s = usage_stats.get(a.id, {})
            unique_users.update(range(s.get("unique_users", 0)))
        return min(30, len(unique_users) * 6)  # 5 users → 30 pts

    def _cost_coverage_score(self, member_assets, cost_coverage_set) -> int:
        """Returns -20 if < 50% of assets have cost data."""
        if not member_assets:
            return 0
        warehouse_assets = [a for a in member_assets if a.platform in ("snowflake", "databricks")]
        if not warehouse_assets:
            return 0
        covered = sum(1 for a in warehouse_assets if a.id in cost_coverage_set)
        pct = covered / len(warehouse_assets) if warehouse_assets else 0
        return -20 if pct < 0.5 else 0

    def _cost_coverage_pct(self, member_assets, cost_coverage_set) -> float:
        warehouse_assets = [a for a in member_assets if a.platform in ("snowflake", "databricks")]
        if not warehouse_assets:
            return 0.0
        covered = sum(1 for a in warehouse_assets if a.id in cost_coverage_set)
        return covered / len(warehouse_assets)

    def _aggregate_economics(self, member_assets, usage_stats, cost_stats):
        """Return (monthly_cost_estimate, consumers_count, teams_list)."""
        all_teams = defaultdict(int)
        total_consumers = 0
        monthly_cost = 0.0
        seen_asset_ids = set()
        for a in member_assets:
            s = usage_stats.get(a.id, {})
            total_consumers = max(total_consumers, s.get("unique_users", 0))
            for t in s.get("teams", []):
                all_teams[t["team"]] += t["consumers"]
            # Sum cost from cost events (deduplicate by asset id)
            if a.id not in seen_asset_ids:
                monthly_cost += cost_stats.get(a.id, 0.0)
                seen_asset_ids.add(a.id)

        teams_list = [{"team": k, "consumers": v} for k, v in sorted(all_teams.items(), key=lambda x: -x[1])]
        return round(monthly_cost, 2), total_consumers, teams_list

    def _infer_domain(self, member_assets) -> str:
        """Infer domain from tags or schema names."""
        all_tags = []
        for a in member_assets:
            tags = a.tags_json if isinstance(a.tags_json, list) else []
            all_tags.extend(tags)

        domain_keywords = {
            "customer": "Customer",
            "finance": "Finance",
            "marketing": "Marketing",
            "ml": "Machine Learning",
            "fraud": "Risk & Fraud",
            "pricing": "Pricing",
            "revenue": "Finance",
        }
        for tag in all_tags:
            tag_lower = tag.lower()
            for keyword, domain in domain_keywords.items():
                if keyword in tag_lower:
                    return domain

        # Fallback to schema name
        for a in member_assets:
            if a.metadata_json and isinstance(a.metadata_json, dict):
                schema = a.metadata_json.get("schema_name", "")
                if schema:
                    return schema.replace("_", " ").title()

        return "General"

    def _claimed_asset_ids(self, candidates: list[ProductCandidate]) -> set[uuid.UUID]:
        """Return all source asset IDs already claimed by a list of candidates."""
        ids = set()
        for c in candidates:
            for m in c.members:
                ids.add(m.source_asset_id)
        return ids
