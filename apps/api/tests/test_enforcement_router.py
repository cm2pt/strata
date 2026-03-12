"""Tests for the /enforcement router — run-sweep endpoint."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestEnforcementSweep:
    @pytest.mark.asyncio
    async def test_run_sweep(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/enforcement/run-sweep",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_run_sweep_unauthenticated(self, client: AsyncClient):
        res = await client.post("/api/v1/enforcement/run-sweep")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_run_sweep_consumer_forbidden(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, role="consumer")
        res = await client.post(
            "/api/v1/enforcement/run-sweep",
            headers=auth_headers(token),
        )
        assert res.status_code == 403
