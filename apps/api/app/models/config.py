import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


# --- Policy Configuration ---

class PolicyCategory(str, PyEnum):
    valuation = "valuation"
    lifecycle = "lifecycle"
    cost = "cost"
    governance = "governance"
    pricing = "pricing"


class PolicyConfig(Base, UUIDMixin):
    __tablename__ = "policy_configs"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[PolicyCategory] = mapped_column(
        Enum(PolicyCategory, name="policy_category", create_constraint=True), nullable=False
    )
    current_value: Mapped[str] = mapped_column(String(255), nullable=False)
    default_value: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    updated_by: Mapped[str | None] = mapped_column(String(255))


# --- Notifications ---

class NotificationType(str, PyEnum):
    cost_spike = "cost_spike"
    usage_drop = "usage_drop"
    value_expiring = "value_expiring"
    lifecycle_change = "lifecycle_change"
    retirement_candidate = "retirement_candidate"
    capital_freed = "capital_freed"
    pricing_activated = "pricing_activated"
    ai_project_flagged = "ai_project_flagged"


class Notification(Base, UUIDMixin):
    __tablename__ = "notifications"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", create_constraint=True), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="SET NULL"))
    product_name: Mapped[str | None] = mapped_column(String(255))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


# --- Benchmarks ---

class BenchmarkIndustry(str, PyEnum):
    retail = "retail"
    finance = "finance"
    saas = "saas"
    healthcare = "healthcare"


class BenchmarkData(Base, UUIDMixin):
    __tablename__ = "benchmark_data"

    industry: Mapped[BenchmarkIndustry] = mapped_column(
        Enum(BenchmarkIndustry, name="benchmark_industry", create_constraint=True), nullable=False, unique=True
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    median_roi: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    median_cost_per_consumer: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    median_portfolio_roi: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    p25_roi: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    p75_roi: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


# --- Marketplace Subscriptions ---

class MarketplaceSubscription(Base, UUIDMixin):
    __tablename__ = "marketplace_subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
