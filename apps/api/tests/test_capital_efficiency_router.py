"""Tests for the /capital-efficiency router — CEI score endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token

_MOCK_CEI = {
    "score": 62.5,
    "components": {
        "roi_coverage": {"value": 0.75, "weight": 0.25, "weighted": 18.75},
        "action_rate": {"value": 0.50, "weight": 0.20, "weighted": 10.0},
        "savings_accuracy": {"value": 0.80, "weight": 0.15, "weighted": 12.0},
        "capital_freed_ratio": {"value": 0.30, "weight": 0.15, "weighted": 4.5},
        "value_governance": {"value": 0.65, "weight": 0.15, "weighted": 9.75},
        "ai_exposure": {"value": 0.50, "weight": 0.10, "weighted": 5.0},
    },
    "trend": [],
}


class TestCapitalEfficiency:
    @pytest.mark.asyncio
    async def test_score(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        with patch(
            "app.api.v1.capital_efficiency.compute_capital_efficiency",
            new_callable=AsyncMock,
            return_value=_MOCK_CEI,
        ):
            res = await client.get(
                "/api/v1/capital-efficiency/",
                headers=auth_headers(token),
            )
        assert res.status_code == 200
        data = res.json()
        assert "score" in data
        assert "components" in data

    @pytest.mark.asyncio
    async def test_score_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/capital-efficiency/")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_score_consumer_forbidden(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, role="consumer")
        res = await client.get(
            "/api/v1/capital-efficiency/",
            headers=auth_headers(token),
        )
        assert res.status_code == 403
