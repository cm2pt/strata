"""
RBAC Enforcement Tests — verify every endpoint enforces permissions correctly.

Tests that:
1. Unauthenticated requests are rejected (401)
2. Users without required permissions are rejected (403)
3. Users with correct permissions succeed (200/201)
4. Role-permission matrix is respected for every persona
"""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestSession, make_token, auth_headers
from app.main import app
from app.models import User, UserOrgRole, UserRole, Organization
from app.models.data_product import DataProduct, LifecycleStage, PlatformType
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.config import Notification, NotificationType, BenchmarkData


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_org_user_role(db: AsyncSession, role: str) -> tuple:
    """Create org + user with a specific role. Returns (org, user, token)."""
    org = Organization(name=f"Test Corp {role}", slug=f"test-{role}")
    db.add(org)
    await db.flush()

    user = User(
        email=f"{role}@test.com",
        password_hash="$2b$12$dummyhashfortest123456789abcdefghijklmnopq",
        name=f"{role.title()} User",
        title=f"Test {role}",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    org_role = UserOrgRole(user_id=user.id, org_id=org.id, role=UserRole(role))
    db.add(org_role)
    await db.commit()

    token = make_token(user.id, org.id, role=role)
    return org, user, token


async def _seed_product(db: AsyncSession, org_id: uuid.UUID, owner_id: uuid.UUID, **kwargs) -> DataProduct:
    """Create a minimal data product."""
    defaults = dict(
        org_id=org_id,
        owner_id=owner_id,
        name="Test Product",
        domain="Engineering",
        business_unit="Platform",
        platform=PlatformType.snowflake,
        lifecycle_stage=LifecycleStage.active,
        monthly_cost=5000,
        composite_value=15000,
        monthly_consumers=100,
    )
    defaults.update(kwargs)
    product = DataProduct(**defaults)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def _seed_decision(db: AsyncSession, org_id: uuid.UUID, product_id: uuid.UUID, **kwargs) -> Decision:
    """Create a minimal decision."""
    defaults = dict(
        org_id=org_id,
        type=DecisionType.retirement,
        status=DecisionStatus.under_review,
        product_id=product_id,
        product_name="Test Product",
        title="Test Decision",
        description="Test description",
        initiated_by="Admin User",
        assigned_to="Admin User",
        estimated_impact=5000,
    )
    defaults.update(kwargs)
    decision = Decision(**defaults)
    db.add(decision)
    await db.commit()
    await db.refresh(decision)
    return decision


# ---------------------------------------------------------------------------
# Test: Unauthenticated requests → 401
# ---------------------------------------------------------------------------

class TestUnauthenticated:
    """All protected endpoints must reject requests without a token."""

    @pytest.fixture(autouse=True)
    def _client(self):
        pass

    @pytest_asyncio.fixture
    async def c(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_portfolio_summary_requires_auth(self, c):
        r = await c.get("/api/v1/portfolio/summary")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_assets_list_requires_auth(self, c):
        r = await c.get("/api/v1/assets/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_decisions_list_requires_auth(self, c):
        r = await c.get("/api/v1/decisions/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_capital_impact_requires_auth(self, c):
        r = await c.get("/api/v1/capital-impact/summary")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_capital_efficiency_requires_auth(self, c):
        r = await c.get("/api/v1/capital-efficiency/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_board_summary_requires_auth(self, c):
        r = await c.get("/api/v1/board/capital-summary")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_allocation_summary_requires_auth(self, c):
        r = await c.get("/api/v1/allocation/summary")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_lifecycle_overview_requires_auth(self, c):
        r = await c.get("/api/v1/lifecycle/overview")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_connectors_list_requires_auth(self, c):
        r = await c.get("/api/v1/connectors/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_notifications_list_requires_auth(self, c):
        r = await c.get("/api/v1/notifications/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_benchmarks_requires_auth(self, c):
        r = await c.get("/api/v1/benchmarks/")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_ai_scorecard_requires_auth(self, c):
        r = await c.get("/api/v1/ai-scorecard/products")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_candidates_list_requires_auth(self, c):
        r = await c.get("/api/v1/candidates/")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Test: Permission denied → 403
# ---------------------------------------------------------------------------

class TestPermissionDenied:
    """Roles without required permissions must get 403 Forbidden."""

    @pytest_asyncio.fixture
    async def consumer_setup(self, db: AsyncSession):
        """Consumer role has minimal permissions — most write ops should be denied."""
        org, user, token = await _seed_org_user_role(db, "consumer")
        product = await _seed_product(db, org.id, user.id)
        decision = await _seed_decision(db, org.id, product.id)
        return org, user, token, product, decision

    @pytest_asyncio.fixture
    async def c(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_consumer_cannot_create_decision(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            "/api/v1/decisions/",
            headers=auth_headers(token),
            json={
                "type": "retirement",
                "productId": str(product.id),
                "title": "Unauthorized",
                "description": "Should fail",
                "assignedTo": "Nobody",
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_approve_retirement(self, c, consumer_setup):
        _, _, token, _, decision = consumer_setup
        r = await c.post(
            f"/api/v1/decisions/{decision.id}/approve-retirement",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_update_decision(self, c, consumer_setup):
        _, _, token, _, decision = consumer_setup
        r = await c.patch(
            f"/api/v1/decisions/{decision.id}",
            headers=auth_headers(token),
            json={"status": "approved"},
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_delay_retirement(self, c, consumer_setup):
        _, _, token, _, decision = consumer_setup
        r = await c.post(
            f"/api/v1/decisions/{decision.id}/delay-retirement",
            headers=auth_headers(token),
            json={"delayReason": "Budget", "delayedUntil": "2026-06-01T00:00:00+00:00"},
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_approve_reallocation(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            "/api/v1/allocation/approve-reallocation",
            headers=auth_headers(token),
            json={
                "fromProducts": [str(product.id)],
                "toProducts": [str(product.id)],
                "amount": 1000,
                "projectedRoiImpact": 0.1,
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_create_connector(self, c, consumer_setup):
        _, _, token, _, _ = consumer_setup
        r = await c.post(
            "/api/v1/connectors/",
            headers=auth_headers(token),
            json={"name": "Test", "platform": "snowflake"},
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_run_enforcement(self, c, consumer_setup):
        _, _, token, _, _ = consumer_setup
        r = await c.post(
            "/api/v1/enforcement/run-sweep",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_flag_ai_project(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            f"/api/v1/ai-scorecard/{product.id}/flag",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_kill_ai_project(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            f"/api/v1/ai-scorecard/{product.id}/kill",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_create_asset(self, c, consumer_setup):
        _, _, token, _, _ = consumer_setup
        r = await c.post(
            "/api/v1/assets/",
            headers=auth_headers(token),
            json={
                "name": "New Product",
                "domain": "Test",
                "businessUnit": "Test",
                "platform": "snowflake",
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_simulate_pricing(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            "/api/v1/simulate/pricing",
            headers=auth_headers(token),
            json={
                "productId": str(product.id),
                "model": "cost_plus",
                "params": {"markup": 0.2},
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_activate_pricing(self, c, consumer_setup):
        _, _, token, product, _ = consumer_setup
        r = await c.post(
            "/api/v1/pricing/activate",
            headers=auth_headers(token),
            json={
                "productId": str(product.id),
                "model": "cost_plus",
                "params": {"markup": 0.2},
                "projectedRevenue": 1000,
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_connectors(self, c, consumer_setup):
        """Consumer role does NOT have connectors:read permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/connectors/",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_candidates(self, c, consumer_setup):
        """Consumer role does NOT have candidates:read permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/candidates/",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_decisions(self, c, consumer_setup):
        """Consumer role does NOT have decisions:read permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/decisions/",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_capital_impact(self, c, consumer_setup):
        """Consumer role does NOT have capital:read permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/capital-impact/summary",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_board_summary(self, c, consumer_setup):
        """Consumer role does NOT have capital:export permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/board/capital-summary",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_consumer_cannot_read_ai_scorecard(self, c, consumer_setup):
        """Consumer role does NOT have ai:read permission."""
        _, _, token, _, _ = consumer_setup
        r = await c.get(
            "/api/v1/ai-scorecard/products",
            headers=auth_headers(token),
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Test: CFO permissions (mid-tier role)
# ---------------------------------------------------------------------------

class TestCFOPermissions:
    """CFO has read-heavy permissions, can approve decisions, cannot create."""

    @pytest_asyncio.fixture
    async def cfo_setup(self, db: AsyncSession):
        org, user, token = await _seed_org_user_role(db, "cfo")
        product = await _seed_product(db, org.id, user.id)
        decision = await _seed_decision(db, org.id, product.id)
        return org, user, token, product, decision

    @pytest_asyncio.fixture
    async def c(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_cfo_can_read_portfolio(self, c, cfo_setup):
        _, _, token, _, _ = cfo_setup
        r = await c.get("/api/v1/portfolio/summary", headers=auth_headers(token))
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_cfo_can_read_decisions(self, c, cfo_setup):
        _, _, token, _, _ = cfo_setup
        r = await c.get("/api/v1/decisions/", headers=auth_headers(token))
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_cfo_can_approve_decision(self, c, cfo_setup):
        """CFO has decisions:approve permission."""
        _, _, token, _, decision = cfo_setup
        r = await c.post(
            f"/api/v1/decisions/{decision.id}/approve-retirement",
            headers=auth_headers(token),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_cfo_cannot_create_decision(self, c, cfo_setup):
        """CFO does NOT have decisions:create permission."""
        _, _, token, product, _ = cfo_setup
        r = await c.post(
            "/api/v1/decisions/",
            headers=auth_headers(token),
            json={
                "type": "retirement",
                "productId": str(product.id),
                "title": "Test",
                "description": "Test",
                "assignedTo": "Someone",
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_cfo_cannot_run_enforcement(self, c, cfo_setup):
        """CFO does NOT have decisions:create permission needed for enforcement sweep."""
        _, _, token, _, _ = cfo_setup
        r = await c.post(
            "/api/v1/enforcement/run-sweep",
            headers=auth_headers(token),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_cfo_can_read_capital_impact(self, c, cfo_setup):
        """CFO has capital:read permission. May 500 due to SQLite date_trunc, but must not 401/403."""
        _, _, token, _, _ = cfo_setup
        try:
            r = await c.get("/api/v1/capital-impact/summary", headers=auth_headers(token))
            assert r.status_code not in (401, 403), f"Auth check failed: {r.status_code}"
        except Exception as e:
            # SQLite OperationalError on date_trunc = auth passed, DB failed (expected)
            assert "date_trunc" in str(e), f"Unexpected error (not SQLite): {e}"

    @pytest.mark.asyncio
    async def test_cfo_can_read_capital_efficiency(self, c, cfo_setup):
        _, _, token, _, _ = cfo_setup
        r = await c.get("/api/v1/capital-efficiency/", headers=auth_headers(token))
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Test: Admin has full access
# ---------------------------------------------------------------------------

class TestAdminFullAccess:
    """Admin role should be able to access every endpoint."""

    @pytest_asyncio.fixture
    async def admin_setup(self, db: AsyncSession):
        org, user, token = await _seed_org_user_role(db, "admin")
        product = await _seed_product(db, org.id, user.id)
        decision = await _seed_decision(db, org.id, product.id)
        return org, user, token, product, decision

    @pytest_asyncio.fixture
    async def c(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_admin_can_read_all(self, c, admin_setup):
        _, _, token, _, _ = admin_setup
        headers = auth_headers(token)

        # Endpoints that work in SQLite (no date_trunc or percentile_cont)
        sqlite_safe_endpoints = [
            "/api/v1/portfolio/summary",
            "/api/v1/assets/",
            "/api/v1/decisions/",
            "/api/v1/capital-efficiency/",
            "/api/v1/lifecycle/overview",
            "/api/v1/allocation/summary",
            "/api/v1/connectors/",
            "/api/v1/notifications/",
            "/api/v1/benchmarks/",
            "/api/v1/candidates/",
        ]
        for endpoint in sqlite_safe_endpoints:
            r = await c.get(endpoint, headers=headers)
            assert r.status_code == 200, f"Admin denied on GET {endpoint}: {r.status_code}"

        # Endpoints that may fail in SQLite due to PostgreSQL-specific functions
        # (date_trunc, percentile_cont). Auth must still pass (not 401/403).
        pg_specific_endpoints = [
            "/api/v1/capital-impact/summary",
            "/api/v1/ai-scorecard/products",
        ]
        for endpoint in pg_specific_endpoints:
            try:
                r = await c.get(endpoint, headers=headers)
                assert r.status_code not in (401, 403), f"Admin denied on GET {endpoint}: {r.status_code}"
            except Exception as e:
                # SQLite-specific function errors = auth passed, DB failed (expected)
                err = str(e).lower()
                assert "date_trunc" in err or "percentile_cont" in err, f"Unexpected error on {endpoint}: {e}"

    @pytest.mark.asyncio
    async def test_admin_can_create_decision(self, c, admin_setup):
        _, _, token, product, _ = admin_setup
        r = await c.post(
            "/api/v1/decisions/",
            headers=auth_headers(token),
            json={
                "type": "retirement",
                "productId": str(product.id),
                "title": "Admin Decision",
                "description": "Admin can create",
                "assignedTo": "Admin User",
            },
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_admin_can_approve_retirement(self, c, admin_setup):
        _, _, token, _, decision = admin_setup
        r = await c.post(
            f"/api/v1/decisions/{decision.id}/approve-retirement",
            headers=auth_headers(token),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_can_update_decision(self, c, admin_setup):
        _, _, token, _, decision = admin_setup
        r = await c.patch(
            f"/api/v1/decisions/{decision.id}",
            headers=auth_headers(token),
            json={"status": "approved"},
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_can_read_board_summary(self, c, admin_setup):
        _, _, token, _, _ = admin_setup
        r = await c.get("/api/v1/board/capital-summary", headers=auth_headers(token))
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Test: External Auditor — read-only, limited scope
# ---------------------------------------------------------------------------

class TestExternalAuditorPermissions:
    """External auditor has very limited read permissions only."""

    @pytest_asyncio.fixture
    async def auditor_setup(self, db: AsyncSession):
        org, user, token = await _seed_org_user_role(db, "external_auditor")
        product = await _seed_product(db, org.id, user.id)
        return org, user, token, product

    @pytest_asyncio.fixture
    async def c(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_auditor_can_read_portfolio(self, c, auditor_setup):
        _, _, token, _ = auditor_setup
        r = await c.get("/api/v1/portfolio/summary", headers=auth_headers(token))
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_auditor_can_read_decisions(self, c, auditor_setup):
        _, _, token, _ = auditor_setup
        r = await c.get("/api/v1/decisions/", headers=auth_headers(token))
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_auditor_can_read_capital(self, c, auditor_setup):
        """External auditor has capital:read. May fail in SQLite, but must not 401/403."""
        _, _, token, _ = auditor_setup
        try:
            r = await c.get("/api/v1/capital-impact/summary", headers=auth_headers(token))
            assert r.status_code not in (401, 403), f"Auth check failed: {r.status_code}"
        except Exception as e:
            assert "date_trunc" in str(e), f"Unexpected error (not SQLite): {e}"

    @pytest.mark.asyncio
    async def test_auditor_cannot_read_connectors(self, c, auditor_setup):
        """External auditor does NOT have connectors:read."""
        _, _, token, _ = auditor_setup
        r = await c.get("/api/v1/connectors/", headers=auth_headers(token))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_auditor_cannot_read_marketplace(self, c, auditor_setup):
        """External auditor does NOT have marketplace:read."""
        _, _, token, _ = auditor_setup
        r = await c.get("/api/v1/marketplace/products", headers=auth_headers(token))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_auditor_cannot_create_anything(self, c, auditor_setup):
        _, _, token, product = auditor_setup
        r = await c.post(
            "/api/v1/decisions/",
            headers=auth_headers(token),
            json={
                "type": "retirement",
                "productId": str(product.id),
                "title": "Audit",
                "description": "Fail",
                "assignedTo": "Auditor",
            },
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_auditor_cannot_read_notifications(self, c, auditor_setup):
        """External auditor does NOT have notifications:read."""
        _, _, token, _ = auditor_setup
        r = await c.get("/api/v1/notifications/", headers=auth_headers(token))
        assert r.status_code == 403
