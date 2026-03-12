"""Tests for the /capital-impact router — summary endpoint."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestCapitalImpactSummary:
    @pytest.mark.asyncio
    async def test_summary(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/capital-impact/summary", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)
        # Check expected top-level keys
        assert "totalCapitalFreed" in data or "total_capital_freed" in data

    @pytest.mark.asyncio
    async def test_summary_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/capital-impact/summary")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_summary_consumer_forbidden(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, role="consumer")
        res = await client.get("/api/v1/capital-impact/summary", headers=auth_headers(token))
        assert res.status_code == 403
