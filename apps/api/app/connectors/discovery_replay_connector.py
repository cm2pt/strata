"""Discovery Replay Connector — reads multi-platform demo packs for discovery workflow."""
import csv
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .base import BaseConnector
from .registry import register
from .types import (
    ConnectionTestResult,
    CostEvent,
    CoverageReport,
    EdgeRecord,
    SourceAsset,
    UsageEvent,
)

logger = logging.getLogger(__name__)


@register("discovery_replay")
class DiscoveryReplayConnector(BaseConnector):
    """Reads from multi-platform demo data packs (snowflake/, databricks/, dbt/, powerbi/, s3/)."""

    @property
    def connector_type(self) -> str:
        return "discovery_replay"

    @property
    def display_name(self) -> str:
        return "Discovery Replay Connector (Demo)"

    @property
    def data_path(self) -> Path:
        return Path(self.config.get("data_path", "/demo-data"))

    async def test_connection(self) -> ConnectionTestResult:
        path = self.data_path
        if not path.exists():
            return ConnectionTestResult(
                success=False,
                message=f"Data path not found: {path}",
                latency_ms=1.0,
            )
        platforms = [d.name for d in path.iterdir() if d.is_dir() and d.name in _PLATFORM_DIRS]
        return ConnectionTestResult(
            success=True,
            message=f"Found {len(platforms)} platform packs: {', '.join(platforms)}",
            latency_ms=5.0,
            details={"path": str(path), "platforms": platforms},
        )

    # ---------- DISCOVER ----------

    async def discover_assets(self) -> list[SourceAsset]:
        """Discover assets from all platform packs."""
        assets: list[SourceAsset] = []
        path = self.data_path

        # Snowflake
        assets.extend(self._load_platform_assets(path / "snowflake" / "assets.json"))
        # Databricks
        assets.extend(self._load_platform_assets(path / "databricks" / "assets.json"))
        # dbt (from manifest nodes)
        assets.extend(self._load_dbt_assets(path / "dbt" / "manifest.json"))
        # Power BI (datasets + reports)
        assets.extend(self._load_platform_assets(path / "powerbi" / "datasets.json"))
        assets.extend(self._load_platform_assets(path / "powerbi" / "reports.json"))
        # S3
        assets.extend(self._load_platform_assets(path / "s3" / "inventory.json"))

        logger.info(f"Discovered {len(assets)} assets across all platform packs")
        return assets

    # ---------- EDGES ----------

    async def discover_edges(self) -> list[EdgeRecord]:
        """Build edges from dbt manifest lineage and Power BI dataset→table consumption."""
        edges: list[EdgeRecord] = []
        path = self.data_path

        # dbt lineage edges
        edges.extend(self._build_dbt_edges(path / "dbt" / "manifest.json"))
        # Power BI consumption edges (dataset reads warehouse tables)
        edges.extend(self._build_powerbi_edges(path / "powerbi" / "datasets.json"))

        logger.info(f"Built {len(edges)} edges from dbt manifest + Power BI datasets")
        return edges

    # ---------- USAGE ----------

    async def fetch_usage_events(self, start: datetime, end: datetime) -> list[UsageEvent]:
        """Fetch usage events from query logs and Power BI usage."""
        events: list[UsageEvent] = []
        path = self.data_path

        # Snowflake query logs
        events.extend(self._load_query_log_usage(
            path / "snowflake" / "query_logs.csv", start, end,
        ))
        # Databricks query logs
        events.extend(self._load_query_log_usage(
            path / "databricks" / "query_logs.csv", start, end,
        ))
        # Power BI usage (report views → map to dataset external_id)
        events.extend(self._load_powerbi_usage(
            path / "powerbi" / "usage.csv",
            path / "powerbi" / "reports.json",
            start, end,
        ))

        return events

    # ---------- COST ----------

    async def fetch_cost_events(self, start: datetime, end: datetime) -> list[CostEvent]:
        """Fetch cost events from warehouse metering, storage, job costs, etc."""
        events: list[CostEvent] = []
        path = self.data_path

        # Snowflake storage costs (per-table)
        events.extend(self._load_storage_costs(
            path / "snowflake" / "storage_costs.csv", "snowflake", start,
        ))
        # Snowflake warehouse metering (allocated per-warehouse, we'll distribute later)
        events.extend(self._load_warehouse_metering(
            path / "snowflake" / "warehouse_metering.csv", start,
        ))
        # Databricks job/cluster costs
        events.extend(self._load_cluster_costs(
            path / "databricks" / "job_cluster_cost.csv", start,
        ))
        # S3 storage costs
        events.extend(self._load_s3_costs(
            path / "s3" / "storage_cost.csv", start,
        ))
        # Power BI capacity costs
        events.extend(self._load_powerbi_capacity_costs(
            path / "powerbi" / "capacity_cost.csv", start,
        ))

        return events

    # ========== PRIVATE LOADERS ==========

    def _load_platform_assets(self, filepath: Path) -> list[SourceAsset]:
        if not filepath.exists():
            return []
        with open(filepath) as f:
            raw = json.load(f)
        return [
            SourceAsset(
                external_id=a["external_id"],
                asset_name=a["asset_name"],
                asset_type=a.get("asset_type", "table"),
                schema_name=a.get("schema_name"),
                database_name=a.get("database_name"),
                metadata={k: v for k, v in a.items() if k not in _STANDARD_FIELDS},
                row_count=a.get("row_count"),
                size_bytes=a.get("size_bytes"),
                last_modified=datetime.fromisoformat(a["last_modified"]) if a.get("last_modified") else None,
                platform=a.get("platform"),
                qualified_name=a.get("qualified_name"),
                display_name=a.get("display_name"),
                owner_hint=a.get("owner_hint"),
                tags=a.get("tags", []),
            )
            for a in raw
        ]

    def _load_dbt_assets(self, manifest_path: Path) -> list[SourceAsset]:
        """Extract dbt models and exposures as SourceAssets (metadata layer, not warehouse tables)."""
        if not manifest_path.exists():
            return []
        with open(manifest_path) as f:
            manifest = json.load(f)

        assets: list[SourceAsset] = []
        # dbt models
        for node_id, node in manifest.get("nodes", {}).items():
            if node.get("resource_type") != "model":
                continue
            assets.append(SourceAsset(
                external_id=f"dbt-model-{node['name']}",
                asset_name=node["name"],
                asset_type="dbt_model",
                schema_name=node.get("schema"),
                database_name=node.get("database"),
                platform="dbt",
                qualified_name=node.get("relation_name", f"{node.get('database','')}.{node.get('schema','')}.{node['name']}"),
                display_name=node["name"].replace("_", " ").title(),
                owner_hint=node.get("meta", {}).get("owner"),
                tags=node.get("tags", []),
                metadata={
                    "unique_id": node_id,
                    "description": node.get("description", ""),
                    "fqn": node.get("fqn", []),
                    "depends_on": node.get("depends_on", {}).get("nodes", []),
                },
            ))

        # dbt exposures
        for exp_id, exp in manifest.get("exposures", {}).items():
            assets.append(SourceAsset(
                external_id=f"dbt-exposure-{exp['name']}",
                asset_name=exp["name"],
                asset_type="dbt_exposure",
                platform="dbt",
                qualified_name=f"dbt://exposures/{exp['name']}",
                display_name=exp["name"].replace("_", " ").title(),
                owner_hint=exp.get("owner", {}).get("email"),
                tags=exp.get("tags", []),
                metadata={
                    "unique_id": exp_id,
                    "description": exp.get("description", ""),
                    "type": exp.get("type", ""),
                    "url": exp.get("url"),
                    "depends_on": exp.get("depends_on", {}).get("nodes", []),
                    "maturity": exp.get("meta", {}).get("maturity"),
                    "sla": exp.get("meta", {}).get("sla"),
                },
            ))

        return assets

    def _build_dbt_edges(self, manifest_path: Path) -> list[EdgeRecord]:
        """Build lineage edges from dbt model dependencies."""
        if not manifest_path.exists():
            return []
        with open(manifest_path) as f:
            manifest = json.load(f)

        edges: list[EdgeRecord] = []
        # Model → upstream model lineage
        for node_id, node in manifest.get("nodes", {}).items():
            if node.get("resource_type") != "model":
                continue
            to_id = f"dbt-model-{node['name']}"
            for dep in node.get("depends_on", {}).get("nodes", []):
                dep_name = dep.split(".")[-1]
                from_id = f"dbt-model-{dep_name}"
                edges.append(EdgeRecord(
                    from_external_id=from_id,
                    to_external_id=to_id,
                    edge_type="lineage",
                    evidence_source="dbt_manifest",
                ))

        # Exposure → model edges
        for exp_id, exp in manifest.get("exposures", {}).items():
            to_id = f"dbt-exposure-{exp['name']}"
            for dep in exp.get("depends_on", {}).get("nodes", []):
                dep_name = dep.split(".")[-1]
                from_id = f"dbt-model-{dep_name}"
                edges.append(EdgeRecord(
                    from_external_id=from_id,
                    to_external_id=to_id,
                    edge_type="exposure",
                    evidence_source="dbt_manifest",
                ))

        return edges

    def _build_powerbi_edges(self, datasets_path: Path) -> list[EdgeRecord]:
        """Build consumption edges: Power BI dataset reads warehouse tables."""
        if not datasets_path.exists():
            return []
        with open(datasets_path) as f:
            datasets = json.load(f)

        edges: list[EdgeRecord] = []
        # Build a qualified_name→external_id lookup (we'll resolve these during ingestion)
        for ds in datasets:
            ds_ext_id = ds["external_id"]
            for table_qn in ds.get("tables", []):
                # The from is the warehouse table, to is the Power BI dataset
                # We use qualified_name as a proxy; during ingestion we resolve to actual asset IDs
                edges.append(EdgeRecord(
                    from_external_id=f"qn:{table_qn}",  # resolved during storage
                    to_external_id=ds_ext_id,
                    edge_type="consumption",
                    evidence_source="powerbi_dataset",
                    confidence=0.95,
                ))
        return edges

    def _load_query_log_usage(
        self, filepath: Path, start: datetime, end: datetime,
    ) -> list[UsageEvent]:
        if not filepath.exists():
            return []
        events: list[UsageEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                event_at = datetime.fromisoformat(row["query_at"])
                if not (start <= event_at <= end):
                    continue
                # Each table accessed in the query generates a usage event
                tables = row.get("tables_accessed", "").split(";")
                for table_qn in tables:
                    table_qn = table_qn.strip()
                    if not table_qn:
                        continue
                    events.append(UsageEvent(
                        source_asset_external_id=f"qn:{table_qn}",
                        user_identifier=row["user_email"],
                        event_at=event_at,
                        bytes_scanned=int(row.get("bytes_scanned", 0)),
                        duration_ms=int(row.get("duration_ms", 0)),
                        team_identifier=row.get("team"),
                    ))
        return events

    def _load_powerbi_usage(
        self,
        usage_path: Path,
        reports_path: Path,
        start: datetime,
        end: datetime,
    ) -> list[UsageEvent]:
        if not usage_path.exists():
            return []

        # Build report→dataset mapping
        report_to_dataset: dict[str, str] = {}
        if reports_path.exists():
            with open(reports_path) as f:
                for r in json.load(f):
                    report_to_dataset[r["external_id"]] = r.get("dataset_id", "")

        events: list[UsageEvent] = []
        with open(usage_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                view_at = datetime.fromisoformat(row["view_at"])
                if not (start <= view_at <= end):
                    continue
                report_id = row["report_id"]
                # Map report view to dataset usage
                dataset_id = report_to_dataset.get(report_id, report_id)
                events.append(UsageEvent(
                    source_asset_external_id=dataset_id,
                    user_identifier=row["user_email"],
                    event_at=view_at,
                    team_identifier=row.get("team"),
                ))
        return events

    def _load_storage_costs(
        self, filepath: Path, platform: str, start: datetime,
    ) -> list[CostEvent]:
        if not filepath.exists():
            return []
        events: list[CostEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                month_str = row["month"]
                period_start = datetime.strptime(month_str, "%Y-%m").replace(
                    day=1, tzinfo=timezone.utc,
                )
                if period_start < start:
                    continue
                # Period end = last day of month
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)

                events.append(CostEvent(
                    source_asset_external_id=f"qn:{row['qualified_name']}",
                    cost_type="storage",
                    amount=float(row["cost_usd"]),
                    period_start=period_start,
                    period_end=period_end,
                ))
        return events

    def _load_warehouse_metering(self, filepath: Path, start: datetime) -> list[CostEvent]:
        if not filepath.exists():
            return []
        events: list[CostEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                month_str = row["month"]
                period_start = datetime.strptime(month_str, "%Y-%m").replace(
                    day=1, tzinfo=timezone.utc,
                )
                if period_start < start:
                    continue
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)

                events.append(CostEvent(
                    source_asset_external_id=f"wh:{row['warehouse_name']}",
                    cost_type="compute",
                    amount=float(row["cost_usd"]),
                    period_start=period_start,
                    period_end=period_end,
                    metadata={"credits_used": float(row["credits_used"])},
                ))
        return events

    def _load_cluster_costs(self, filepath: Path, start: datetime) -> list[CostEvent]:
        if not filepath.exists():
            return []
        events: list[CostEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                month_str = row["month"]
                period_start = datetime.strptime(month_str, "%Y-%m").replace(
                    day=1, tzinfo=timezone.utc,
                )
                if period_start < start:
                    continue
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)

                events.append(CostEvent(
                    source_asset_external_id=f"cluster:{row['cluster_id']}",
                    cost_type="compute",
                    amount=float(row["cost_usd"]),
                    period_start=period_start,
                    period_end=period_end,
                    metadata={"dbu_hours": float(row["dbu_hours"]), "cluster_name": row["cluster_name"]},
                ))
        return events

    def _load_s3_costs(self, filepath: Path, start: datetime) -> list[CostEvent]:
        if not filepath.exists():
            return []
        events: list[CostEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                month_str = row["month"]
                period_start = datetime.strptime(month_str, "%Y-%m").replace(
                    day=1, tzinfo=timezone.utc,
                )
                if period_start < start:
                    continue
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)

                qn = f"s3://{row['bucket']}/{row['prefix']}"
                events.append(CostEvent(
                    source_asset_external_id=f"qn:{qn}",
                    cost_type="storage",
                    amount=float(row["cost_usd"]),
                    period_start=period_start,
                    period_end=period_end,
                ))
        return events

    def _load_powerbi_capacity_costs(self, filepath: Path, start: datetime) -> list[CostEvent]:
        if not filepath.exists():
            return []
        events: list[CostEvent] = []
        with open(filepath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                month_str = row["month"]
                period_start = datetime.strptime(month_str, "%Y-%m").replace(
                    day=1, tzinfo=timezone.utc,
                )
                if period_start < start:
                    continue
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)

                events.append(CostEvent(
                    source_asset_external_id=f"pbi-workspace:{row['workspace']}",
                    cost_type="compute",
                    amount=float(row["cost_usd"]),
                    period_start=period_start,
                    period_end=period_end,
                ))
        return events


# Standard fields that should not go into metadata
_STANDARD_FIELDS = {
    "external_id", "asset_name", "asset_type", "schema_name", "database_name",
    "row_count", "size_bytes", "last_modified", "platform", "qualified_name",
    "display_name", "owner_hint", "tags",
}

_PLATFORM_DIRS = {"snowflake", "databricks", "dbt", "powerbi", "s3"}
