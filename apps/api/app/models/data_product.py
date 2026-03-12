import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class LifecycleStage(str, PyEnum):
    draft = "draft"
    active = "active"
    growth = "growth"
    mature = "mature"
    decline = "decline"
    retired = "retired"


class PlatformType(str, PyEnum):
    snowflake = "snowflake"
    databricks = "databricks"
    s3 = "s3"
    power_bi = "power_bi"


class ROIBand(str, PyEnum):
    high = "high"
    healthy = "healthy"
    underperforming = "underperforming"
    critical = "critical"


class DataProduct(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "data_products"
    __table_args__ = (
        CheckConstraint("monthly_cost >= 0", name="ck_data_products_cost_positive"),
        CheckConstraint("roi >= 0", name="ck_data_products_roi_positive"),
        CheckConstraint("declared_value >= 0", name="ck_data_products_declared_value_positive"),
        CheckConstraint("usage_implied_value >= 0", name="ck_data_products_usage_implied_value_positive"),
        CheckConstraint("composite_value >= 0", name="ck_data_products_composite_value_positive"),
        CheckConstraint("capital_freed_monthly >= 0", name="ck_data_products_capital_freed_positive"),
        CheckConstraint("completeness >= 0 AND completeness <= 1", name="ck_data_products_completeness_pct"),
        CheckConstraint("accuracy >= 0 AND accuracy <= 1", name="ck_data_products_accuracy_pct"),
        CheckConstraint("trust_score >= 0 AND trust_score <= 1", name="ck_data_products_trust_score_pct"),
        CheckConstraint("cost_coverage >= 0 AND cost_coverage <= 1", name="ck_data_products_cost_coverage_pct"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    business_unit: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[PlatformType] = mapped_column(Enum(PlatformType, name="platform_type", create_constraint=True), nullable=False)
    lifecycle_stage: Mapped[LifecycleStage] = mapped_column(
        Enum(LifecycleStage, name="lifecycle_stage", create_constraint=True), nullable=False, default=LifecycleStage.draft
    )

    # --- Economics ---
    monthly_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    declared_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    usage_implied_value: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    composite_value: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    roi: Mapped[float | None] = mapped_column(Numeric(8, 4))
    roi_band: Mapped[ROIBand | None] = mapped_column(Enum(ROIBand, name="roi_band", create_constraint=True))
    cost_trend: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    cost_coverage: Mapped[float] = mapped_column(Numeric(4, 3), default=0)

    # --- Usage ---
    monthly_consumers: Mapped[int] = mapped_column(Integer, default=0)
    total_queries: Mapped[int] = mapped_column(Integer, default=0)
    usage_trend: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    peak_consumers: Mapped[int] = mapped_column(Integer, default=0)

    # --- Quality ---
    freshness_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    freshness_sla: Mapped[float] = mapped_column(Numeric(8, 2), default=24)
    completeness: Mapped[float] = mapped_column(Numeric(5, 4), default=0)
    accuracy: Mapped[float] = mapped_column(Numeric(5, 4), default=0)
    trust_score: Mapped[float] = mapped_column(Numeric(5, 4), default=0)

    # --- Marketplace ---
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_certified: Mapped[bool] = mapped_column(Boolean, default=False)
    subscription_count: Mapped[int] = mapped_column(Integer, default=0)

    # --- Dependencies (denormalized counts) ---
    downstream_products: Mapped[int] = mapped_column(Integer, default=0)
    downstream_models: Mapped[int] = mapped_column(Integer, default=0)
    downstream_dashboards: Mapped[int] = mapped_column(Integer, default=0)

    # --- Flags ---
    is_retirement_candidate: Mapped[bool] = mapped_column(Boolean, default=False)
    has_cost_spike: Mapped[bool] = mapped_column(Boolean, default=False)
    has_usage_decline: Mapped[bool] = mapped_column(Boolean, default=False)

    # --- Capital Impact ---
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    capital_freed_monthly: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # --- Relationships ---
    cost_breakdown: Mapped["CostBreakdown | None"] = relationship(back_populates="data_product", uselist=False, cascade="all, delete-orphan")
    consumer_teams: Mapped[list["ConsumerTeam"]] = relationship(back_populates="data_product", cascade="all, delete-orphan")
    tags: Mapped[list["DataProductTag"]] = relationship(back_populates="data_product", cascade="all, delete-orphan")
    dependencies: Mapped[list["DataProductDependency"]] = relationship(back_populates="data_product", cascade="all, delete-orphan")
    value_declaration: Mapped["ValueDeclaration | None"] = relationship(back_populates="data_product", uselist=False, cascade="all, delete-orphan")
    owner: Mapped["User"] = relationship(lazy="joined")


# Forward ref resolved by SQLAlchemy string annotation — no circular import needed
from app.models.user import User  # noqa: E402, F811


class CostBreakdown(Base, UUIDMixin):
    __tablename__ = "cost_breakdowns"
    __table_args__ = (
        CheckConstraint("compute >= 0", name="ck_cost_breakdowns_compute_positive"),
        CheckConstraint("storage >= 0", name="ck_cost_breakdowns_storage_positive"),
        CheckConstraint("pipeline >= 0", name="ck_cost_breakdowns_pipeline_positive"),
        CheckConstraint("human_estimate >= 0", name="ck_cost_breakdowns_human_estimate_positive"),
    )

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    compute: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    storage: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    pipeline: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    human_estimate: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )

    data_product: Mapped["DataProduct"] = relationship(back_populates="cost_breakdown")


class ConsumerTeam(Base, UUIDMixin):
    __tablename__ = "consumer_teams"
    __table_args__ = (UniqueConstraint("data_product_id", "team_name"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"))
    consumers: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0)

    data_product: Mapped["DataProduct"] = relationship(back_populates="consumer_teams")


class DataProductTag(Base, UUIDMixin):
    __tablename__ = "data_product_tags"
    __table_args__ = (UniqueConstraint("data_product_id", "tag"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False
    )
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    data_product: Mapped["DataProduct"] = relationship(back_populates="tags")


class DependencyType(str, PyEnum):
    data_product = "data_product"
    model = "model"
    dashboard = "dashboard"


class DataProductDependency(Base, UUIDMixin):
    __tablename__ = "data_product_dependencies"

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dependency_type: Mapped[DependencyType] = mapped_column(
        Enum(DependencyType, name="dependency_type", create_constraint=True), nullable=False
    )
    dependency_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dependency_ref: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    data_product: Mapped["DataProduct"] = relationship(back_populates="dependencies")
