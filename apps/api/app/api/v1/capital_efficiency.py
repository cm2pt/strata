"""Capital Efficiency Score — org-level KPI endpoint."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.services.capital_efficiency import compute_capital_efficiency

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


@router.get("/")
async def capital_efficiency_score(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:read")),
):
    """
    Capital Efficiency Score (0-100) for the org.

    6 components with configurable weights (from policy_configs "CEI — Component Weights"):
    - ROI coverage: % of products with ROI > 1
    - Action rate: % of retirement candidates actioned
    - Savings accuracy: projected vs actual savings variance
    - Capital freed ratio: capital freed / total data spend
    - Value governance: % of products with current value declarations
    - AI exposure: % of monthly spend in well-governed products
    """
    return await compute_capital_efficiency(org_id, db)
