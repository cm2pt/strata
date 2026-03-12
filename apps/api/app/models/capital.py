import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class CapitalEventType(str, PyEnum):
    retirement_freed = "retirement_freed"
    cost_optimization = "cost_optimization"
    reallocation = "reallocation"
    pricing_revenue = "pricing_revenue"
    ai_spend_reduced = "ai_spend_reduced"


class CapitalEvent(Base, UUIDMixin):
    """Append-only ledger of every capital impact event across all workflows."""
    __tablename__ = "capital_events"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_capital_events_amount_positive"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="SET NULL")
    )
    event_type: Mapped[CapitalEventType] = mapped_column(
        Enum(CapitalEventType, name="capital_event_type", create_constraint=True), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
