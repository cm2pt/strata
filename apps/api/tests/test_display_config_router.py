"""Tests for the /display-config router — UI configuration thresholds."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestDisplayConfig:
    @pytest.mark.asyncio
    async def test_get_config(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/display-config/", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_config_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/display-config/")
        assert res.status_code == 401
