"""Capital Behavior Metrics — governance hygiene indicators endpoint."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.services.capital_behavior import compute_capital_behavior

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


class CapitalBehaviorResponse(BaseModel):
    avg_decision_velocity_days: float
    value_declaration_coverage_pct: float
    review_overdue_pct: float
    enforcement_trigger_rate: float
    impact_confirmation_rate: float
    governance_health_score: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


@router.get("/", response_model=CapitalBehaviorResponse)
async def get_capital_behavior(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:read")),
):
    """
    Governance behavior metrics for the org.

    5 metrics computed from existing data:
    - Decision velocity: avg days from creation to resolution
    - Value declaration coverage: % of products with value declarations
    - Review overdue rate: % of declarations past next_review
    - Enforcement trigger rate: % of products flagged by automated rules
    - Impact confirmation rate: % of approved decisions with confirmed impact
    - Governance health score: normalized composite (0-100)
    """
    result = await compute_capital_behavior(org_id, db)
    return CapitalBehaviorResponse(**result)
