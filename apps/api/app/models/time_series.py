import uuid
from datetime import date, datetime, timezone

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class CostMonthly(Base, UUIDMixin):
    """Monthly cost aggregation per data product. Append-only by month."""
    __tablename__ = "cost_monthly"
    __table_args__ = (UniqueConstraint("data_product_id", "month"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    compute: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    storage: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    pipeline: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    human_estimate: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    coverage_pct: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class UsageMonthly(Base, UUIDMixin):
    """Monthly usage aggregation per data product."""
    __tablename__ = "usage_monthly"
    __table_args__ = (UniqueConstraint("data_product_id", "month"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    consumers: Mapped[int] = mapped_column(Integer, default=0)
    queries: Mapped[int] = mapped_column(Integer, default=0)
    bytes_scanned: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class ROIMonthly(Base, UUIDMixin):
    """Monthly ROI per data product. NEVER overwrite — always append."""
    __tablename__ = "roi_monthly"
    __table_args__ = (UniqueConstraint("data_product_id", "month"),)

    data_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    roi: Mapped[float | None] = mapped_column(Numeric(8, 4))
    cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    composite_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class PortfolioMonthly(Base, UUIDMixin):
    """Portfolio-level monthly snapshots per org."""
    __tablename__ = "portfolio_monthly"
    __table_args__ = (UniqueConstraint("org_id", "month"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    total_products: Mapped[int] = mapped_column(Integer, nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    total_value: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    average_roi: Mapped[float | None] = mapped_column(Numeric(8, 4))
    total_consumers: Mapped[int] = mapped_column(Integer, default=0)

    # --- Capital Impact ---
    capital_freed_cumulative: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    budget_reallocated: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    active_pricing_policies: Mapped[int] = mapped_column(Integer, default=0)
    decisions_executed: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
