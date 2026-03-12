"""Tests for audit logging service + model."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.org import Organization
from app.models.user import User
from app.services.audit_service import log_action


class TestAuditService:
    @pytest.mark.asyncio
    async def test_log_action_creates_record(self, db: AsyncSession):
        org = Organization(name="Audit Corp", slug="audit-corp")
        db.add(org)
        await db.flush()

        user = User(email="audit@test.com", password_hash="x", name="Audit User", is_active=True)
        db.add(user)
        await db.flush()

        await log_action(
            db,
            org_id=org.id,
            user_id=user.id,
            action="test_action",
            entity_type="test_entity",
            entity_id=str(uuid.uuid4()),
            metadata={"key": "value"},
            ip_address="127.0.0.1",
        )
        await db.commit()

        result = await db.execute(select(AuditLog).where(AuditLog.action == "test_action"))
        log = result.scalar_one_or_none()
        assert log is not None
        assert log.action == "test_action"
        assert log.ip_address == "127.0.0.1"
        assert log.metadata_json == {"key": "value"}

    @pytest.mark.asyncio
    async def test_log_action_minimal(self, db: AsyncSession):
        org = Organization(name="Min Corp", slug="min-corp")
        db.add(org)
        await db.flush()

        user = User(email="min@test.com", password_hash="x", name="Min User", is_active=True)
        db.add(user)
        await db.flush()

        await log_action(db, org_id=org.id, user_id=user.id, action="minimal")
        await db.commit()

        result = await db.execute(select(AuditLog).where(AuditLog.action == "minimal"))
        log = result.scalar_one_or_none()
        assert log is not None
        assert log.entity_type is None
        assert log.ip_address is None


class TestAuditModel:
    @pytest.mark.asyncio
    async def test_audit_log_table_name(self):
        assert AuditLog.__tablename__ == "audit_logs"

    @pytest.mark.asyncio
    async def test_audit_log_has_required_columns(self):
        cols = {c.name for c in AuditLog.__table__.columns}
        assert "org_id" in cols
        assert "user_id" in cols
        assert "action" in cols
        assert "timestamp" in cols
