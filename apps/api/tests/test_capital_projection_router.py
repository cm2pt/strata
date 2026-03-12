"""Tests for the /capital-projection router — 36-month projection endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, make_token


# Mock projection data matching the Pydantic response models
_MOCK_PROJECTION = {
    "scenarios": {
        "passive": {
            "label": "Passive",
            "months": [
                {
                    "month": 1,
                    "projected_cost": 10000,
                    "projected_value": 8000,
                    "projected_roi": 0.8,
                    "projected_cei": 45,
                    "capital_liability": 2000,
                    "ai_spend": 500,
                    "retirement_backlog": 3,
                    "governance_score": 40,
                    "capital_freed_cumulative": 0,
                    "missed_capital_freed": 1000,
                }
            ],
        },
        "governance": {
            "label": "Governance",
            "months": [
                {
                    "month": 1,
                    "projected_cost": 9500,
                    "projected_value": 8500,
                    "projected_roi": 0.89,
                    "projected_cei": 55,
                    "capital_liability": 1000,
                    "ai_spend": 400,
                    "retirement_backlog": 2,
                    "governance_score": 60,
                    "capital_freed_cumulative": 500,
                    "missed_capital_freed": 500,
                }
            ],
        },
        "active": {
            "label": "Active Capital",
            "months": [
                {
                    "month": 1,
                    "projected_cost": 8000,
                    "projected_value": 9000,
                    "projected_roi": 1.12,
                    "projected_cei": 70,
                    "capital_liability": 0,
                    "ai_spend": 200,
                    "retirement_backlog": 0,
                    "governance_score": 85,
                    "capital_freed_cumulative": 2000,
                    "missed_capital_freed": 0,
                }
            ],
        },
    },
    "drift_delta": {
        "roi_drift_12m": -0.15,
        "roi_drift_24m": -0.25,
        "roi_drift_36m": -0.35,
        "cost_drift_12m": 0.10,
        "liability_12m": 12000,
        "liability_24m": 28000,
        "liability_36m": 48000,
    },
    "liability_estimate": {
        "total_passive_liability_36m": 48000,
        "total_governance_gap_36m": 20000,
        "capital_freed_active_36m": 36000,
        "ai_exposure_passive_36m": 18000,
    },
    "current_snapshot": {
        "total_cost": 10000,
        "total_value": 8000,
        "average_roi": 0.8,
        "ai_spend": 500,
        "decline_cost": 3000,
        "decision_velocity_days": 14.5,
        "value_coverage_pct": 0.65,
        "enforcement_rate": 0.30,
        "retirement_backlog": 3,
        "cei_score": 45,
    },
}


class TestCapitalProjection:
    @pytest.mark.asyncio
    async def test_projection_success(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        with patch(
            "app.api.v1.capital_projection.compute_capital_projection",
            new_callable=AsyncMock,
            return_value=_MOCK_PROJECTION,
        ):
            res = await client.get(
                "/api/v1/capital-projection/",
                headers=auth_headers(token),
            )
        assert res.status_code == 200
        data = res.json()
        # Top-level keys should be camelCase
        assert "scenarios" in data
        assert "driftDelta" in data
        assert "liabilityEstimate" in data
        assert "currentSnapshot" in data

    @pytest.mark.asyncio
    async def test_projection_camel_case_keys(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        with patch(
            "app.api.v1.capital_projection.compute_capital_projection",
            new_callable=AsyncMock,
            return_value=_MOCK_PROJECTION,
        ):
            res = await client.get(
                "/api/v1/capital-projection/",
                headers=auth_headers(token),
            )
        data = res.json()
        snapshot = data["currentSnapshot"]
        assert "averageRoi" in snapshot
        assert "totalCost" in snapshot
        assert "ceiScore" in snapshot
        # Drift delta uses lowercase m for numeric suffixes
        drift = data["driftDelta"]
        assert "roiDrift12m" in drift
        assert "liability36m" in drift

    @pytest.mark.asyncio
    async def test_projection_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/capital-projection/")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_projection_consumer_forbidden(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, role="consumer")
        res = await client.get(
            "/api/v1/capital-projection/",
            headers=auth_headers(token),
        )
        assert res.status_code == 403
