"""Tests for the /org-info router — organization metadata."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


class TestOrgInfo:
    @pytest.mark.asyncio
    async def test_get_org_info(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/org-info/", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)
        # Should contain org name
        assert "name" in data or "orgName" in data

    @pytest.mark.asyncio
    async def test_org_info_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/org-info/")
        assert res.status_code == 401
