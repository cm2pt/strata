"""Mock connector — generates deterministic demo data using seeded RNG."""
import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Any

from .base import BaseConnector
from .registry import register
from .types import ConnectionTestResult, CostEvent, CoverageReport, SourceAsset, UsageEvent


@register("mock")
class MockConnector(BaseConnector):
    """Generates realistic-looking demo data from deterministic seeds."""

    @property
    def connector_type(self) -> str:
        return "mock"

    @property
    def display_name(self) -> str:
        return "Mock Connector (Demo)"

    def _get_rng(self, salt: str = "") -> random.Random:
        """Deterministic RNG seeded from config + salt."""
        seed_str = str(self.config.get("seed", "demo-seed")) + salt
        seed_int = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
        return random.Random(seed_int)

    async def test_connection(self) -> ConnectionTestResult:
        return ConnectionTestResult(
            success=True,
            message="Mock connector ready. Deterministic seed: " + str(self.config.get("seed", "demo-seed")),
            latency_ms=42.0,
            details={"mode": "mock", "seed": self.config.get("seed", "demo-seed")},
        )

    async def discover_assets(self) -> list[SourceAsset]:
        rng = self._get_rng("discover")
        asset_count = rng.randint(8, 15)
        asset_types = ["table", "view", "materialized_view", "external_table"]
        schemas = ["raw", "staging", "analytics", "ml_features", "reporting"]

        assets = []
        asset_names = [
            "customer_events", "transactions", "user_profiles", "product_catalog",
            "order_history", "session_logs", "marketing_campaigns", "revenue_daily",
            "churn_features", "inventory_snapshot", "cost_allocation", "usage_metrics",
            "experiment_results", "support_tickets", "employee_activity",
        ]

        for i in range(asset_count):
            name = asset_names[i % len(asset_names)]
            assets.append(SourceAsset(
                external_id=f"mock-{i:04d}",
                asset_name=name,
                asset_type=rng.choice(asset_types),
                schema_name=rng.choice(schemas),
                database_name="demo_warehouse",
                metadata={"mock": True, "index": i},
                row_count=rng.randint(1000, 10_000_000),
                size_bytes=rng.randint(1_000_000, 50_000_000_000),
                last_modified=datetime.now(timezone.utc) - timedelta(hours=rng.randint(1, 168)),
            ))

        return assets

    async def fetch_usage_events(self, start: datetime, end: datetime) -> list[UsageEvent]:
        rng = self._get_rng("usage")
        assets = await self.discover_assets()
        events = []

        users = [f"user_{i}@acme.com" for i in range(1, 51)]
        current = start

        while current < end:
            # Weekdays get more usage
            is_weekday = current.weekday() < 5
            daily_events = rng.randint(20, 80) if is_weekday else rng.randint(2, 15)

            for _ in range(daily_events):
                asset = rng.choice(assets)
                # Some assets have declining usage (edge case)
                if asset.external_id == "mock-0005":
                    if rng.random() > 0.3:  # 70% chance to skip — declining usage
                        continue

                events.append(UsageEvent(
                    source_asset_external_id=asset.external_id,
                    user_identifier=rng.choice(users),
                    event_at=current + timedelta(hours=rng.randint(8, 18), minutes=rng.randint(0, 59)),
                    bytes_scanned=rng.randint(100_000, 5_000_000_000),
                    duration_ms=rng.randint(100, 30_000),
                ))

            current += timedelta(days=1)

        return events

    async def fetch_cost_events(self, start: datetime, end: datetime) -> list[CostEvent]:
        rng = self._get_rng("cost")
        assets = await self.discover_assets()
        events = []

        current = start.replace(day=1)
        while current < end:
            month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1)

            for asset in assets:
                base_compute = rng.uniform(200, 5000)
                base_storage = rng.uniform(50, 2000)
                base_pipeline = rng.uniform(100, 1500)

                # One asset has a cost spike (edge case)
                if asset.external_id == "mock-0002":
                    base_compute *= 2.5

                for cost_type, amount in [("compute", base_compute), ("storage", base_storage), ("pipeline", base_pipeline)]:
                    events.append(CostEvent(
                        source_asset_external_id=asset.external_id,
                        cost_type=cost_type,
                        amount=round(amount, 2),
                        period_start=current,
                        period_end=min(month_end, end),
                    ))

            current = month_end

        return events
