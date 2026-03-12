"""Capital Drift & Liability Projection — 36-month forward simulation endpoint."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.services.capital_projection import compute_capital_projection

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ── Response schemas (snake_case → camelCase via alias_generator) ─────────────

class _CamelModel(BaseModel):
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ProjectionMonthSchema(_CamelModel):
    month: int
    projected_cost: float
    projected_value: float
    projected_roi: float
    projected_cei: float
    capital_liability: float
    ai_spend: float
    retirement_backlog: int
    governance_score: float
    capital_freed_cumulative: float
    missed_capital_freed: float


class ProjectionScenarioSchema(_CamelModel):
    label: str
    months: list[ProjectionMonthSchema]


class ScenariosSchema(_CamelModel):
    passive: ProjectionScenarioSchema
    governance: ProjectionScenarioSchema
    active: ProjectionScenarioSchema


class DriftDeltaSchema(_CamelModel):
    roi_drift_12m: float = Field(alias="roiDrift12m", serialization_alias="roiDrift12m")
    roi_drift_24m: float = Field(alias="roiDrift24m", serialization_alias="roiDrift24m")
    roi_drift_36m: float = Field(alias="roiDrift36m", serialization_alias="roiDrift36m")
    cost_drift_12m: float = Field(alias="costDrift12m", serialization_alias="costDrift12m")
    liability_12m: float = Field(alias="liability12m", serialization_alias="liability12m")
    liability_24m: float = Field(alias="liability24m", serialization_alias="liability24m")
    liability_36m: float = Field(alias="liability36m", serialization_alias="liability36m")


class LiabilityEstimateSchema(_CamelModel):
    total_passive_liability_36m: float = Field(alias="totalPassiveLiability36m", serialization_alias="totalPassiveLiability36m")
    total_governance_gap_36m: float = Field(alias="totalGovernanceGap36m", serialization_alias="totalGovernanceGap36m")
    capital_freed_active_36m: float = Field(alias="capitalFreedActive36m", serialization_alias="capitalFreedActive36m")
    ai_exposure_passive_36m: float = Field(alias="aiExposurePassive36m", serialization_alias="aiExposurePassive36m")


class CurrentSnapshotSchema(_CamelModel):
    total_cost: float
    total_value: float
    average_roi: float
    ai_spend: float
    decline_cost: float
    decision_velocity_days: float
    value_coverage_pct: float
    enforcement_rate: float
    retirement_backlog: int
    cei_score: float


class CapitalProjectionResponse(_CamelModel):
    scenarios: ScenariosSchema
    drift_delta: DriftDeltaSchema
    liability_estimate: LiabilityEstimateSchema
    current_snapshot: CurrentSnapshotSchema


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=CapitalProjectionResponse)
async def capital_projection(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:read")),
):
    """
    36-month deterministic projection under 3 governance scenarios.

    - **Passive**: No decisions approved, unchecked cost growth
    - **Governance**: Retirements + cost optimizations at current velocity
    - **Active Capital**: Full governance + AI kills + pricing + reallocation

    Returns scenario month-by-month arrays, drift deltas, liability estimates,
    and the current snapshot used to seed the simulation.
    """
    return await compute_capital_projection(org_id, db)
