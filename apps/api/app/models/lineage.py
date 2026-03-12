"""Lineage graph models — nodes and edges for end-to-end data lineage tracking."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LineageNodeType(str, PyEnum):
    source_system = "source_system"
    database = "database"
    schema = "schema"
    table = "table"
    view = "view"
    column = "column"
    etl_job = "etl_job"
    dbt_model = "dbt_model"
    notebook = "notebook"
    dataset = "dataset"
    data_product = "data_product"
    dashboard = "dashboard"
    report = "report"
    metric = "metric"
    ml_model = "ml_model"
    api_endpoint = "api_endpoint"
    application = "application"


class LineageEdgeType(str, PyEnum):
    physical_lineage = "physical_lineage"
    logical_lineage = "logical_lineage"
    transformation = "transformation"
    aggregation = "aggregation"
    derivation = "derivation"
    exposure = "exposure"
    consumption = "consumption"
    copy = "copy"
    dependency = "dependency"


class LineageProvenance(str, PyEnum):
    automated = "automated"
    inferred = "inferred"
    manual = "manual"


# ---------------------------------------------------------------------------
# LineageNode — canonical node in the lineage graph
# ---------------------------------------------------------------------------

class LineageNode(Base, UUIDMixin):
    """A node in the lineage graph: table, view, dashboard, ETL job, etc."""

    __tablename__ = "lineage_nodes"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    node_type: Mapped[LineageNodeType] = mapped_column(
        Enum(LineageNodeType, name="lineage_node_type", create_constraint=True, create_type=False),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    qualified_name: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    domain: Mapped[str | None] = mapped_column(String(255))
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
    )
    tags: Mapped[dict] = mapped_column(JSON, default=list, server_default="[]")

    # Provenance tracking
    provenance: Mapped[LineageProvenance] = mapped_column(
        Enum(LineageProvenance, name="lineage_provenance", create_constraint=True, create_type=False),
        default=LineageProvenance.automated,
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0)

    # Links to existing entities (nullable — only set when the node maps to a known entity)
    data_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="SET NULL"),
    )
    source_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="SET NULL"),
    )

    # Rich metadata (schema-less JSON for platform-specific details)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")

    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# LineageEdge — directed edge between two lineage nodes
# ---------------------------------------------------------------------------

class LineageEdge(Base, UUIDMixin):
    """A directed edge in the lineage graph."""

    __tablename__ = "lineage_edges"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lineage_nodes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lineage_nodes.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    edge_type: Mapped[LineageEdgeType] = mapped_column(
        Enum(LineageEdgeType, name="lineage_edge_type", create_constraint=True, create_type=False),
        nullable=False, index=True,
    )
    platform: Mapped[str | None] = mapped_column(String(100))

    # Provenance tracking
    provenance: Mapped[LineageProvenance] = mapped_column(
        Enum(LineageProvenance, name="lineage_provenance", create_constraint=True, create_type=False),
        default=LineageProvenance.automated,
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0)

    # Rich metadata
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc),
    )
