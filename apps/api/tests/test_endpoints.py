"""Tests for the major read-only API endpoints — portfolio, candidates, connectors, etc.

These tests verify that authenticated users can access endpoints and get
well-formed responses. We seed minimal data and test response shapes.
"""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.org import Organization
from app.models.user import User, UserOrgRole, UserRole
from app.models.data_product import DataProduct, LifecycleStage, PlatformType, ROIBand
from app.models.connector import ConnectorConfig, ConnectorStatus, ConnectorType
from app.models.candidate import ProductCandidate, CandidateMember, CandidateType, CandidateStatus
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.config import Notification, NotificationType

from tests.conftest import auth_headers, make_token


@pytest.fixture
async def full_seed(db: AsyncSession):
    """Seed a complete test dataset for read endpoints."""
    org = Organization(name="Full Corp", slug="full-corp")
    db.add(org)
    await db.flush()

    user = User(
        email="full@test.com",
        password_hash="$2b$12$dummyhash",
        name="Full User",
        title="Admin",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(UserOrgRole(user_id=user.id, org_id=org.id, role=UserRole.admin))

    # Create data products
    products = []
    for i in range(3):
        p = DataProduct(
            org_id=org.id,
            owner_id=user.id,
            name=f"Product {i}",
            domain="analytics",
            business_unit="Engineering",
            platform=PlatformType.snowflake,
            lifecycle_stage=LifecycleStage.active,
            monthly_cost=Decimal("1000.00") + i * 500,
            composite_value=Decimal("5000.00") + i * 1000,
            monthly_consumers=10 + i * 5,
            subscription_count=2,
            is_retirement_candidate=(i == 2),
            has_cost_spike=(i == 1),
            has_usage_decline=(i == 2),
            cost_coverage=Decimal("0.85"),
        )
        db.add(p)
        products.append(p)
    await db.flush()

    # Create a connector
    connector = ConnectorConfig(
        org_id=org.id,
        name="Test Connector",
        connector_type=ConnectorType.snowflake,
        credentials={},
        status=ConnectorStatus.connected,
    )
    db.add(connector)
    await db.flush()

    # Create candidates
    candidate = ProductCandidate(
        org_id=org.id,
        candidate_type=CandidateType.semantic_product,
        name_suggested="New Product Candidate",
        domain_suggested="marketing",
        confidence_score=85,
        status=CandidateStatus.new,
        monthly_cost_estimate=Decimal("750.00"),
        monthly_consumers=15,
        source_count=3,
    )
    db.add(candidate)
    await db.flush()

    # Create a decision
    decision = Decision(
        org_id=org.id,
        type=DecisionType.retirement,
        status=DecisionStatus.under_review,
        product_id=products[2].id,
        product_name="Product 2",
        title="Review for retirement",
        description="Low usage product",
        initiated_by="Admin",
        assigned_to="Admin",
    )
    db.add(decision)

    # Create a notification
    notif = Notification(
        org_id=org.id,
        type=NotificationType.cost_spike,
        title="Cost spike detected",
        description="Product 1 cost increased by 25%",
        product_id=products[1].id,
    )
    db.add(notif)

    await db.commit()
    for p in products:
        await db.refresh(p)
    await db.refresh(candidate)

    token = make_token(user.id, org.id, "admin")
    return {
        "org": org,
        "user": user,
        "products": products,
        "connector": connector,
        "candidate": candidate,
        "decision": decision,
        "token": token,
    }


class TestPortfolio:
    @pytest.mark.asyncio
    async def test_summary(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/portfolio/summary",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["totalProducts"] == 3
        assert data["totalCost"] > 0
        assert "averageROI" in data
        assert data["retirementCandidates"] == 1

    @pytest.mark.asyncio
    async def test_cost_trend_empty(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/portfolio/cost-trend",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_roi_history_empty(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/portfolio/roi-history",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_executive_summary(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/portfolio/executive-summary",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "insights" in data
        assert "doNothingProjection" in data
        assert len(data["insights"]) >= 1


class TestCandidates:
    @pytest.mark.asyncio
    async def test_list_candidates(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/candidates/",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        candidates = res.json()
        assert len(candidates) == 1
        assert candidates[0]["nameSuggested"] == "New Product Candidate"

    @pytest.mark.asyncio
    async def test_list_candidates_with_status_filter(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/candidates/?status=new",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert len(res.json()) == 1

    @pytest.mark.asyncio
    async def test_list_candidates_sort_by_cost(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/candidates/?sortBy=cost",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_list_candidates_sort_by_newest(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/candidates/?sortBy=newest",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_get_candidate_detail(self, client: AsyncClient, full_seed):
        cid = str(full_seed["candidate"].id)
        res = await client.get(
            f"/api/v1/candidates/{cid}",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["confidenceScore"] == 85
        assert data["status"] == "new"

    @pytest.mark.asyncio
    async def test_get_candidate_not_found(self, client: AsyncClient, full_seed):
        res = await client.get(
            f"/api/v1/candidates/{uuid.uuid4()}",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_ignore_candidate(self, client: AsyncClient, full_seed):
        cid = str(full_seed["candidate"].id)
        res = await client.post(
            f"/api/v1/candidates/{cid}/ignore",
            json={"reason": "Not needed"},
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert "ignored" in res.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_promote_candidate(self, client: AsyncClient, full_seed):
        cid = str(full_seed["candidate"].id)
        res = await client.post(
            f"/api/v1/candidates/{cid}/promote",
            json={
                "name": "Promoted Product",
                "domain": "marketing",
                "businessUnit": "Sales",
                "platform": "snowflake",
                "ownerId": str(full_seed["user"].id),
            },
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "productId" in data
        assert "decisionId" in data

    @pytest.mark.asyncio
    async def test_promote_already_promoted(self, client: AsyncClient, full_seed, db: AsyncSession):
        cid = str(full_seed["candidate"].id)
        # First promote
        await client.post(
            f"/api/v1/candidates/{cid}/promote",
            json={
                "name": "P",
                "domain": "D",
                "businessUnit": "B",
                "platform": "snowflake",
                "ownerId": str(full_seed["user"].id),
            },
            headers=auth_headers(full_seed["token"]),
        )
        # Try again
        res = await client.post(
            f"/api/v1/candidates/{cid}/promote",
            json={
                "name": "P2",
                "domain": "D",
                "businessUnit": "B",
                "platform": "snowflake",
                "ownerId": str(full_seed["user"].id),
            },
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 400


class TestConnectors:
    @pytest.mark.asyncio
    async def test_list_connectors(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/connectors/",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        connectors = res.json()
        assert len(connectors) == 1

    @pytest.mark.asyncio
    async def test_create_connector(self, client: AsyncClient, full_seed):
        res = await client.post(
            "/api/v1/connectors/",
            json={"name": "New Conn", "platform": "snowflake"},
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 201
        assert res.json()["name"] == "New Conn"


class TestDecisions:
    @pytest.mark.asyncio
    async def test_list_decisions(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/decisions/",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1


class TestNotifications:
    @pytest.mark.asyncio
    async def test_list_notifications(self, client: AsyncClient, full_seed):
        res = await client.get(
            "/api/v1/notifications/",
            headers=auth_headers(full_seed["token"]),
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1
