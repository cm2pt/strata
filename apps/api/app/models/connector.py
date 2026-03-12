import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class ConnectorType(str, PyEnum):
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
    # Special types for demo
    mock = "mock"
    replay = "replay"
    discovery_replay = "discovery_replay"


class ConnectorStatus(str, PyEnum):
    connected = "connected"
    syncing = "syncing"
    error = "error"
    disconnected = "disconnected"


class RunStatus(str, PyEnum):
    running = "running"
    completed = "completed"
    failed = "failed"


class ConnectorConfig(Base, UUIDMixin):
    __tablename__ = "connector_configs"

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    connector_type: Mapped[ConnectorType] = mapped_column(Enum(ConnectorType, name="connector_type", create_constraint=True), nullable=False)
    credentials: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    status: Mapped[ConnectorStatus] = mapped_column(
        Enum(ConnectorStatus, name="connector_status", create_constraint=True), default=ConnectorStatus.disconnected
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    products_found: Mapped[int] = mapped_column(Integer, default=0)
    cost_coverage: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    usage_coverage: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    config_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class ConnectorRun(Base, UUIDMixin):
    __tablename__ = "connector_runs"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[RunStatus] = mapped_column(Enum(RunStatus, name="run_status", create_constraint=True), default=RunStatus.running)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    records_found: Mapped[int] = mapped_column(Integer, default=0)
    usage_events_found: Mapped[int] = mapped_column(Integer, default=0)
    cost_events_found: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[dict] = mapped_column(JSON, default=list, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class SourceAsset(Base, UUIDMixin):
    __tablename__ = "source_assets"
    __table_args__ = (UniqueConstraint("connector_id", "external_id"),)

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True,
    )
    external_id: Mapped[str] = mapped_column(String(512), nullable=False)
    asset_name: Mapped[str] = mapped_column(String(512), nullable=False)
    asset_type: Mapped[str | None] = mapped_column(String(100))
    platform: Mapped[str | None] = mapped_column(String(50))           # snowflake, databricks, dbt, powerbi, s3
    qualified_name: Mapped[str | None] = mapped_column(String(1024))   # db.schema.table or project.dataset.model
    display_name: Mapped[str | None] = mapped_column(String(512))
    owner_hint: Mapped[str | None] = mapped_column(String(255))        # discovered owner/contact
    tags_json: Mapped[dict] = mapped_column(JSON, default=list, server_default="[]")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class AssetMapping(Base, UUIDMixin):
    __tablename__ = "asset_mappings"
    __table_args__ = (UniqueConstraint("source_asset_id", "data_product_id"),)

    source_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="CASCADE"), nullable=False
    )
    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False
    )
    mapping_type: Mapped[str] = mapped_column(String(50), default="primary")
    mapping_role: Mapped[str | None] = mapped_column(String(50))  # primary, derived, consumption
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class UsageEvent(Base, UUIDMixin):
    __tablename__ = "usage_events"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="SET NULL")
    )
    user_identifier: Mapped[str | None] = mapped_column(String(255))
    team_identifier: Mapped[str | None] = mapped_column(String(255))
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    bytes_scanned: Mapped[int] = mapped_column(BigInteger, default=0)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class CostEvent(Base, UUIDMixin):
    __tablename__ = "cost_events"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="SET NULL")
    )
    cost_type: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
