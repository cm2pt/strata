"""BigQuery extractor — generates GCP BigQuery-realistic metadata and capabilities."""

from typing import Any

from .base_extractor import BaseExtractor
from . import register_extractor


@register_extractor("bigquery")
class BigQueryExtractor(BaseExtractor):

    @property
    def platform(self) -> str:
        return "bigquery"

    def _cost_method(self) -> str:
        return "Cloud Billing Export to BigQuery (on-demand bytes pricing)"

    def _usage_method(self) -> str:
        return "INFORMATION_SCHEMA.JOBS (query job history)"

    def _quality_method(self) -> str:
        return "BigQuery Data Quality Tasks API"

    def generate_capabilities(self) -> list[dict[str, Any]]:
        return [
            {
                "capability_category": "schema_metadata",
                "capability_name": "Dataset/table/column hierarchy with partitioning and clustering",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "INFORMATION_SCHEMA.COLUMNS + INFORMATION_SCHEMA.TABLES",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "query_history",
                "capability_name": "Job history with bytes processed, slot usage, and referenced tables",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "INFORMATION_SCHEMA.JOBS_BY_PROJECT",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "cost_attribution",
                "capability_name": "On-demand/slot cost breakdown with per-dataset attribution",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "Cloud Billing Export + INFORMATION_SCHEMA.JOBS",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "access_control",
                "capability_name": "IAM roles, dataset ACLs, and authorized views",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "IAM Policy API + Dataset.access",
                "refresh_frequency": "per-sync",
            },
            {
                "capability_category": "data_lineage",
                "capability_name": "Table and column lineage from Data Lineage API",
                "is_available": True,
                "requires_elevated_access": True,
                "extraction_method": "Data Lineage API (datacatalog.googleapis.com)",
                "refresh_frequency": "daily",
            },
            {
                "capability_category": "storage_metrics",
                "capability_name": "Active/long-term storage, streaming buffer, and table expiration",
                "is_available": True,
                "requires_elevated_access": False,
                "extraction_method": "INFORMATION_SCHEMA.TABLE_STORAGE + INFORMATION_SCHEMA.TABLE_OPTIONS",
                "refresh_frequency": "per-sync",
            },
        ]

    def generate_schema_metadata(self, asset_count: int = 10) -> list[dict[str, Any]]:
        rng = self._get_rng("bigquery-schema")
        project = "apex-analytics"
        datasets = ["finance", "marketing", "operations", "data_engineering", "ml_platform"]
        table_names = [
            "revenue_daily", "customer_segments", "campaign_performance",
            "cost_allocation", "order_events", "product_inventory",
            "user_activity_log", "demand_forecast", "churn_predictions",
            "supply_chain_metrics", "hr_headcount", "compliance_audit",
            "clickstream_raw", "feature_store", "experiment_results",
        ]
        column_types = [
            "STRING", "INT64", "FLOAT64", "TIMESTAMP", "BOOL",
            "DATE", "NUMERIC", "BYTES", "GEOGRAPHY", "JSON",
            "ARRAY<STRING>", "STRUCT<name STRING, value FLOAT64>",
        ]
        partition_types = ["_PARTITIONTIME", "DATE", "TIMESTAMP", "INTEGER_RANGE"]

        assets = []
        for i in range(asset_count):
            dataset = rng.choice(datasets)
            table = rng.choice(table_names)
            qualified = f"{project}.{dataset}.{table}"

            cols = []
            num_cols = rng.randint(5, 20)
            for c in range(num_cols):
                cols.append({
                    "name": f"col_{c}" if c > 3 else ["id", "event_timestamp", "created_date", "is_active"][c],
                    "type": rng.choice(column_types[:8]),
                    "mode": rng.choice(["NULLABLE", "REQUIRED", "REPEATED"]),
                })

            clustering_cols = []
            if rng.random() > 0.5:
                clustering_cols = rng.sample(
                    ["event_timestamp", "region", "customer_id", "product_id"],
                    k=rng.randint(1, 3),
                )

            partition_col = None
            partition_type = None
            if rng.random() > 0.3:
                partition_type = rng.choice(partition_types[:2])
                partition_col = "event_timestamp" if partition_type == "_PARTITIONTIME" else "created_date"

            assets.append({
                "qualified_name": qualified,
                "project": project,
                "dataset": dataset,
                "table": table,
                "asset_type": rng.choice(["TABLE", "VIEW", "MATERIALIZED_VIEW", "EXTERNAL"]),
                "row_count": rng.randint(10_000, 200_000_000),
                "size_bytes": rng.randint(10_000_000, 1_000_000_000_000),
                "partition_column": partition_col,
                "partition_type": partition_type,
                "clustering_columns": clustering_cols,
                "expiration_ms": rng.choice([None, None, None, 7_776_000_000]),  # 90 days or None
                "columns": cols[:8],
                "last_modified": f"2026-02-{rng.randint(1, 26):02d}T{rng.randint(0, 23):02d}:00:00Z",
            })
        return assets
