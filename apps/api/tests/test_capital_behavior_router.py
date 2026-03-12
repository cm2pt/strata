"""Tests for the /capital-behavior router — governance behavior metrics."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token

_MOCK_BEHAVIOR = {
    "avg_decision_velocity_days": 12.5,
    "value_declaration_coverage_pct": 0.72,
    "review_overdue_pct": 0.15,
    "enforcement_trigger_rate": 0.28,
    "impact_confirmation_rate": 0.60,
    "governance_health_score": 68.0,
}


class TestCapitalBehavior:
    @pytest.mark.asyncio
    async def test_behavior_metrics(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        with patch(
            "app.api.v1.capital_behavior.compute_capital_behavior",
            new_callable=AsyncMock,
            return_value=_MOCK_BEHAVIOR,
        ):
            res = await client.get(
                "/api/v1/capital-behavior/",
                headers=auth_headers(token),
            )
        assert res.status_code == 200
        data = res.json()
        # camelCase keys
        assert "avgDecisionVelocityDays" in data
        assert "governanceHealthScore" in data

    @pytest.mark.asyncio
    async def test_behavior_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/capital-behavior/")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_behavior_consumer_forbidden(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, role="consumer")
        res = await client.get(
            "/api/v1/capital-behavior/",
            headers=auth_headers(token),
        )
        assert res.status_code == 403
