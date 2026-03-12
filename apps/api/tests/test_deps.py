"""Tests for API dependency layer — auth resolution + permission checks."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt as jose_jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.org import Organization
from app.models.user import User, UserOrgRole, UserRole

from tests.conftest import auth_headers, make_token


@pytest.fixture
async def seeded(db: AsyncSession):
    """Seed an org + multiple users with different roles."""
    org = Organization(name="Dep Corp", slug="dep-corp")
    db.add(org)
    await db.flush()

    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    pw = pwd.hash("demo123")

    users = {}
    for role, email, name in [
        (UserRole.admin, "admin@dep.com", "Admin User"),
        (UserRole.cfo, "cfo@dep.com", "CFO User"),
        (UserRole.consumer, "consumer@dep.com", "Consumer User"),
        (UserRole.data_engineer, "eng@dep.com", "Data Engineer"),
        (UserRole.external_auditor, "auditor@dep.com", "Auditor User"),
    ]:
        u = User(email=email, password_hash=pw, name=name, is_active=True)
        db.add(u)
        await db.flush()
        db.add(UserOrgRole(user_id=u.id, org_id=org.id, role=role))
        users[role.value] = u

    await db.commit()
    for u in users.values():
        await db.refresh(u)
    return org, users


class TestPermissionEnforcement:
    """Test that require_permission() correctly blocks/allows by role."""

    @pytest.mark.asyncio
    async def test_admin_can_promote_candidate(self, client: AsyncClient, seeded):
        org, users = seeded
        token = make_token(users["admin"].id, org.id, "admin")
        # No candidate exists, but we should get 404 not 403
        res = await client.post(
            f"/api/v1/candidates/{uuid.uuid4()}/promote",
            json={"name": "P", "domain": "D", "businessUnit": "B", "ownerId": str(users["admin"].id)},
            headers=auth_headers(token),
        )
        assert res.status_code == 404  # Not 403 — permission passed

    @pytest.mark.asyncio
    async def test_consumer_cannot_promote_candidate(self, client: AsyncClient, seeded):
        org, users = seeded
        token = make_token(users["consumer"].id, org.id, "consumer")
        res = await client.post(
            f"/api/v1/candidates/{uuid.uuid4()}/promote",
            json={"name": "P", "domain": "D", "businessUnit": "B", "ownerId": str(users["consumer"].id)},
            headers=auth_headers(token),
        )
        assert res.status_code == 403

    @pytest.mark.asyncio
    async def test_auditor_cannot_ignore_candidate(self, client: AsyncClient, seeded):
        org, users = seeded
        token = make_token(users["external_auditor"].id, org.id, "external_auditor")
        res = await client.post(
            f"/api/v1/candidates/{uuid.uuid4()}/ignore",
            json={"reason": "not needed"},
            headers=auth_headers(token),
        )
        assert res.status_code == 403

    @pytest.mark.asyncio
    async def test_data_engineer_can_ignore_candidate(self, client: AsyncClient, seeded):
        org, users = seeded
        token = make_token(users["data_engineer"].id, org.id, "data_engineer")
        res = await client.post(
            f"/api/v1/candidates/{uuid.uuid4()}/ignore",
            json={"reason": "duplicate"},
            headers=auth_headers(token),
        )
        # Should be 404 (no candidate), not 403
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_no_token_returns_401(self, client: AsyncClient):
        res = await client.post(
            f"/api/v1/candidates/{uuid.uuid4()}/promote",
            json={"name": "P", "domain": "D", "businessUnit": "B", "ownerId": str(uuid.uuid4())},
        )
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_returns_401(self, client: AsyncClient, seeded):
        org, users = seeded
        payload = {
            "sub": str(users["admin"].id),
            "org_id": str(org.id),
            "role": "admin",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # expired
        }
        token = jose_jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        res = await client.get("/api/v1/portfolio/summary", headers=auth_headers(token))
        assert res.status_code == 401


class TestOrgIdResolution:
    """Test that get_current_org_id properly decodes the JWT."""

    @pytest.mark.asyncio
    async def test_valid_org_id(self, client: AsyncClient, seeded):
        org, users = seeded
        token = make_token(users["admin"].id, org.id, "admin")
        # Portfolio summary uses get_current_org_id
        res = await client.get("/api/v1/portfolio/summary", headers=auth_headers(token))
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_missing_org_id_in_token(self, client: AsyncClient, seeded):
        org, users = seeded
        payload = {
            "sub": str(users["admin"].id),
            # no org_id
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jose_jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        res = await client.get("/api/v1/portfolio/summary", headers=auth_headers(token))
        assert res.status_code == 401
