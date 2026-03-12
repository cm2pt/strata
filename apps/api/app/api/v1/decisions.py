"""Decision workflow routes — list, create, update, approve/delay retirement, savings summary."""

import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.decision import (
    Decision,
    DecisionAction,
    DecisionComment,
    DecisionEconomicEffect,
    DecisionStatus,
    DecisionType,
)
from app.models.data_product import DataProduct, LifecycleStage
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.config import Notification, NotificationType
from app.models.user import User
from app.services.impact_verification import compute_impact_report, start_validation, VERIFIABLE_TYPES
from app.services.audit_service import log_action

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DecisionResponse(BaseModel):
    id: uuid.UUID
    type: str
    status: str
    product_id: uuid.UUID
    product_name: str
    title: str
    description: str
    initiated_by: str
    assigned_to: str
    assigned_to_title: str | None
    estimated_impact: float
    actual_impact: float | None
    impact_basis: str | None
    created_at: str
    updated_at: str
    resolved_at: str | None
    resolution: str | None
    # Capital impact fields
    capital_freed: float
    projected_savings_monthly: float
    projected_savings_annual: float
    delay_reason: str | None
    delayed_until: str | None
    # Impact verification fields
    impact_validation_status: str | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CreateDecisionRequest(BaseModel):
    type: str
    product_id: uuid.UUID
    title: str
    description: str
    assigned_to: str
    assigned_to_title: str | None = None
    estimated_impact: float = 0
    impact_basis: str | None = None
    projected_savings_monthly: float | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class UpdateDecisionRequest(BaseModel):
    status: str | None = None
    resolution: str | None = None
    actual_impact: float | None = None
    delay_reason: str | None = None
    delayed_until: str | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DelayRetirementRequest(BaseModel):
    delay_reason: str
    delayed_until: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CapitalFreedMonthItem(BaseModel):
    month: str
    amount: float
    cumulative: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class SavingsSummaryResponse(BaseModel):
    total_capital_freed_monthly: float
    total_capital_freed_annual: float
    capital_freed_by_month: list[CapitalFreedMonthItem]
    pending_retirements: int
    pending_estimated_savings: float
    approved_retirements: int
    decisions_this_quarter: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DecisionCommentResponse(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    comment: str
    created_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CreateCommentRequest(BaseModel):
    comment: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DecisionActionResponse(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    user_id: uuid.UUID
    action_type: str
    payload: str | None
    created_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DecisionEconomicEffectResponse(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    effect_type: str
    amount_usd_monthly: float
    amount_usd_annual: float
    confidence: float
    calc_explainer: str | None
    created_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(d: Decision) -> DecisionResponse:
    return DecisionResponse(
        id=d.id,
        type=d.type.value,
        status=d.status.value,
        product_id=d.product_id,
        product_name=d.product_name,
        title=d.title,
        description=d.description,
        initiated_by=d.initiated_by,
        assigned_to=d.assigned_to,
        assigned_to_title=d.assigned_to_title,
        estimated_impact=float(d.estimated_impact),
        actual_impact=float(d.actual_impact) if d.actual_impact is not None else None,
        impact_basis=d.impact_basis,
        created_at=d.created_at.isoformat(),
        updated_at=d.updated_at.isoformat(),
        resolved_at=d.resolved_at.isoformat() if d.resolved_at else None,
        resolution=d.resolution,
        capital_freed=float(d.capital_freed) if d.capital_freed else 0,
        projected_savings_monthly=float(d.projected_savings_monthly) if d.projected_savings_monthly else 0,
        projected_savings_annual=float(d.projected_savings_annual) if d.projected_savings_annual else 0,
        delay_reason=d.delay_reason,
        delayed_until=d.delayed_until.isoformat() if d.delayed_until else None,
        impact_validation_status=d.impact_validation_status,
    )


async def _approve_retirement_logic(decision: Decision, db: AsyncSession) -> Decision:
    """Core logic for approving a retirement decision: retire product, create capital event."""
    now = datetime.now(timezone.utc)
    savings = float(decision.estimated_impact) if decision.estimated_impact else 0

    # Update decision
    decision.status = DecisionStatus.approved
    decision.resolved_at = now
    decision.actual_impact = savings
    decision.capital_freed = savings
    decision.projected_savings_monthly = savings
    decision.projected_savings_annual = savings * 12

    # Retire the product
    result = await db.execute(
        select(DataProduct).where(DataProduct.id == decision.product_id)
    )
    product = result.scalar_one_or_none()
    if product:
        product.lifecycle_stage = LifecycleStage.retired
        product.retired_at = now
        product.capital_freed_monthly = savings

    # Create capital event
    capital_event = CapitalEvent(
        org_id=decision.org_id,
        decision_id=decision.id,
        product_id=decision.product_id,
        event_type=CapitalEventType.retirement_freed,
        amount=savings,
        description=f"Retirement of {decision.product_name}: freed ${savings:,.0f}/mo",
        effective_date=now.date(),
    )
    db.add(capital_event)

    # Create notification
    notification = Notification(
        org_id=decision.org_id,
        type=NotificationType.capital_freed,
        title=f"Capital freed: {decision.product_name} retired",
        description=f"${savings:,.0f}/mo freed from retirement of {decision.product_name}",
        product_id=decision.product_id,
        product_name=decision.product_name,
    )
    db.add(notification)

    # Start impact validation window
    await start_validation(decision, db)

    return decision


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[DecisionResponse])
async def list_decisions(
    db: DbSession,
    org_id: OrgId,
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    _user: User = Depends(require_permission("decisions:read")),
):
    """List decisions for the org with optional status/type filters."""
    q = select(Decision).where(Decision.org_id == org_id, Decision.deleted_at.is_(None))

    if status_filter:
        q = q.where(Decision.status == status_filter)
    if type_filter:
        q = q.where(Decision.type == type_filter)

    q = q.order_by(Decision.created_at.desc())
    result = await db.execute(q)
    decisions = result.scalars().all()
    return [_to_response(d) for d in decisions]


@router.post("/", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_decision(
    body: CreateDecisionRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:create")),
    x_idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
):
    """Create a new decision.

    Supports idempotency via the ``X-Idempotency-Key`` header.  If a decision
    with the same key already exists, the existing decision is returned instead
    of creating a duplicate.
    """
    # Idempotency check
    if x_idempotency_key:
        existing = await db.execute(
            select(Decision).where(
                Decision.idempotency_key == x_idempotency_key,
                Decision.org_id == org_id,
                Decision.deleted_at.is_(None),
            )
        )
        found = existing.scalar_one_or_none()
        if found:
            return _to_response(found)

    # Validate product exists in org
    product = await db.execute(
        select(DataProduct).where(DataProduct.id == body.product_id, DataProduct.org_id == org_id)
    )
    dp = product.scalar_one_or_none()
    if not dp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    projected_monthly = body.projected_savings_monthly or body.estimated_impact

    decision = Decision(
        org_id=org_id,
        type=DecisionType(body.type),
        product_id=body.product_id,
        product_name=dp.name,
        title=body.title,
        description=body.description,
        initiated_by=user.name,
        assigned_to=body.assigned_to,
        assigned_to_title=body.assigned_to_title,
        estimated_impact=body.estimated_impact,
        impact_basis=body.impact_basis,
        projected_savings_monthly=projected_monthly,
        projected_savings_annual=projected_monthly * 12,
        idempotency_key=x_idempotency_key,
    )
    db.add(decision)
    await db.flush()

    # Audit log
    await log_action(
        db,
        org_id=org_id,
        user_id=user.id,
        action="decision.created",
        entity_type="decision",
        entity_id=str(decision.id),
        metadata={"type": body.type, "product_id": str(body.product_id), "title": body.title},
    )

    await db.commit()
    await db.refresh(decision)
    return _to_response(decision)


@router.patch("/{decision_id}", response_model=DecisionResponse)
async def update_decision(
    decision_id: uuid.UUID,
    body: UpdateDecisionRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Update a decision's status, resolution, or actual_impact."""
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    if body.status is not None:
        new_status = DecisionStatus(body.status)
        decision.status = new_status

        if new_status == DecisionStatus.approved:
            decision.resolved_at = datetime.now(timezone.utc)
            # Auto-trigger retirement logic for retirement decisions
            if decision.type == DecisionType.retirement:
                await _approve_retirement_logic(decision, db)

        elif new_status == DecisionStatus.rejected:
            decision.resolved_at = datetime.now(timezone.utc)

        elif new_status == DecisionStatus.delayed:
            if body.delay_reason:
                decision.delay_reason = body.delay_reason
            if body.delayed_until:
                decision.delayed_until = datetime.fromisoformat(body.delayed_until)

    if body.resolution is not None:
        decision.resolution = body.resolution

    if body.actual_impact is not None:
        decision.actual_impact = body.actual_impact

    # Audit log
    await log_action(
        db,
        org_id=org_id,
        user_id=user.id,
        action=f"decision.{body.status or 'updated'}",
        entity_type="decision",
        entity_id=str(decision_id),
        metadata={
            "status": body.status,
            "resolution": body.resolution,
            "actual_impact": body.actual_impact,
        },
    )

    await db.commit()
    await db.refresh(decision)
    return _to_response(decision)


@router.post("/{decision_id}/approve-retirement", response_model=DecisionResponse)
async def approve_retirement(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Approve a retirement decision: retires the product, creates capital event, logs savings."""
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    if decision.type != DecisionType.retirement:
        raise HTTPException(status_code=400, detail="Decision is not a retirement type")

    if decision.status != DecisionStatus.under_review:
        raise HTTPException(status_code=400, detail="Decision is not under review")

    decision = await _approve_retirement_logic(decision, db)

    # Audit log
    await log_action(
        db,
        org_id=org_id,
        user_id=user.id,
        action="decision.retirement_approved",
        entity_type="decision",
        entity_id=str(decision_id),
        metadata={
            "product_id": str(decision.product_id),
            "product_name": decision.product_name,
            "capital_freed": float(decision.capital_freed) if decision.capital_freed else 0,
        },
    )

    await db.commit()
    await db.refresh(decision)
    return _to_response(decision)


@router.post("/{decision_id}/delay-retirement", response_model=DecisionResponse)
async def delay_retirement(
    decision_id: uuid.UUID,
    body: DelayRetirementRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Delay a retirement decision with a reason and target date."""
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    if decision.type != DecisionType.retirement:
        raise HTTPException(status_code=400, detail="Decision is not a retirement type")

    decision.status = DecisionStatus.delayed
    decision.delay_reason = body.delay_reason
    decision.delayed_until = datetime.fromisoformat(body.delayed_until)

    # Audit log
    await log_action(
        db,
        org_id=org_id,
        user_id=user.id,
        action="decision.retirement_delayed",
        entity_type="decision",
        entity_id=str(decision_id),
        metadata={
            "delay_reason": body.delay_reason,
            "delayed_until": body.delayed_until,
            "product_name": decision.product_name,
        },
    )

    await db.commit()
    await db.refresh(decision)
    return _to_response(decision)


@router.get("/savings-summary", response_model=SavingsSummaryResponse)
async def savings_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """Get cumulative savings summary across all capital events."""
    # Total capital freed from approved retirement/cost decisions
    freed_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type.in_([
                CapitalEventType.retirement_freed,
                CapitalEventType.cost_optimization,
            ]),
        )
    )
    total_freed_monthly = float(freed_result.scalar())

    # Capital freed grouped by month (for chart)
    # Reuse a single expression object so SQLAlchemy emits one bind parameter
    # (avoids PostgreSQL "must appear in GROUP BY" error with asyncpg)
    month_trunc = func.date_trunc("month", CapitalEvent.effective_date)
    monthly_result = await db.execute(
        select(
            month_trunc.label("month"),
            func.sum(CapitalEvent.amount).label("amount"),
        )
        .where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type.in_([
                CapitalEventType.retirement_freed,
                CapitalEventType.cost_optimization,
            ]),
        )
        .group_by(month_trunc)
        .order_by(month_trunc)
    )
    monthly_rows = monthly_result.all()

    cumulative = 0.0
    capital_freed_by_month = []
    for row in monthly_rows:
        amt = float(row.amount)
        cumulative += amt
        capital_freed_by_month.append(
            CapitalFreedMonthItem(
                month=row.month.strftime("%Y-%m") if hasattr(row.month, "strftime") else str(row.month)[:7],
                amount=amt,
                cumulative=cumulative,
            )
        )

    # Pending retirements
    pending_result = await db.execute(
        select(
            func.count(Decision.id),
            func.coalesce(func.sum(Decision.estimated_impact), 0),
        ).where(
            Decision.org_id == org_id,
            Decision.type == DecisionType.retirement,
            Decision.status == DecisionStatus.under_review,
            Decision.deleted_at.is_(None),
        )
    )
    pending_row = pending_result.one()
    pending_retirements = pending_row[0]
    pending_estimated_savings = float(pending_row[1])

    # Approved retirements count
    approved_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.type == DecisionType.retirement,
            Decision.status == DecisionStatus.approved,
            Decision.deleted_at.is_(None),
        )
    )
    approved_retirements = approved_result.scalar()

    # Decisions this quarter
    now = datetime.now(timezone.utc)
    quarter_start_month = ((now.month - 1) // 3) * 3 + 1
    quarter_start = datetime(now.year, quarter_start_month, 1, tzinfo=timezone.utc)
    quarter_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.created_at >= quarter_start,
            Decision.deleted_at.is_(None),
        )
    )
    decisions_this_quarter = quarter_result.scalar()

    return SavingsSummaryResponse(
        total_capital_freed_monthly=total_freed_monthly,
        total_capital_freed_annual=total_freed_monthly * 12,
        capital_freed_by_month=capital_freed_by_month,
        pending_retirements=pending_retirements,
        pending_estimated_savings=pending_estimated_savings,
        approved_retirements=approved_retirements,
        decisions_this_quarter=decisions_this_quarter,
    )


