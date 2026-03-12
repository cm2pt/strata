"""PostgreSQL connector — discovers tables and estimates costs from pg catalog."""
import logging
import time
from datetime import datetime
from typing import Any

from .base import BaseConnector
from .registry import register
from .types import ConnectionTestResult, CostEvent, SourceAsset, UsageEvent

logger = logging.getLogger(__name__)


@register("postgresql")
class PostgresConnector(BaseConnector):
    """Connects to a PostgreSQL database for asset discovery and basic metrics."""

    @property
    def connector_type(self) -> str:
        return "postgresql"

    @property
    def display_name(self) -> str:
        return "PostgreSQL"

    def _get_dsn(self) -> str:
        return self.config.get("dsn", self.config.get("connection_string", ""))

    async def test_connection(self) -> ConnectionTestResult:
        dsn = self._get_dsn()
        if not dsn:
            return ConnectionTestResult(success=False, message="No DSN configured")

        try:
            import asyncpg
            start = time.monotonic()
            conn = await asyncpg.connect(dsn)
            version = await conn.fetchval("SELECT version()")
            await conn.close()
            latency = (time.monotonic() - start) * 1000
            return ConnectionTestResult(
                success=True,
                message="Connected to PostgreSQL",
                latency_ms=round(latency, 1),
                details={"version": version},
            )
        except Exception as e:
            return ConnectionTestResult(success=False, message=str(e))

    async def discover_assets(self) -> list[SourceAsset]:
        dsn = self._get_dsn()
        if not dsn:
            return []

        try:
            import asyncpg
            conn = await asyncpg.connect(dsn)

            rows = await conn.fetch("""
                SELECT
                    t.table_schema,
                    t.table_name,
                    t.table_type,
                    COALESCE(s.n_live_tup, 0) as row_count,
                    pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as size_bytes
                FROM information_schema.tables t
                LEFT JOIN pg_stat_user_tables s
                    ON s.schemaname = t.table_schema AND s.relname = t.table_name
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY t.table_schema, t.table_name
            """)

            await conn.close()

            assets = []
            for row in rows:
                asset_type = "table" if row["table_type"] == "BASE TABLE" else "view"
                assets.append(SourceAsset(
                    external_id=f"{row['table_schema']}.{row['table_name']}",
                    asset_name=row["table_name"],
                    asset_type=asset_type,
                    schema_name=row["table_schema"],
                    database_name=None,
                    row_count=row["row_count"],
                    size_bytes=row["size_bytes"],
                ))

            return assets
        except Exception as e:
            logger.error(f"Failed to discover PostgreSQL assets: {e}")
            return []

    async def fetch_usage_events(self, start: datetime, end: datetime) -> list[UsageEvent]:
        """PostgreSQL doesn't natively track per-query usage. Returns empty."""
        # Would need pg_stat_statements extension for real usage tracking
        return []

    async def fetch_cost_events(self, start: datetime, end: datetime) -> list[CostEvent]:
        """Estimate costs from table sizes. Real implementation would use cloud billing APIs."""
        assets = await self.discover_assets()
        events = []

        for asset in assets:
            if asset.size_bytes and asset.size_bytes > 0:
                # Rough cost estimation: $0.023/GB/month for storage
                storage_gb = asset.size_bytes / (1024**3)
                storage_cost = round(storage_gb * 0.023, 4)

                if storage_cost > 0.001:
                    events.append(CostEvent(
                        source_asset_external_id=asset.external_id,
                        cost_type="storage",
                        amount=storage_cost,
                        period_start=start,
                        period_end=end,
                    ))

        return events
