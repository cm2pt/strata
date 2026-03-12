"""Tests for the /lifecycle router — overview endpoint."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestLifecycleOverview:
    @pytest.mark.asyncio
    async def test_overview(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/lifecycle/overview", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_overview_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/lifecycle/overview")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_overview_has_products(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/lifecycle/overview", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        # Should contain products or stages
        assert len(data) > 0
