"""Databricks extractor — generates Unity Catalog-realistic metadata and capabilities."""

from typing import Any

from .base_extractor import BaseExtractor
from . import register_extractor


@register_extractor("databricks")
class DatabricksExtractor(BaseExtractor):

    @property
    def platform(self) -> str:
        return "databricks"

    def _cost_method(self) -> str:
        return "system.billing.usage (DBU consumption)"

    def _usage_method(self) -> str:
        return "system.query.history (SQL Warehouse query log)"

    def _quality_method(self) -> str:
        return "Unity Catalog data quality expectations"

    def generate_capabilities(self) -> list[dict[str, Any]]:
        return [
            {
                "capability_category": "schema_metadata",
                "capability_name": "Unity Catalog tables, columns, and Delta properties",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "Unity Catalog INFORMATION_SCHEMA + DESCRIBE EXTENDED",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "query_history",
                "capability_name": "SQL Warehouse and notebook query history",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "system.query.history",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "cost_attribution",
                "capability_name": "DBU consumption by workspace and cluster type",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "system.billing.usage",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "access_control",
                "capability_name": "Unity Catalog grants and securable hierarchy",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "Unity Catalog grants API (SHOW GRANTS ON ...)",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "data_lineage",
                "capability_name": "Table and column-level lineage via system tables",
                "is_available": True,
                "requires_elevated_access": True,
                "extraction_method": "system.access.table_lineage + column_lineage",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "cluster_metrics",
                "capability_name": "Cluster utilization, autoscaling events, and Spark metrics",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "Clusters API 2.0 + Spark metrics endpoint",
                "refresh_frequency": "per-sync",
            },
        ]

    def generate_schema_metadata(self, asset_count: int = 10) -> list[dict[str, Any]]:
        rng = self._get_rng("databricks-schema")
        catalogs = ["main", "hive_metastore"]
        schemas_map = {
            "main": ["gold", "silver", "bronze", "ml_features", "reporting"],
            "hive_metastore": ["bronze", "raw_staging", "legacy", "etl_scratch"],
        }
        table_names = [
            "dim_customer", "fact_revenue_daily", "raw_events", "stg_transactions",
            "ml_churn_scores", "agg_campaign_metrics", "dim_product_catalog",
            "fact_order_items", "raw_clickstream", "gold_customer_360",
            "silver_inventory", "bronze_iot_telemetry", "ml_demand_forecast",
        ]
        delta_properties = {
            "delta.minReaderVersion": "2",
            "delta.minWriterVersion": "5",
            "delta.autoOptimize.autoCompact": "true",
            "delta.autoOptimize.optimizeWrite": "true",
        }
        column_types = [
            "STRING", "BIGINT", "DOUBLE", "TIMESTAMP", "BOOLEAN",
            "DATE", "INT", "DECIMAL(18,6)", "ARRAY<STRING>", "MAP<STRING,STRING>",
        ]
        cluster_types = ["Jobs Compute", "SQL Warehouse", "All-Purpose", "SQL Serverless"]

        assets = []
        for i in range(asset_count):
            catalog = rng.choice(catalogs)
            schema = rng.choice(schemas_map[catalog])
            table = rng.choice(table_names)
            qualified = f"{catalog}.{schema}.{table}"

            cols = []
            num_cols = rng.randint(6, 30)
            for c in range(num_cols):
                cols.append({
                    "name": f"col_{c}" if c > 3 else ["id", "event_timestamp", "updated_at", "is_deleted"][c],
                    "type": rng.choice(column_types),
                    "nullable": rng.choice([True, False]),
                })

            partition_cols = []
            if rng.random() > 0.4:
                partition_cols = [rng.choice(["event_date", "region", "year_month"])]

            assets.append({
                "qualified_name": qualified,
                "catalog": catalog,
                "schema": schema,
                "table": table,
                "asset_type": rng.choice(["MANAGED", "EXTERNAL", "VIEW"]),
                "format": "DELTA" if rng.random() > 0.1 else "PARQUET",
                "row_count": rng.randint(5_000, 100_000_000),
                "size_bytes": rng.randint(5_000_000, 500_000_000_000),
                "partition_columns": partition_cols,
                "delta_properties": delta_properties if rng.random() > 0.3 else {},
                "cluster_type": rng.choice(cluster_types),
                "columns": cols[:8],
                "last_modified": f"2026-02-{rng.randint(1, 26):02d}T{rng.randint(0, 23):02d}:00:00Z",
            })
        return assets
