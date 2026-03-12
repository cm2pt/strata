"""Enforcement Triggers — run automated governance rules."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.user import User
from app.services.enforcement_triggers import run_enforcement_sweep

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


@router.post("/run-sweep")
async def run_enforcement(
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:create")),
):
    """
    Run the enforcement trigger sweep for the org.

    Checks all non-retired products against rules:
    - ROI < 0.5x for 3 consecutive months → low_roi_review decision
    - Usage decay > 60% sustained 90 days → retirement decision
    - Cost spike > 40% MoM → cost_investigation decision

    Creates decisions, notifications, and audit events automatically.
    """
    results = await run_enforcement_sweep(org_id, db, initiator=user.name)
    return results
