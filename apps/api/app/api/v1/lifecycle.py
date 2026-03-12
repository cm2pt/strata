"""Lifecycle routes — returns raw data products + transitions for frontend rendering."""

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.data_product import DataProduct, LifecycleStage
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Response schemas — lightweight product item matching frontend DataProduct
# ---------------------------------------------------------------------------

class OwnerBrief(BaseModel):
    id: str
    name: str
    title: str | None = None
    team: str = ""

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class LifecycleProductItem(BaseModel):
    id: str
    name: str
    domain: str
    business_unit: str
    owner: OwnerBrief
    platform: str
    lifecycle_stage: str
    monthly_cost: float
    composite_value: float
    roi: float | None
    roi_band: str | None
    monthly_consumers: int
    cost_trend: float
    usage_trend: float
    trust_score: float
    is_retirement_candidate: bool
    has_cost_spike: bool
    has_usage_decline: bool
    peak_consumers: int = 0
    created_at: str
    updated_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/overview")
async def lifecycle_overview(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("lifecycle:read")),
) -> dict[str, Any]:
    """Return raw data products + transitions. Frontend computes aggregates."""
    result = await db.execute(
        select(DataProduct)
        .where(DataProduct.org_id == org_id)
        .options(selectinload(DataProduct.owner))
    )
    products = result.scalars().all()

    # Build product list matching frontend DataProduct shape
    data_products = [
        LifecycleProductItem(
            id=str(p.id),
            name=p.name,
            domain=p.domain,
            business_unit=p.business_unit,
            owner=OwnerBrief(
                id=str(p.owner.id),
                name=p.owner.name,
                title=p.owner.title,
                team="",
            ),
            platform=p.platform.value,
            lifecycle_stage=p.lifecycle_stage.value,
            monthly_cost=float(p.monthly_cost),
            composite_value=float(p.composite_value),
            roi=float(p.roi) if p.roi is not None else None,
            roi_band=p.roi_band.value if p.roi_band else None,
            monthly_consumers=p.monthly_consumers,
            cost_trend=float(p.cost_trend),
            usage_trend=float(p.usage_trend),
            trust_score=float(p.trust_score),
            is_retirement_candidate=p.is_retirement_candidate,
            has_cost_spike=p.has_cost_spike,
            has_usage_decline=p.has_usage_decline,
            peak_consumers=p.peak_consumers,
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        ).model_dump(by_alias=True)
        for p in products
    ]

    # Lifecycle transitions — heuristic from stage counts
    stage_map: dict[str, int] = {}
    for p in products:
        stage = p.lifecycle_stage.value
        stage_map[stage] = stage_map.get(stage, 0) + 1

    stage_order = ["draft", "active", "growth", "mature", "decline", "retired"]
    lifecycle_transitions = []
    for i in range(len(stage_order) - 1):
        from_stage = stage_order[i]
        to_stage = stage_order[i + 1]
        count = stage_map.get(to_stage, 0)
        if count > 0:
            # Frontend LifecycleTransition expects "from" and "to" field names
            lifecycle_transitions.append({
                "from": from_stage,
                "to": to_stage,
                "count": count,
            })

    return {"dataProducts": data_products, "lifecycleTransitions": lifecycle_transitions}
