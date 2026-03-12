"""Tests for the /allocation router — summary, rebalance, approve."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestAllocationSummary:
    @pytest.mark.asyncio
    async def test_summary(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/allocation/summary", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_summary_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/allocation/summary")
        assert res.status_code == 401


class TestPortfolioRebalance:
    @pytest.mark.asyncio
    async def test_rebalance(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            "/api/v1/allocation/portfolio-rebalance",
            headers=auth_headers(token),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_rebalance_custom_pct(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            "/api/v1/allocation/portfolio-rebalance?rebalance_pct=0.30",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
