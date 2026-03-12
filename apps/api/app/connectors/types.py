"""Connector canonical types — shared across all connector implementations."""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum as PyEnum
from typing import Any


class ConnectorTypeEnum(str, PyEnum):
    """20 real platforms + 2 demo"""
    snowflake = "snowflake"
    databricks = "databricks"
    bigquery = "bigquery"
    redshift = "redshift"
    fabric = "fabric"
    adls = "adls"
    s3 = "s3"
    gcs = "gcs"
    iceberg = "iceberg"
    delta_lake = "delta_lake"
    trino = "trino"
    presto = "presto"
    athena = "athena"
    dremio = "dremio"
    postgresql = "postgresql"
    sql_server = "sql_server"
    mysql = "mysql"
    oracle = "oracle"
    mongodb = "mongodb"
    power_bi = "power_bi"
    mock = "mock"
    replay = "replay"
    discovery_replay = "discovery_replay"


@dataclass
class ConnectionTestResult:
    success: bool
    message: str
    latency_ms: float = 0
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class SourceAsset:
    """A discoverable asset from a connected platform."""
    external_id: str
    asset_name: str
    asset_type: str  # table, view, model, dashboard, etc.
    schema_name: str | None = None
    database_name: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    row_count: int | None = None
    size_bytes: int | None = None
    last_modified: datetime | None = None
    # Discovery enrichment fields
    platform: str | None = None         # snowflake, databricks, dbt, powerbi, s3
    qualified_name: str | None = None   # fully qualified name e.g. db.schema.table
    display_name: str | None = None
    owner_hint: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class EdgeRecord:
    """A directed relationship between two source assets."""
    from_external_id: str
    to_external_id: str
    edge_type: str      # lineage, consumption, copy, derivation, exposure
    evidence_source: str | None = None
    confidence: float = 1.0


@dataclass
class UsageEvent:
    """A single usage event from a platform."""
    source_asset_external_id: str
    user_identifier: str
    event_at: datetime
    query_text: str | None = None
    bytes_scanned: int = 0
    duration_ms: int = 0
    team_identifier: str | None = None


@dataclass
class CostEvent:
    """A cost data point from a platform."""
    source_asset_external_id: str
    cost_type: str  # compute, storage, pipeline
    amount: float
    period_start: datetime
    period_end: datetime
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CoverageReport:
    """Reports on connector coverage metrics."""
    total_assets_discovered: int
    assets_mapped: int
    usage_events_count: int
    cost_events_count: int
    cost_coverage_pct: float  # 0-1
    usage_coverage_pct: float  # 0-1
    unmapped_assets: list[str] = field(default_factory=list)
