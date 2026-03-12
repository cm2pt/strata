"""Connector depth models — sync logs, field provenance, extraction capabilities."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class SyncStatus(str, PyEnum):
    success = "success"
    partial = "partial"
    failed = "failed"


class AutomationLevel(str, PyEnum):
    fully_automated = "fully_automated"
    semi_automated = "semi_automated"
    manual = "manual"


class ConnectorSyncLog(Base, UUIDMixin):
    """Per-sync audit trail — one row per connector sync execution."""

    __tablename__ = "connector_sync_logs"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sync_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sync_ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[SyncStatus] = mapped_column(
        Enum(SyncStatus, name="sync_status", create_constraint=True, create_type=False), default=SyncStatus.success
    )
    objects_discovered: Mapped[int] = mapped_column(Integer, default=0)
    objects_updated: Mapped[int] = mapped_column(Integer, default=0)
    objects_deleted: Mapped[int] = mapped_column(Integer, default=0)
    usage_events_fetched: Mapped[int] = mapped_column(Integer, default=0)
    cost_events_fetched: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    diff_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )

    @property
    def duration_seconds(self) -> float:
        if self.sync_started_at and self.sync_ended_at:
            return (self.sync_ended_at - self.sync_started_at).total_seconds()
        return 0.0


class FieldProvenance(Base, UUIDMixin):
    """Field-level source tracking — maps each product metric to its source connector."""

    __tablename__ = "field_provenances"
    __table_args__ = (UniqueConstraint("data_product_id", "field_name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_connector_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="SET NULL"), nullable=True
    )
    source_platform: Mapped[str] = mapped_column(String(50), nullable=False)
    extraction_method: Mapped[str] = mapped_column(String(255), nullable=False)
    automation_level: Mapped[AutomationLevel] = mapped_column(
        Enum(AutomationLevel, name="automation_level", create_constraint=True, create_type=False), nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    last_observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    observation_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class ConnectorExtractionMeta(Base, UUIDMixin):
    """What each connector *can* extract — extraction capability matrix."""

    __tablename__ = "connector_extraction_meta"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connector_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_category: Mapped[str] = mapped_column(String(100), nullable=False)
    capability_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_elevated_access: Mapped[bool] = mapped_column(Boolean, default=False)
    extraction_method: Mapped[str] = mapped_column(String(255), nullable=False)
    refresh_frequency: Mapped[str] = mapped_column(String(50), default="per-sync")
    sample_output: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
