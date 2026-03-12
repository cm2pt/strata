"""Replay connector — reads pre-recorded data from JSON/CSV files."""
import csv
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .base import BaseConnector
from .registry import register
from .types import ConnectionTestResult, CostEvent, CoverageReport, SourceAsset, UsageEvent

logger = logging.getLogger(__name__)


@register("replay")
class ReplayConnector(BaseConnector):
    """Replays recorded connector data from local files for demo/testing."""

    @property
    def connector_type(self) -> str:
        return "replay"

    @property
    def display_name(self) -> str:
        return "Replay Connector (Demo)"

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

        files = list(path.glob("*.json")) + list(path.glob("*.csv"))
        return ConnectionTestResult(
            success=True,
            message=f"Found {len(files)} data files in {path}",
            latency_ms=5.0,
            details={"path": str(path), "files": [f.name for f in files]},
        )

    async def discover_assets(self) -> list[SourceAsset]:
        assets_file = self.data_path / "assets.json"
        if not assets_file.exists():
            logger.warning(f"No assets.json found at {assets_file}")
            return []

        with open(assets_file) as f:
            raw = json.load(f)

        return [
            SourceAsset(
                external_id=a["external_id"],
                asset_name=a["asset_name"],
                asset_type=a.get("asset_type", "table"),
                schema_name=a.get("schema_name"),
                database_name=a.get("database_name"),
                metadata=a.get("metadata", {}),
                row_count=a.get("row_count"),
                size_bytes=a.get("size_bytes"),
                last_modified=datetime.fromisoformat(a["last_modified"]) if a.get("last_modified") else None,
            )
            for a in raw
        ]

    async def fetch_usage_events(self, start: datetime, end: datetime) -> list[UsageEvent]:
        usage_file = self.data_path / "usage_events.csv"
        if not usage_file.exists():
            logger.warning(f"No usage_events.csv found at {usage_file}")
            return []

        events = []
        with open(usage_file) as f:
            reader = csv.DictReader(f)
            for row in reader:
                event_at = datetime.fromisoformat(row["event_at"])
                if start <= event_at <= end:
                    events.append(UsageEvent(
                        source_asset_external_id=row["source_asset_external_id"],
                        user_identifier=row["user_identifier"],
                        event_at=event_at,
                        bytes_scanned=int(row.get("bytes_scanned", 0)),
                        duration_ms=int(row.get("duration_ms", 0)),
                    ))

        return events

    async def fetch_cost_events(self, start: datetime, end: datetime) -> list[CostEvent]:
        cost_file = self.data_path / "cost_events.csv"
        if not cost_file.exists():
            logger.warning(f"No cost_events.csv found at {cost_file}")
            return []

        events = []
        with open(cost_file) as f:
            reader = csv.DictReader(f)
            for row in reader:
                period_start = datetime.fromisoformat(row["period_start"])
                if period_start >= start:
                    events.append(CostEvent(
                        source_asset_external_id=row["source_asset_external_id"],
                        cost_type=row["cost_type"],
                        amount=float(row["amount"]),
                        period_start=period_start,
                        period_end=datetime.fromisoformat(row["period_end"]),
                    ))

        return events