# ---------------------------------------------------------------------------
# Impact Verification
# ---------------------------------------------------------------------------

@router.get("/{decision_id}/impact-report")
async def get_impact_report(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """
    Get the impact verification report for a decision.
    Includes projected vs actual, cost trend, savings realized,
    variance %, confidence score, and narrative summary.
    """
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    if decision.status != DecisionStatus.approved:
        raise HTTPException(status_code=400, detail="Impact report only available for approved decisions")

    # Start validation if not already started
    if decision.impact_validation_status == "pending" and decision.type in VERIFIABLE_TYPES:
        await start_validation(decision, db)
        await db.commit()
        await db.refresh(decision)

    report = await compute_impact_report(decision, db)
    return report


@router.post("/run-validation-sweep")
async def run_validation_sweep_endpoint(
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """
    Run validation sweep across all approved decisions in validation window.
    Updates actual_savings_measured, variance, confidence, and status.
    """
    from app.services.impact_verification import run_validation_sweep
    results = await run_validation_sweep(org_id, db)
    return {"updated_count": len(results), "decisions": results}


# ---------------------------------------------------------------------------
# Decision Detail Sub-Resources
# ---------------------------------------------------------------------------

@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """Get a single decision by ID."""
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id, Decision.deleted_at.is_(None))
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    return _to_response(decision)


@router.get("/{decision_id}/comments", response_model=list[DecisionCommentResponse])
async def list_decision_comments(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """List comments on a decision, oldest first."""
    # Verify decision exists in org
    dec = await db.execute(
        select(Decision.id).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    if not dec.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    result = await db.execute(
        select(DecisionComment)
        .where(DecisionComment.decision_id == decision_id)
        .order_by(DecisionComment.created_at.asc())
    )
    comments = result.scalars().all()
    return [
        DecisionCommentResponse(
            id=c.id,
            decision_id=c.decision_id,
            user_id=c.user_id,
            user_name=c.user_name,
            comment=c.comment,
            created_at=c.created_at.isoformat(),
        )
        for c in comments
    ]


@router.post(
    "/{decision_id}/comments",
    response_model=DecisionCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_decision_comment(
    decision_id: uuid.UUID,
    body: CreateCommentRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Add a comment to a decision. Also creates an audit trail entry."""
    # Verify decision exists in org
    dec_result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    decision = dec_result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    comment = DecisionComment(
        decision_id=decision_id,
        user_id=user.id,
        user_name=user.name,
        comment=body.comment,
    )
    db.add(comment)

    # Audit trail entry
    action = DecisionAction(
        decision_id=decision_id,
        user_id=user.id,
        action_type="commented",
        payload=None,
    )
    db.add(action)

    await db.commit()
    await db.refresh(comment)

    return DecisionCommentResponse(
        id=comment.id,
        decision_id=comment.decision_id,
        user_id=comment.user_id,
        user_name=comment.user_name,
        comment=comment.comment,
        created_at=comment.created_at.isoformat(),
    )


@router.get("/{decision_id}/actions", response_model=list[DecisionActionResponse])
async def list_decision_actions(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """List audit trail actions for a decision, oldest first."""
    # Verify decision exists in org
    dec = await db.execute(
        select(Decision.id).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    if not dec.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    result = await db.execute(
        select(DecisionAction)
        .where(DecisionAction.decision_id == decision_id)
        .order_by(DecisionAction.created_at.asc())
    )
    actions = result.scalars().all()
    return [
        DecisionActionResponse(
            id=a.id,
            decision_id=a.decision_id,
            user_id=a.user_id,
            action_type=a.action_type,
            payload=a.payload,
            created_at=a.created_at.isoformat(),
        )
        for a in actions
    ]


@router.get(
    "/{decision_id}/economic-effects",
    response_model=list[DecisionEconomicEffectResponse],
)
async def list_decision_economic_effects(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("decisions:read")),
):
    """List economic effects attributed to a decision."""
    # Verify decision exists in org
    dec = await db.execute(
        select(Decision.id).where(Decision.id == decision_id, Decision.org_id == org_id)
    )
    if not dec.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    result = await db.execute(
        select(DecisionEconomicEffect)
        .where(DecisionEconomicEffect.decision_id == decision_id)
        .order_by(DecisionEconomicEffect.created_at.asc())
    )
    effects = result.scalars().all()
    return [
        DecisionEconomicEffectResponse(
            id=e.id,
            decision_id=e.decision_id,
            effect_type=e.effect_type,
            amount_usd_monthly=float(e.amount_usd_monthly),
            amount_usd_annual=float(e.amount_usd_annual),
            confidence=float(e.confidence),
            calc_explainer=e.calc_explainer,
            created_at=e.created_at.isoformat(),
        )
        for e in effects
    ]


@router.delete("/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_decision(
    decision_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Soft-delete a decision (sets deleted_at timestamp, does not remove from DB)."""
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.org_id == org_id, Decision.deleted_at.is_(None))
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    decision.deleted_at = datetime.now(timezone.utc)

    # Audit log
    await log_action(
        db,
        org_id=org_id,
        user_id=user.id,
        action="decision.soft_deleted",
        entity_type="decision",
        entity_id=str(decision_id),
        metadata={"product_name": decision.product_name, "title": decision.title},
    )

    await db.commit()
