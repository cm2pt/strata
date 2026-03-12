"""Snowflake extractor — generates Snowflake-realistic metadata and capabilities."""

from typing import Any

from .base_extractor import BaseExtractor
from . import register_extractor


@register_extractor("snowflake")
class SnowflakeExtractor(BaseExtractor):

    @property
    def platform(self) -> str:
        return "snowflake"

    def _cost_method(self) -> str:
        return "SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY"

    def _usage_method(self) -> str:
        return "SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY"

    def _quality_method(self) -> str:
        return "SNOWFLAKE.ACCOUNT_USAGE.DATA_QUALITY_MONITORING_RESULTS"

    def generate_capabilities(self) -> list[dict[str, Any]]:
        return [
            {
                "capability_category": "schema_metadata",
                "capability_name": "Column-level types, constraints, and clustering keys",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "INFORMATION_SCHEMA.COLUMNS + SHOW TABLES",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "query_history",
                "capability_name": "90-day query log with warehouse attribution",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "access_control",
                "capability_name": "Role hierarchy and object grants",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "cost_attribution",
                "capability_name": "Credit consumption per warehouse with compute/storage split",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "data_lineage",
                "capability_name": "Column-level lineage via ACCESS_HISTORY",
                "is_available": True,
                "requires_elevated_access": True,
                "extraction_method": "SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY (Enterprise+)",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "storage_metrics",
                "capability_name": "Table-level storage, row counts, and time travel retention",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS",
                "refresh_frequency": "per-sync",
            },
        ]

    def generate_schema_metadata(self, asset_count: int = 10) -> list[dict[str, Any]]:
        rng = self._get_rng("snowflake-schema")
        databases = ["PROD_DW", "RAW_VAULT", "ANALYTICS"]
        schemas = {
            "PROD_DW": ["FINANCE", "MARKETING", "OPERATIONS", "HR", "SUPPLY_CHAIN"],
            "RAW_VAULT": ["HUB", "LINK", "SAT", "RAW_STAGING"],
            "ANALYTICS": ["REPORTING", "ML_FEATURES", "EXEC_DASHBOARDS"],
        }
        table_names = [
            "DIM_CUSTOMER", "FACT_REVENUE", "DIM_PRODUCT", "FACT_TRANSACTIONS",
            "DIM_EMPLOYEE", "FACT_COSTS", "DIM_REGION", "FACT_USAGE_DAILY",
            "DIM_CAMPAIGN", "FACT_INVENTORY", "DIM_SUPPLIER", "FACT_ORDER_LINES",
            "AGG_MONTHLY_REVENUE", "STG_RAW_EVENTS", "ML_CHURN_FEATURES",
        ]
        column_types = [
            "VARCHAR(256)", "NUMBER(38,6)", "TIMESTAMP_NTZ", "BOOLEAN",
            "NUMBER(18,0)", "DATE", "VARIANT", "FLOAT", "VARCHAR(50)",
        ]
        warehouses = ["ANALYTICS_WH", "ETL_WH", "REPORTING_WH", "DATA_ENG_WH"]

        assets = []
        for i in range(asset_count):
            db = rng.choice(databases)
            schema = rng.choice(schemas[db])
            table = rng.choice(table_names)
            qualified = f"{db}.{schema}.{table}"

            cols = []
            num_cols = rng.randint(5, 25)
            for c in range(num_cols):
                cols.append({
                    "name": f"col_{c}" if c > 3 else ["id", "created_at", "updated_at", "is_active"][c],
                    "type": rng.choice(column_types),
                    "nullable": rng.choice([True, False]),
                })

            assets.append({
                "qualified_name": qualified,
                "database": db,
                "schema": schema,
                "table": table,
                "asset_type": rng.choice(["TABLE", "VIEW", "MATERIALIZED_VIEW", "EXTERNAL_TABLE"]),
                "row_count": rng.randint(1_000, 50_000_000),
                "size_bytes": rng.randint(1_000_000, 100_000_000_000),
                "clustering_keys": [cols[0]["name"]] if rng.random() > 0.5 else [],
                "warehouse": rng.choice(warehouses),
                "columns": cols[:8],  # Truncate for sample
                "last_altered": f"2026-02-{rng.randint(1, 26):02d}T{rng.randint(0, 23):02d}:00:00Z",
            })
        return assets
