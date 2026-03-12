import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class DecisionType(str, PyEnum):
    retirement = "retirement"
    cost_investigation = "cost_investigation"
    value_revalidation = "value_revalidation"
    low_roi_review = "low_roi_review"
    capital_reallocation = "capital_reallocation"
    pricing_activation = "pricing_activation"
    ai_project_review = "ai_project_review"
    portfolio_change = "portfolio_change"  # candidate promoted to product


class DecisionStatus(str, PyEnum):
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    delayed = "delayed"


class Decision(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "decisions"
    __table_args__: tuple = ()

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[DecisionType] = mapped_column(Enum(DecisionType, name="decision_type", create_constraint=True), nullable=False)
    status: Mapped[DecisionStatus] = mapped_column(
        Enum(DecisionStatus, name="decision_status", create_constraint=True), default=DecisionStatus.under_review
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    initiated_by: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_to: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_to_title: Mapped[str | None] = mapped_column(String(255))
    estimated_impact: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    actual_impact: Mapped[float | None] = mapped_column(Numeric(12, 2))
    impact_basis: Mapped[str | None] = mapped_column(Text)
    resolution: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- Capital Impact fields ---
    capital_freed: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    projected_savings_monthly: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    projected_savings_annual: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    delay_reason: Mapped[str | None] = mapped_column(Text)
    delayed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- Soft delete ---
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    # --- Idempotency ---
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, default=None)

    # --- Impact Verification fields ---
    impact_validation_status: Mapped[str | None] = mapped_column(
        String(50), default="pending"
    )  # pending | validating | confirmed | underperforming
    validation_start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    validation_window_days: Mapped[int] = mapped_column(Integer, default=60)
    actual_savings_measured: Mapped[float | None] = mapped_column(Numeric(12, 2))
    variance_from_projection: Mapped[float | None] = mapped_column(Numeric(8, 4))  # ratio 0-N
    impact_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2))  # 0-100


class DecisionComment(Base, UUIDMixin):
    """Threaded comments on decisions."""
    __tablename__ = "decision_comments"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class DecisionAction(Base, UUIDMixin):
    """Audit trail for every action taken on a decision."""
    __tablename__ = "decision_actions"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # created, approved, rejected, delayed, commented
    payload: Mapped[dict | None] = mapped_column(type_=Text)  # JSON string for extra context
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class DecisionEconomicEffect(Base, UUIDMixin):
    """Tracked economic effects of a decision."""
    __tablename__ = "decision_economic_effects"
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_decision_economic_effects_confidence_pct"),
    )

    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    effect_type: Mapped[str] = mapped_column(String(50), nullable=False)  # capital_freed, cost_saved, revenue_gained
    amount_usd_monthly: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_usd_annual: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), default=0.8)  # 0-1
    calc_explainer: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
