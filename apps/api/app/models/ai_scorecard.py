import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class AIProjectRiskLevel(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AIProjectScorecard(Base, UUIDMixin, TimestampMixin):
    """AI project risk assessment scorecard for kill-switch decisions."""
    __tablename__ = "ai_project_scorecards"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # --- Scorecard dimensions (all 0-100) ---
    cost_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    value_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    roi_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    dependency_risk_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    # --- Computed ---
    composite_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    risk_level: Mapped[AIProjectRiskLevel] = mapped_column(
        Enum(AIProjectRiskLevel, name="ai_project_risk_level", create_constraint=True), nullable=False
    )
    monthly_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    monthly_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    roi: Mapped[float | None] = mapped_column(Numeric(8, 4))

    # --- Kill-switch state ---
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    decision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
