"""Tests for the /simulate router — pricing simulation."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestPricingSimulation:
    @pytest.mark.asyncio
    async def test_simulate_cost_plus(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/simulate/pricing",
            json={
                "productId": str(seeded_product.id),
                "model": "cost_plus",
                "params": {"margin": 0.3},
            },
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_simulate_usage_based(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/simulate/pricing",
            json={
                "productId": str(seeded_product.id),
                "model": "usage_based",
                "params": {"pricePerQuery": 0.05},
            },
            headers=auth_headers(token),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_simulate_unauthenticated(self, client: AsyncClient):
        res = await client.post("/api/v1/simulate/pricing", json={})
        assert res.status_code == 401
