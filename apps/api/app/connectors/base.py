"""Base connector interface — all connectors implement this ABC."""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from .types import ConnectionTestResult, CostEvent, CoverageReport, SourceAsset, UsageEvent


class BaseConnector(ABC):
    """Abstract base class for all Strata connectors."""

    def __init__(self, config: dict[str, Any]):
        self.config = config

    @property
    @abstractmethod
    def connector_type(self) -> str:
        """Return the connector type identifier."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for the connector."""
        ...

    @abstractmethod
    async def test_connection(self) -> ConnectionTestResult:
        """Test if the connection to the platform works."""
        ...

    @abstractmethod
    async def discover_assets(self) -> list[SourceAsset]:
        """Discover all assets available on the platform."""
        ...

    @abstractmethod
    async def fetch_usage_events(self, start: datetime, end: datetime) -> list[UsageEvent]:
        """Fetch usage events for the given time range."""
        ...

    @abstractmethod
    async def fetch_cost_events(self, start: datetime, end: datetime) -> list[CostEvent]:
        """Fetch cost events for the given time range."""
        ...

    async def get_coverage(self, mapped_asset_ids: set[str] | None = None) -> CoverageReport:
        """Compute coverage report. Can be overridden for more accuracy."""
        assets = await self.discover_assets()
        mapped = mapped_asset_ids or set()
        return CoverageReport(
            total_assets_discovered=len(assets),
            assets_mapped=len([a for a in assets if a.external_id in mapped]),
            usage_events_count=0,
            cost_events_count=0,
            cost_coverage_pct=0.0,
            usage_coverage_pct=0.0,
            unmapped_assets=[a.asset_name for a in assets if a.external_id not in mapped],
        )
