"""Tests for the /marketplace router — product listing, subscribe/unsubscribe."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_headers, make_token


class TestMarketplaceProducts:
    @pytest.mark.asyncio
    async def test_list_products(self, client: AsyncClient, org_and_user, seeded_product):
        """seeded_product has is_published=True, so should appear."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/marketplace/products", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_list_products_search(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get(
            "/api/v1/marketplace/products?search=Test",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1

    @pytest.mark.asyncio
    async def test_list_products_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/marketplace/products")
        assert res.status_code == 401


class TestMarketplaceSubscribe:
    @pytest.mark.asyncio
    async def test_subscribe(self, client: AsyncClient, org_and_user, seeded_product):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.post(
            "/api/v1/marketplace/subscribe",
            json={"productId": str(seeded_product.id)},
            headers=auth_headers(token),
        )
        assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_subscribe_toggle(self, client: AsyncClient, org_and_user, seeded_product):
        """Subscribe twice should toggle off."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        headers = auth_headers(token)
        body = {"productId": str(seeded_product.id)}
        # Subscribe
        await client.post("/api/v1/marketplace/subscribe", json=body, headers=headers)
        # Unsubscribe
        res = await client.post("/api/v1/marketplace/subscribe", json=body, headers=headers)
        assert res.status_code == 200
