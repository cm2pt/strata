import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class CandidateType(str, PyEnum):
    semantic_product = "semantic_product"  # Power BI dataset → report bundle
    dbt_product = "dbt_product"           # dbt exposure = declared product
    usage_bundle = "usage_bundle"         # co-usage clustering from query logs
    certified_asset = "certified_asset"   # certified / tagged asset in catalog


class CandidateStatus(str, PyEnum):
    new = "new"
    under_review = "under_review"
    promoted = "promoted"
    ignored = "ignored"


class ProductCandidate(Base, UUIDMixin, TimestampMixin):
    """A suggested data product bundle generated from evidence streams."""
    __tablename__ = "product_candidates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    candidate_type: Mapped[CandidateType] = mapped_column(
        Enum(CandidateType, name="candidate_type", create_constraint=True), nullable=False,
    )
    name_suggested: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_suggested: Mapped[str | None] = mapped_column(String(255))
    owner_suggested: Mapped[str | None] = mapped_column(String(255))

    # --- Confidence ---
    confidence_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    confidence_breakdown_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")
    evidence_json: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")

    # --- Status ---
    status: Mapped[CandidateStatus] = mapped_column(
        Enum(CandidateStatus, name="candidate_status", create_constraint=True),
        default=CandidateStatus.new,
    )
    promoted_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_products.id", ondelete="SET NULL"),
    )
    ignored_reason: Mapped[str | None] = mapped_column(Text)
    ignored_by: Mapped[str | None] = mapped_column(String(255))
    ignored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- Economics (estimated) ---
    monthly_cost_estimate: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    monthly_consumers: Mapped[int] = mapped_column(Integer, default=0)
    consumer_teams_json: Mapped[dict] = mapped_column(JSON, default=list, server_default="[]")
    cost_coverage_pct: Mapped[float] = mapped_column(Numeric(5, 4), default=0)
    source_count: Mapped[int] = mapped_column(Integer, default=0)

    # --- Relationships ---
    members: Mapped[list["CandidateMember"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan",
    )


class CandidateMember(Base, UUIDMixin):
    """Links a source_asset to a product candidate with a role."""
    __tablename__ = "candidate_members"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_candidates.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    source_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_assets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    role: Mapped[str] = mapped_column(String(50), default="primary")  # primary, derived, consumption
    inclusion_reason: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Numeric(5, 4), default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # --- Relationships ---
    candidate: Mapped["ProductCandidate"] = relationship(back_populates="members")
