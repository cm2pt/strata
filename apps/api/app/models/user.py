import uuid
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, PyEnum):
    # Original 5 roles (kept for backward compat)
    cfo = "cfo"
    cdo = "cdo"
    product_owner = "product_owner"
    consumer = "consumer"
    admin = "admin"
    # New personas added for multi-persona RBAC
    executive_sponsor = "executive_sponsor"
    fpa_analyst = "fpa_analyst"
    governance_steward = "governance_steward"
    platform_admin = "platform_admin"
    data_engineer = "data_engineer"
    dataops_sre = "dataops_sre"
    head_of_ai = "head_of_ai"
    data_scientist = "data_scientist"
    external_auditor = "external_auditor"
    integration_service = "integration_service"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    org_roles: Mapped[list["UserOrgRole"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserOrgRole(Base, UUIDMixin):
    __tablename__ = "user_org_roles"
    __table_args__ = (UniqueConstraint("user_id", "org_id", "role"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", create_constraint=True), nullable=False)
    team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"))

    user: Mapped["User"] = relationship(back_populates="org_roles")
