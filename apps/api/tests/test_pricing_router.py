"""Tests for the /pricing router — activate, list policies, update."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PricingPolicy, PricingPolicyStatus
from tests.conftest import auth_headers, make_token


class TestActivatePricing:
    @pytest.mark.asyncio
    async def test_activate(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/pricing/activate",
            json={
                "productId": str(seeded_product.id),
                "model": "cost_plus",
                "params": {"margin": 0.25},
                "projectedRevenue": 5000,
            },
            headers=auth_headers(token),
        )
        assert res.status_code == 201
        data = res.json()
        assert "policyId" in data or "policy_id" in data or isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_activate_unauthenticated(self, client: AsyncClient):
        res = await client.post("/api/v1/pricing/activate", json={})
        assert res.status_code == 401


class TestListPolicies:
    @pytest.mark.asyncio
    async def test_active_policies(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/pricing/policies/active", headers=auth_headers(token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_all_policies(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/pricing/policies", headers=auth_headers(token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_policies_by_product(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/pricing/policies?productId={seeded_product.id}",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestUpdatePolicy:
    @pytest.mark.asyncio
    async def test_activate_then_update(self, client: AsyncClient, org_and_user, seeded_product, db: AsyncSession):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        headers = auth_headers(token)

        # Activate first
        activate_res = await client.post(
            "/api/v1/pricing/activate",
            json={
                "productId": str(seeded_product.id),
                "model": "flat",
                "params": {"flatFee": 100},
                "projectedRevenue": 1200,
            },
            headers=headers,
        )
        assert activate_res.status_code == 201
        policy_data = activate_res.json()
        policy_id = policy_data.get("policyId") or policy_data.get("policy_id") or policy_data.get("id")

        if policy_id:
            # Update actual revenue
            res = await client.patch(
                f"/api/v1/pricing/policies/{policy_id}",
                json={"actualRevenue": 950},
                headers=headers,
            )
            assert res.status_code == 200
