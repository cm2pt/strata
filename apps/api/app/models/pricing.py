import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class PricingPolicyStatus(str, PyEnum):
    draft = "draft"
    active = "active"
    retired = "retired"


class PricingPolicy(Base, UUIDMixin, TimestampMixin):
    """Versioned pricing policies activated on data products."""
    __tablename__ = "pricing_policies"
    __table_args__ = (
        UniqueConstraint("product_id", "version"),
        CheckConstraint("projected_revenue >= 0", name="ck_pricing_policies_projected_revenue_positive"),
        CheckConstraint("actual_revenue >= 0", name="ck_pricing_policies_actual_revenue_positive"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    model: Mapped[str] = mapped_column(String(50), nullable=False)  # cost_plus | usage_based | tiered | flat | value_share
    params: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string of pricing parameters
    status: Mapped[PricingPolicyStatus] = mapped_column(
        Enum(PricingPolicyStatus, name="pricing_policy_status", create_constraint=True),
        default=PricingPolicyStatus.draft,
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activated_by: Mapped[str | None] = mapped_column(String(255))
    decision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="SET NULL")
    )
    projected_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    actual_revenue: Mapped[float | None] = mapped_column(Numeric(12, 2))
    pre_activation_usage: Mapped[int] = mapped_column(Integer, default=0)
    post_activation_usage: Mapped[int | None] = mapped_column(Integer)


class PricingUsageDelta(Base, UUIDMixin):
    """Track usage changes after pricing policy activation."""
    __tablename__ = "pricing_usage_deltas"

    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pricing_policies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    consumers: Mapped[int] = mapped_column(Integer, default=0)
    queries: Mapped[int] = mapped_column(Integer, default=0)
    revenue_collected: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
