import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class EdgeType(str, PyEnum):
    lineage = "lineage"           # dbt model → warehouse table
    consumption = "consumption"   # Power BI dataset reads warehouse table
    copy = "copy"                 # S3 object copied to warehouse stage
    derivation = "derivation"     # warehouse view reads from base table
    exposure = "exposure"         # dbt exposure declares a product boundary


class Edge(Base, UUIDMixin):
    """Directed edge between two source assets capturing lineage / relationship."""
    __tablename__ = "edges"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    from_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    to_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    edge_type: Mapped[EdgeType] = mapped_column(
        Enum(EdgeType, name="edge_type", create_constraint=True), nullable=False,
    )
    evidence_source: Mapped[str | None] = mapped_column(String(100))  # e.g. "dbt_manifest", "snowflake_query_log"
    confidence: Mapped[float] = mapped_column(Numeric(5, 4), default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
