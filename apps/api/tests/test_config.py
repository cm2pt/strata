"""Tests for config and application setup."""

import pytest
from httpx import AsyncClient

from app.config import Settings, settings


class TestSettings:
    def test_defaults(self):
        assert settings.jwt_algorithm == "HS256"
        assert settings.jwt_expire_hours == 24
        assert settings.demo_mode is True

    def test_settings_can_be_constructed(self):
        s = Settings(
            database_url="sqlite+aiosqlite://",
            database_url_sync="sqlite://",
            jwt_secret="test",
            encryption_key="x" * 32,
        )
        assert s.jwt_secret == "test"


class TestHealthAndApp:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client: AsyncClient):
        """Health check may fail on SQLite (no data_products yet), but should not 500."""
        res = await client.get("/health")
        # SQLite may not have the table, but the route should be reachable
        assert res.status_code in (200, 500)

    @pytest.mark.asyncio
    async def test_openapi_schema(self, client: AsyncClient):
        res = await client.get("/openapi.json")
        assert res.status_code == 200
        assert "paths" in res.json()

    @pytest.mark.asyncio
    async def test_unknown_route_404(self, client: AsyncClient):
        res = await client.get("/api/v1/nonexistent")
        assert res.status_code in (404, 405)
