import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class ValueMethod(str, PyEnum):
    revenue_attribution = "revenue_attribution"
    cost_avoidance = "cost_avoidance"
    efficiency_gain = "efficiency_gain"
    compliance = "compliance"
    strategic = "strategic"


class ValueDeclaration(Base, UUIDMixin):
    __tablename__ = "value_declarations"

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    declared_by: Mapped[str] = mapped_column(String(255), nullable=False)
    declared_by_title: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[ValueMethod] = mapped_column(Enum(ValueMethod, name="value_method", create_constraint=True), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    basis: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, server_default="{}")
    declared_at: Mapped[date] = mapped_column(Date, nullable=False)
    next_review: Mapped[date] = mapped_column(Date, nullable=False)
    is_expiring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )

    data_product: Mapped["DataProduct"] = relationship(back_populates="value_declaration")


# Import here to avoid circular
from app.models.data_product import DataProduct  # noqa: E402, F811


class ValueDeclarationVersion(Base, UUIDMixin):
    __tablename__ = "value_declaration_versions"
    __table_args__ = (UniqueConstraint("data_product_id", "version"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    declared_by: Mapped[str] = mapped_column(String(255), nullable=False)
    declared_by_title: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[ValueMethod] = mapped_column(Enum(ValueMethod, name="value_method", create_constraint=True), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    basis: Mapped[str] = mapped_column(Text, nullable=False)
    declared_at: Mapped[date] = mapped_column(Date, nullable=False)
    change_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
