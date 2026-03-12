"""Internal Pricing Activation — activate, version, and track pricing policies."""

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.pricing import PricingPolicy, PricingPolicyStatus
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.data_product import DataProduct
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ActivatePricingRequest(BaseModel):
    product_id: uuid.UUID
    model: str
    params: dict[str, float] = {}
    projected_revenue: float = 0
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class UpdatePolicyRequest(BaseModel):
    actual_revenue: float | None = None
    post_activation_usage: int | None = None
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class PricingPolicyResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    version: int
    model: str
    params: str
    status: str
    activated_at: str | None
    activated_by: str | None
    projected_revenue: float
    actual_revenue: float | None
    pre_activation_usage: int
    post_activation_usage: int | None
    created_at: str
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


def _to_response(p: PricingPolicy) -> PricingPolicyResponse:
    return PricingPolicyResponse(
        id=p.id,
        product_id=p.product_id,
        product_name=p.product_name,
        version=p.version,
        model=p.model,
        params=p.params,
        status=p.status.value,
        activated_at=p.activated_at.isoformat() if p.activated_at else None,
        activated_by=p.activated_by,
        projected_revenue=float(p.projected_revenue) if p.projected_revenue else 0,
        actual_revenue=float(p.actual_revenue) if p.actual_revenue is not None else None,
        pre_activation_usage=p.pre_activation_usage or 0,
        post_activation_usage=p.post_activation_usage,
        created_at=p.created_at.isoformat(),
    )


@router.post("/activate", response_model=PricingPolicyResponse, status_code=status.HTTP_201_CREATED)
async def activate_pricing_policy(
    body: ActivatePricingRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("pricing:activate")),
):
    """Activate a pricing policy on a data product. Retires any existing active policy."""
    # Validate product
    result = await db.execute(
        select(DataProduct).where(DataProduct.id == body.product_id, DataProduct.org_id == org_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Data product not found")

    # Retire existing active policy for this product
    existing_result = await db.execute(
        select(PricingPolicy).where(
            PricingPolicy.product_id == body.product_id,
            PricingPolicy.status == PricingPolicyStatus.active,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.status = PricingPolicyStatus.retired

    # Get next version
    version_result = await db.execute(
        select(func.coalesce(func.max(PricingPolicy.version), 0)).where(
            PricingPolicy.product_id == body.product_id
        )
    )
    next_version = version_result.scalar() + 1

    now = datetime.now(timezone.utc)

    # Create new active policy
    policy = PricingPolicy(
        org_id=org_id,
        product_id=body.product_id,
        product_name=product.name,
        version=next_version,
        model=body.model,
        params=json.dumps(body.params),
        status=PricingPolicyStatus.active,
        activated_at=now,
        activated_by=user.name,
        projected_revenue=body.projected_revenue,
        pre_activation_usage=product.monthly_consumers,
    )
    db.add(policy)
    await db.flush()

    # Create a decision record
    decision = Decision(
        org_id=org_id,
        type=DecisionType.pricing_activation,
        status=DecisionStatus.approved,
        product_id=body.product_id,
        product_name=product.name,
        title=f"Pricing activated: {body.model} on {product.name}",
        description=f"Pricing policy v{next_version} ({body.model}) activated on {product.name}. Projected revenue: ${body.projected_revenue:,.0f}/mo.",
        initiated_by=user.name,
        assigned_to=user.name,
        estimated_impact=body.projected_revenue,
        actual_impact=0,
        capital_freed=0,
        projected_savings_monthly=body.projected_revenue,
        projected_savings_annual=body.projected_revenue * 12,
        resolved_at=now,
    )
    db.add(decision)
    await db.flush()

    policy.decision_id = decision.id

    # Create capital event
    event = CapitalEvent(
        org_id=org_id,
        decision_id=decision.id,
        product_id=body.product_id,
        event_type=CapitalEventType.pricing_revenue,
        amount=body.projected_revenue,
        description=f"Pricing policy ({body.model}) activated on {product.name}: projected ${body.projected_revenue:,.0f}/mo revenue",
        effective_date=now.date(),
    )
    db.add(event)

    await db.commit()
    await db.refresh(policy)
    return _to_response(policy)


@router.get("/policies/active", response_model=list[PricingPolicyResponse])
async def list_active_policies(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:read")),
):
    """List all active pricing policies for the org."""
    result = await db.execute(
        select(PricingPolicy).where(
            PricingPolicy.org_id == org_id,
            PricingPolicy.status == PricingPolicyStatus.active,
        ).order_by(desc(PricingPolicy.activated_at))
    )
    return [_to_response(p) for p in result.scalars().all()]


@router.get("/policies", response_model=list[PricingPolicyResponse])
async def list_policies(
    db: DbSession,
    org_id: OrgId,
    product_id: uuid.UUID | None = Query(None, alias="productId"),
    _user: User = Depends(require_permission("capital:read")),
):
    """List pricing policies, optionally filtered by product."""
    q = select(PricingPolicy).where(PricingPolicy.org_id == org_id)
    if product_id:
        q = q.where(PricingPolicy.product_id == product_id)
    q = q.order_by(desc(PricingPolicy.version))
    result = await db.execute(q)
    return [_to_response(p) for p in result.scalars().all()]


@router.patch("/policies/{policy_id}", response_model=PricingPolicyResponse)
async def update_policy(
    policy_id: uuid.UUID,
    body: UpdatePolicyRequest,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("pricing:activate")),
):
    """Update actual revenue or post-activation usage on a policy."""
    result = await db.execute(
        select(PricingPolicy).where(PricingPolicy.id == policy_id, PricingPolicy.org_id == org_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if body.actual_revenue is not None:
        policy.actual_revenue = body.actual_revenue
    if body.post_activation_usage is not None:
        policy.post_activation_usage = body.post_activation_usage

    await db.commit()
    await db.refresh(policy)
    return _to_response(policy)
