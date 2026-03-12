"""Tests for the /ai-scorecard router — product listing, flag, kill."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AIProjectScorecard, AIProjectRiskLevel
from tests.conftest import auth_headers, make_token


class TestAIScorecardProducts:
    @pytest.mark.asyncio
    async def test_list_products(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/ai-scorecard/products", headers=auth_headers(token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_list_products_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/ai-scorecard/products")
        assert res.status_code == 401


class TestAIScorecardFlag:
    @pytest.mark.asyncio
    async def test_flag_product(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            f"/api/v1/ai-scorecard/{seeded_product.id}/flag",
            headers=auth_headers(token),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_flag_unauthenticated(self, client: AsyncClient, org_and_user, seeded_product):
        res = await client.post(f"/api/v1/ai-scorecard/{seeded_product.id}/flag")
        assert res.status_code == 401


class TestAIScorecardKill:
    @pytest.mark.asyncio
    async def test_kill_product(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            f"/api/v1/ai-scorecard/{seeded_product.id}/kill",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
