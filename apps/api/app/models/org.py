import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    industry: Mapped[str | None] = mapped_column(String(50))

    business_units: Mapped[list["BusinessUnit"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    teams: Mapped[list["Team"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class BusinessUnit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "business_units"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="business_units")


class Team(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    business_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("business_units.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="teams")
