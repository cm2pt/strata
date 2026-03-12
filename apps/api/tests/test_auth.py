"""Tests for auth endpoints — register, login, demo-login, refresh, logout, /me, demo-personas."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt as jose_jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, UserOrgRole, UserRole
from app.models.org import Organization

from tests.conftest import auth_headers, make_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_demo_user(db: AsyncSession, org: Organization, role: UserRole, email: str, name: str):
    """Insert a user with the given role into the test DB."""
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(email=email, password_hash=pwd.hash("demo123"), name=name, is_active=True)
    db.add(user)
    await db.flush()
    db.add(UserOrgRole(user_id=user.id, org_id=org.id, role=role))
    await db.commit()
    await db.refresh(user)
    return user


async def _register_and_login(client: AsyncClient, email="test@test.com", password="securepass", name="Test User", org_name="Test Corp"):
    """Helper to register and return the auth response JSON."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "name": name,
        "orgName": org_name,
    })
    return reg.json()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class TestRegister:
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/register", json={
            "email": "new@test.com",
            "password": "securepass",
            "name": "New User",
            "orgName": "New Corp",
        })
        assert res.status_code == 201
        data = res.json()
        assert "accessToken" in data
        assert "refreshToken" in data
        assert data["user"]["email"] == "new@test.com"
        assert data["user"]["role"] == "admin"  # org creator gets admin

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {"email": "dup@test.com", "password": "securepass", "name": "First"}
        await client.post("/api/v1/auth/register", json=payload)
        res = await client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 409

    @pytest.mark.asyncio
    async def test_register_no_org(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/register", json={
            "email": "solo@test.com",
            "password": "securepass",
            "name": "Solo User",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["user"]["role"] == "consumer"
        assert "refreshToken" in data


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, db: AsyncSession):
        # First register
        await client.post("/api/v1/auth/register", json={
            "email": "login@test.com",
            "password": "securepass",
            "name": "Login User",
            "orgName": "Login Corp",
        })
        # Then login
        res = await client.post("/api/v1/auth/login", json={
            "email": "login@test.com",
            "password": "securepass",
        })
        assert res.status_code == 200
        data = res.json()
        assert "accessToken" in data
        assert "refreshToken" in data
        assert data["user"]["email"] == "login@test.com"
        assert data["user"]["roleMeta"] is not None

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "wrong@test.com",
            "password": "correct_pass",
            "name": "Wrong User",
        })
        res = await client.post("/api/v1/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrong_pass",
        })
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/login", json={
            "email": "nope@test.com",
            "password": "anything",
        })
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

class TestMe:
    @pytest.mark.asyncio
    async def test_me_authenticated(self, client: AsyncClient):
        data = await _register_and_login(client, "me@test.com")
        token = data["accessToken"]
        res = await client.get("/api/v1/auth/me", headers=auth_headers(token))
        assert res.status_code == 200
        body = res.json()
        assert body["email"] == "me@test.com"
        assert body["roleMeta"] is not None

    @pytest.mark.asyncio
    async def test_me_no_token(self, client: AsyncClient):
        res = await client.get("/api/v1/auth/me")
        assert res.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_me_invalid_token(self, client: AsyncClient):
        res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer garbage-token"},
        )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

class TestRefresh:
    @pytest.mark.asyncio
    async def test_refresh_success(self, client: AsyncClient):
        """Register, then use the refresh token to get a new access token."""
        reg_data = await _register_and_login(client, "refresh@test.com")
        refresh_token = reg_data["refreshToken"]
        assert refresh_token is not None

        res = await client.post("/api/v1/auth/refresh", json={
            "refreshToken": refresh_token,
        })
        assert res.status_code == 200
        data = res.json()
        assert "accessToken" in data
        assert "refreshToken" in data
        # New refresh token should be different (rotation)
        assert data["refreshToken"] != refresh_token
        assert data["user"]["email"] == "refresh@test.com"

    @pytest.mark.asyncio
    async def test_refresh_old_token_revoked(self, client: AsyncClient):
        """After refresh, the old refresh token should be invalid."""
        reg_data = await _register_and_login(client, "revoked@test.com")
        old_refresh = reg_data["refreshToken"]

        # First refresh succeeds
        res1 = await client.post("/api/v1/auth/refresh", json={"refreshToken": old_refresh})
        assert res1.status_code == 200

        # Second attempt with old token should fail
        res2 = await client.post("/api/v1/auth/refresh", json={"refreshToken": old_refresh})
        assert res2.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/refresh", json={
            "refreshToken": "completely-invalid-token",
        })
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_new_access_token_works(self, client: AsyncClient):
        """The new access token from refresh should work for /me."""
        reg_data = await _register_and_login(client, "newaccess@test.com")
        refresh_token = reg_data["refreshToken"]

        refresh_res = await client.post("/api/v1/auth/refresh", json={
            "refreshToken": refresh_token,
        })
        new_access = refresh_res.json()["accessToken"]

        me_res = await client.get("/api/v1/auth/me", headers=auth_headers(new_access))
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "newaccess@test.com"


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class TestLogout:
    @pytest.mark.asyncio
    async def test_logout_revokes_refresh_tokens(self, client: AsyncClient):
        """After logout, the refresh token should no longer work."""
        reg_data = await _register_and_login(client, "logout@test.com")
        access_token = reg_data["accessToken"]
        refresh_token = reg_data["refreshToken"]

        # Logout
        res = await client.post(
            "/api/v1/auth/logout",
            headers=auth_headers(access_token),
        )
        assert res.status_code == 204

        # Refresh should now fail
        refresh_res = await client.post("/api/v1/auth/refresh", json={
            "refreshToken": refresh_token,
        })
        assert refresh_res.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_requires_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/logout")
        assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Demo login
