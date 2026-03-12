"""Display configuration endpoint — returns UI threshold bands and defaults."""

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id
from app.models.config import PolicyConfig

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------- Response schemas ----------

class ROIBandsConfig(BaseModel):
    high: float
    healthy: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class TrustScoreBandsConfig(BaseModel):
    high: float
    medium: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ConfidenceScoreBandsConfig(BaseModel):
    green: int
    blue: int
    amber: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class AIRiskScoreBandsConfig(BaseModel):
    low: int
    medium: int
    high: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class PricingSimulationDefaultsConfig(BaseModel):
    markup: int
    base_fee: int
    per_query: float
    free_tier: int
    adoption_slider: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class TeamBudgetThresholdConfig(BaseModel):
    amount: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DisplayConfigResponse(BaseModel):
    roi_bands: ROIBandsConfig
    trust_score_bands: TrustScoreBandsConfig
    confidence_score_bands: ConfidenceScoreBandsConfig
    ai_risk_score_bands: AIRiskScoreBandsConfig
    pricing_simulation_defaults: PricingSimulationDefaultsConfig
    team_budget_threshold: TeamBudgetThresholdConfig

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------- Hardcoded defaults (used when DB row missing) ----------

_DEFAULTS: dict[str, dict] = {
    "Display — ROI Bands": {"high": 3.0, "healthy": 1.0},
    "Display — Trust Score Bands": {"high": 0.9, "medium": 0.7},
    "Display — Confidence Score Bands": {"green": 80, "blue": 60, "amber": 40},
    "Display — AI Risk Score Bands": {"low": 70, "medium": 50, "high": 30},
    "Display — Pricing Simulation Defaults": {
        "markup": 25,
        "baseFee": 500,
        "perQuery": 1.25,
        "freeTier": 500,
        "adoptionSlider": 12,
    },
    "Display — Team Budget Threshold": {"amount": 4500},
}

CONFIG_NAMES = list(_DEFAULTS.keys())


def _parse_config(name: str, raw: str | None) -> dict:
    """Parse a JSON config string, falling back to defaults."""
    if raw:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            pass
    return _DEFAULTS[name]


@router.get("/", response_model=DisplayConfigResponse)
async def get_display_config(db: DbSession, org_id: OrgId):
    # Fetch all 6 display config rows in one query
    result = await db.execute(
        select(PolicyConfig.name, PolicyConfig.current_value).where(
            PolicyConfig.org_id == org_id,
            PolicyConfig.name.in_(CONFIG_NAMES),
        )
    )
    rows = {name: value for name, value in result.all()}

    roi = _parse_config("Display — ROI Bands", rows.get("Display — ROI Bands"))
    trust = _parse_config("Display — Trust Score Bands", rows.get("Display — Trust Score Bands"))
    confidence = _parse_config("Display — Confidence Score Bands", rows.get("Display — Confidence Score Bands"))
    ai_risk = _parse_config("Display — AI Risk Score Bands", rows.get("Display — AI Risk Score Bands"))
    pricing = _parse_config("Display — Pricing Simulation Defaults", rows.get("Display — Pricing Simulation Defaults"))
    budget = _parse_config("Display — Team Budget Threshold", rows.get("Display — Team Budget Threshold"))

    return DisplayConfigResponse(
        roi_bands=ROIBandsConfig(**roi),
        trust_score_bands=TrustScoreBandsConfig(**trust),
        confidence_score_bands=ConfidenceScoreBandsConfig(**confidence),
        ai_risk_score_bands=AIRiskScoreBandsConfig(**ai_risk),
        pricing_simulation_defaults=PricingSimulationDefaultsConfig(
            markup=pricing["markup"],
            base_fee=pricing["baseFee"],
            per_query=pricing["perQuery"],
            free_tier=pricing["freeTier"],
            adoption_slider=pricing["adoptionSlider"],
        ),
        team_budget_threshold=TeamBudgetThresholdConfig(**budget),
    )
