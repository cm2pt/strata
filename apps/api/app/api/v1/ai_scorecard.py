"""AI Project Kill Switch — scorecard computation, flagging, and kill workflow."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.ai_scorecard import AIProjectScorecard, AIProjectRiskLevel
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.config import PolicyConfig, PolicyCategory, Notification, NotificationType
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ScorecardResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    cost_score: float
    value_score: float
    confidence_score: float
    roi_score: float
    dependency_risk_score: float
    composite_score: float
    risk_level: str
    monthly_cost: float
    monthly_value: float
    roi: float | None
    flagged_for_review: bool
    decision_id: uuid.UUID | None
    reviewed_at: str | None
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


def _compute_scores(product: DataProduct, median_cost: float) -> dict:
    """Compute AI scorecard dimensions for a product."""
    mc = float(product.monthly_cost) if product.monthly_cost else 0
    cv = float(product.composite_value) if product.composite_value else 0
    roi = float(product.roi) if product.roi else 0
    coverage = float(product.cost_coverage) if product.cost_coverage else 0
    trust = float(product.trust_score) if product.trust_score else 0
    downstream = (product.downstream_products or 0) + (product.downstream_models or 0) + (product.downstream_dashboards or 0)

    # Cost score: inverse normalized (high cost = low score)
    cost_score = max(0, min(100, 100 - (mc / max(median_cost * 2, 1)) * 100)) if median_cost > 0 else 50

    # Value score: value/cost ratio, scaled
    value_ratio = cv / max(mc, 1) if mc > 0 else 0
    value_score = max(0, min(100, value_ratio * 30))

    # Confidence score: coverage * trust * 100
    confidence_score = max(0, min(100, coverage * trust * 100))

    # ROI score: direct scaling (ROI of 2.0 = 66, ROI of 3.0 = 100)
    roi_score = max(0, min(100, roi * 33.3)) if roi else 0

    # Dependency risk: more downstream = less risky to keep (higher score)
    dependency_risk_score = max(0, min(100, downstream * 10 + 20))

    # Composite: weighted average
    composite = (
        cost_score * 0.20 +
        value_score * 0.25 +
        confidence_score * 0.15 +
        roi_score * 0.25 +
        dependency_risk_score * 0.15
    )

    # Risk level
    if composite < 30:
        risk_level = AIProjectRiskLevel.critical
    elif composite < 50:
        risk_level = AIProjectRiskLevel.high
    elif composite < 70:
        risk_level = AIProjectRiskLevel.medium
    else:
        risk_level = AIProjectRiskLevel.low

    return {
        "cost_score": round(cost_score, 2),
        "value_score": round(value_score, 2),
        "confidence_score": round(confidence_score, 2),
        "roi_score": round(roi_score, 2),
        "dependency_risk_score": round(dependency_risk_score, 2),
        "composite_score": round(composite, 2),
        "risk_level": risk_level,
        "monthly_cost": mc,
        "monthly_value": cv,
        "roi": roi if roi else None,
    }


@router.get("/products", response_model=list[ScorecardResponse])
async def list_scorecards(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("ai:read")),
):
    """Get AI project scorecards for all products, computed dynamically."""
    # Get all products
    result = await db.execute(
        select(DataProduct).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    products = result.scalars().all()

    if not products:
        return []

    # Compute median cost for normalization
    costs = [float(p.monthly_cost) for p in products if p.monthly_cost]
    median_cost = sorted(costs)[len(costs) // 2] if costs else 0

    # Get threshold from policy config
    threshold_result = await db.execute(
        select(PolicyConfig).where(
            PolicyConfig.org_id == org_id,
            PolicyConfig.name == "AI Project Review Threshold",
        )
    )
    threshold_config = threshold_result.scalar_one_or_none()
    threshold = float(threshold_config.current_value) if threshold_config else 50.0

    # Get existing scorecards for decision_id linkage
    existing_result = await db.execute(
        select(AIProjectScorecard).where(AIProjectScorecard.org_id == org_id)
    )
    existing_map = {str(s.product_id): s for s in existing_result.scalars().all()}

    scorecards = []
    for product in products:
        scores = _compute_scores(product, median_cost)
        existing = existing_map.get(str(product.id))

        scorecards.append(ScorecardResponse(
            id=existing.id if existing else uuid.uuid4(),
            product_id=product.id,
            product_name=product.name,
            flagged_for_review=scores["composite_score"] < threshold or (existing.flagged_for_review if existing else False),
            decision_id=existing.decision_id if existing else None,
            reviewed_at=existing.reviewed_at.isoformat() if existing and existing.reviewed_at else None,
            **scores,
        ))

    # Sort by composite score ascending (worst first)
    scorecards.sort(key=lambda s: s.composite_score)
    return scorecards


@router.post("/{product_id}/flag", response_model=ScorecardResponse)
async def flag_for_review(
    product_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("ai:flag")),
):
    """Flag an AI project for executive review, creating a decision."""
    result = await db.execute(
        select(DataProduct).where(DataProduct.id == product_id, DataProduct.org_id == org_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Compute scores
    costs_result = await db.execute(
        select(func.percentile_cont(0.5).within_group(DataProduct.monthly_cost)).where(
            DataProduct.org_id == org_id, DataProduct.lifecycle_stage != LifecycleStage.retired
        )
    )
    median_cost = float(costs_result.scalar() or 0)
    scores = _compute_scores(product, median_cost)

    # Create decision
    decision = Decision(
        org_id=org_id,
        type=DecisionType.ai_project_review,
        status=DecisionStatus.under_review,
        product_id=product_id,
        product_name=product.name,
        title=f"AI Kill Switch: {product.name}",
        description=f"{product.name} flagged for executive review. Risk level: {scores['risk_level'].value}. Composite score: {scores['composite_score']}/100. Monthly cost: ${scores['monthly_cost']:,.0f}.",
        initiated_by=user.name,
        assigned_to=product.owner.name if hasattr(product, 'owner') and product.owner else user.name,
        estimated_impact=scores["monthly_cost"],
        projected_savings_monthly=scores["monthly_cost"],
        projected_savings_annual=scores["monthly_cost"] * 12,
    )
    db.add(decision)
    await db.flush()

    # Upsert scorecard
    existing_result = await db.execute(
        select(AIProjectScorecard).where(
            AIProjectScorecard.product_id == product_id,
            AIProjectScorecard.org_id == org_id,
        )
    )
    scorecard = existing_result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if scorecard:
        scorecard.flagged_for_review = True
        scorecard.decision_id = decision.id
        for k, v in scores.items():
            setattr(scorecard, k, v)
    else:
        scorecard = AIProjectScorecard(
            org_id=org_id,
            product_id=product_id,
            product_name=product.name,
            flagged_for_review=True,
            decision_id=decision.id,
            **scores,
        )
        db.add(scorecard)

    # Notification
    db.add(Notification(
        org_id=org_id,
        type=NotificationType.ai_project_flagged,
        title=f"AI project flagged: {product.name}",
        description=f"Risk level: {scores['risk_level'].value}. Score: {scores['composite_score']}/100.",
        product_id=product_id,
        product_name=product.name,
    ))

    await db.commit()
    await db.refresh(scorecard)

    return ScorecardResponse(
        id=scorecard.id,
        product_id=scorecard.product_id,
        product_name=scorecard.product_name,
        flagged_for_review=scorecard.flagged_for_review,
        decision_id=scorecard.decision_id,
        reviewed_at=scorecard.reviewed_at.isoformat() if scorecard.reviewed_at else None,
        **scores,
    )


@router.post("/{product_id}/kill", response_model=ScorecardResponse)
async def kill_project(
    product_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("ai:kill_execute")),
):
    """Execute the kill switch: retire the product, free capital, log event."""
    result = await db.execute(
        select(DataProduct).where(DataProduct.id == product_id, DataProduct.org_id == org_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc)
    savings = float(product.monthly_cost) if product.monthly_cost else 0

    # Get or create scorecard
    sc_result = await db.execute(
        select(AIProjectScorecard).where(
            AIProjectScorecard.product_id == product_id,
            AIProjectScorecard.org_id == org_id,
        )
    )
    scorecard = sc_result.scalar_one_or_none()

    # If there's a linked decision, approve it
    if scorecard and scorecard.decision_id:
        dec_result = await db.execute(select(Decision).where(Decision.id == scorecard.decision_id))
        decision = dec_result.scalar_one_or_none()
        if decision:
            decision.status = DecisionStatus.approved
            decision.resolved_at = now
            decision.actual_impact = savings
            decision.capital_freed = savings
    else:
        # Create new approved decision
        decision = Decision(
            org_id=org_id,
            type=DecisionType.ai_project_review,
            status=DecisionStatus.approved,
            product_id=product_id,
            product_name=product.name,
            title=f"AI Kill: {product.name} retired",
            description=f"AI project killed via scorecard. Freed ${savings:,.0f}/mo.",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=savings,
            actual_impact=savings,
            capital_freed=savings,
            projected_savings_monthly=savings,
            projected_savings_annual=savings * 12,
            resolved_at=now,
        )
        db.add(decision)
        await db.flush()

    # Retire product
    product.lifecycle_stage = LifecycleStage.retired
    product.retired_at = now
    product.capital_freed_monthly = savings

    # Create capital event
    db.add(CapitalEvent(
        org_id=org_id,
        decision_id=decision.id if decision else scorecard.decision_id,
        product_id=product_id,
        event_type=CapitalEventType.ai_spend_reduced,
        amount=savings,
        description=f"AI project {product.name} killed: freed ${savings:,.0f}/mo",
        effective_date=now.date(),
    ))

    # Update scorecard
    if scorecard:
        scorecard.reviewed_at = now

    await db.commit()

    # Recompute scores for response
    costs_result = await db.execute(
        select(func.percentile_cont(0.5).within_group(DataProduct.monthly_cost)).where(
            DataProduct.org_id == org_id, DataProduct.lifecycle_stage != LifecycleStage.retired
        )
    )
    median_cost = float(costs_result.scalar() or 0)
    scores = _compute_scores(product, median_cost)

    return ScorecardResponse(
        id=scorecard.id if scorecard else uuid.uuid4(),
        product_id=product_id,
        product_name=product.name,
        flagged_for_review=True,
        decision_id=decision.id if decision else None,
        reviewed_at=now.isoformat(),
        **scores,
    )