# ---------------------------------------------------------------------------

class TestDemoLogin:
    @pytest.mark.asyncio
    async def test_demo_login_success(self, client: AsyncClient, db: AsyncSession):
        org = Organization(name="Demo Corp", slug="demo-corp")
        db.add(org)
        await db.flush()
        await _seed_demo_user(db, org, UserRole.cfo, "cfo@demo.com", "CFO User")

        res = await client.post("/api/v1/auth/demo-login", json={"role": "cfo"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["role"] == "cfo"
        assert "refreshToken" in data
        assert data["user"]["roleMeta"]["defaultFocusRoute"] == "/capital-impact"

    @pytest.mark.asyncio
    async def test_demo_login_unknown_role(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/demo-login", json={"role": "nonexistent"})
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_demo_login_no_user_for_role(self, client: AsyncClient):
        # platform_admin role exists but no user with that role
        res = await client.post("/api/v1/auth/demo-login", json={"role": "platform_admin"})
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Demo personas
# ---------------------------------------------------------------------------

class TestDemoPersonas:
    @pytest.mark.asyncio
    async def test_demo_personas_returns_list(self, client: AsyncClient, db: AsyncSession):
        org = Organization(name="Demo Corp", slug="demo-corp")
        db.add(org)
        await db.flush()
        await _seed_demo_user(db, org, UserRole.cfo, "cfo@demo.com", "CFO User")

        res = await client.get("/api/v1/auth/demo-personas")
        assert res.status_code == 200
        personas = res.json()
        assert isinstance(personas, list)
        assert len(personas) >= 1  # at least one persona should match

    @pytest.mark.asyncio
    async def test_demo_personas_include_role_metadata(self, client: AsyncClient, db: AsyncSession):
        org = Organization(name="Demo Corp", slug="demo-corp")
        db.add(org)
        await db.flush()
        await _seed_demo_user(db, org, UserRole.cdo, "cdo@demo.com", "CDO User")

        res = await client.get("/api/v1/auth/demo-personas")
        personas = res.json()
        cdo_personas = [p for p in personas if p["roleId"] == "cdo"]
        assert len(cdo_personas) == 1
        assert cdo_personas[0]["displayName"] == "CDO / Head of Data"
        assert cdo_personas[0]["defaultFocusRoute"] == "/portfolio"


# ---------------------------------------------------------------------------
# JWT token content
# ---------------------------------------------------------------------------

class TestTokenContent:
    @pytest.mark.asyncio
    async def test_token_contains_role_claim(self, client: AsyncClient):
        reg_data = await _register_and_login(client, "token@test.com", org_name="Token Corp")

        res = await client.post("/api/v1/auth/login", json={
            "email": "token@test.com",
            "password": "securepass",
        })
        token = res.json()["accessToken"]
        payload = jose_jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        assert "role" in payload
        assert "sub" in payload
        assert "org_id" in payload
        assert payload["type"] == "access"

    @pytest.mark.asyncio
    async def test_access_token_is_short_lived(self, client: AsyncClient):
        """Access tokens should expire in jwt_access_minutes (15 min default)."""
        reg_data = await _register_and_login(client, "shortlived@test.com")
        token = reg_data["accessToken"]
        payload = jose_jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        # Should expire within ~16 minutes (15 min + some slack)
        assert (exp - now).total_seconds() <= settings.jwt_access_minutes * 60 + 60
        # Should NOT expire in more than an hour (i.e. not using the old 24h)
        assert (exp - now).total_seconds() < 3600
