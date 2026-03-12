"""Tests for the /assets router — product CRUD, metrics, search & filtering."""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DataProduct, LifecycleStage, PlatformType
from tests.conftest import auth_headers, make_token


class TestAssetsList:
    @pytest.mark.asyncio
    async def test_list_assets(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/assets/", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        # Paginated response: {items, page, pageSize, total}
        assert "items" in data
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_assets_search(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/assets/?search=Test", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_assets_filter_lifecycle(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/assets/?lifecycle_stage=active", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_assets_empty_search(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/assets/?search=nonexistent_xyz", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 0

    @pytest.mark.asyncio
    async def test_list_assets_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/assets/")
        assert res.status_code == 401


class TestAssetDetail:
    @pytest.mark.asyncio
    async def test_get_asset(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/assets/{seeded_product.id}",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Test Product"

    @pytest.mark.asyncio
    async def test_get_asset_not_found(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/assets/{uuid.uuid4()}",
            headers=auth_headers(token),
        )
        assert res.status_code == 404


class TestAssetMetrics:
    @pytest.mark.asyncio
    async def test_get_asset_metrics(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/assets/{seeded_product.id}/metrics",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict)


class TestCreateAsset:
    @pytest.mark.asyncio
    async def test_create_asset(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/assets/",
            json={
                "name": "New Product",
                "domain": "marketing",
                "businessUnit": "Sales",
                "platform": "snowflake",
                "lifecycleStage": "draft",
            },
            headers=auth_headers(token),
        )
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["name"] == "New Product"
