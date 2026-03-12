"""Capital Impact Dashboard — aggregated view of all capital decisions and financial effects."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus
from app.models.pricing import PricingPolicy, PricingPolicyStatus
from app.models.time_series import PortfolioMonthly
from app.models.user import User

# Canonical "capital freed" event types — used consistently across all surfaces (R4)
_FREED_EVENT_TYPES = [CapitalEventType.retirement_freed, CapitalEventType.cost_optimization]

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


class CapitalFreedMonthItem(BaseModel):
    month: str
    amount: float
    cumulative: float
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CapitalByTypeItem(BaseModel):
    type: str
    amount: float
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CapitalEventItem(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    product_id: uuid.UUID | None
    event_type: str
    amount: float
    description: str
    effective_date: str
    created_at: str
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CapitalImpactSummaryResponse(BaseModel):
    total_capital_freed: float
    total_capital_freed_annual: float
    budget_reallocated: float
    ai_spend_reduced: float
    portfolio_roi_delta: float
    portfolio_roi_current: float
    portfolio_roi_previous: float
    decisions_executed: int
    decisions_under_review: int
    active_pricing_policies: int
    pricing_revenue_total: float
    capital_freed_by_month: list[CapitalFreedMonthItem]
    capital_by_type: list[CapitalByTypeItem]
    recent_events: list[CapitalEventItem]
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


@router.get("/summary", response_model=CapitalImpactSummaryResponse)
async def capital_impact_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:read")),
):
    """Aggregated capital impact across all workflows."""

    # Total capital freed (retirement + cost optimization)
    freed_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type.in_(_FREED_EVENT_TYPES),
        )
    )
    total_freed = float(freed_result.scalar())

    # Budget reallocated
    realloc_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type == CapitalEventType.reallocation,
        )
    )
    budget_reallocated = float(realloc_result.scalar())

    # AI spend reduced
    ai_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type == CapitalEventType.ai_spend_reduced,
        )
    )
    ai_spend_reduced = float(ai_result.scalar())

    # Portfolio ROI — live cost-weighted from data_products (R5 canonical)
    roi_agg = await db.execute(
        select(
            func.coalesce(func.sum(DataProduct.composite_value), 0),
            func.coalesce(func.sum(DataProduct.monthly_cost), 0),
        ).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    total_value, total_cost = (float(v) for v in roi_agg.one())
    roi_current = total_value / total_cost if total_cost > 0 else 0

    # Previous-month ROI from portfolio_monthly snapshot for delta
    portfolio_result = await db.execute(
        select(PortfolioMonthly)
        .where(PortfolioMonthly.org_id == org_id)
        .order_by(desc(PortfolioMonthly.month))
        .limit(1)
    )
    portfolio_rows = portfolio_result.scalars().all()
    roi_previous = float(portfolio_rows[0].average_roi) if portfolio_rows and portfolio_rows[0].average_roi else roi_current
    roi_delta = roi_current - roi_previous

    # Decisions executed vs under review
    exec_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
        )
    )
    decisions_executed = exec_result.scalar()

    review_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.under_review,
        )
    )
    decisions_under_review = review_result.scalar()

    # Active pricing policies
    pricing_result = await db.execute(
        select(
            func.count(PricingPolicy.id),
            func.coalesce(func.sum(PricingPolicy.projected_revenue), 0),
        ).where(
            PricingPolicy.org_id == org_id,
            PricingPolicy.status == PricingPolicyStatus.active,
        )
    )
    pricing_row = pricing_result.one()
    active_policies = pricing_row[0]
    pricing_revenue = float(pricing_row[1])

    # Capital freed by month
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
            CapitalEvent.event_type.in_(_FREED_EVENT_TYPES),
        )
        .group_by(month_trunc)
        .order_by(month_trunc)
    )
    monthly_rows = monthly_result.all()
    cumulative = 0.0
    freed_by_month = []
    for row in monthly_rows:
        amt = float(row.amount)
        cumulative += amt
        freed_by_month.append(CapitalFreedMonthItem(
            month=row.month.strftime("%Y-%m") if hasattr(row.month, "strftime") else str(row.month)[:7],
            amount=amt,
            cumulative=cumulative,
        ))

    # Capital by type
    type_result = await db.execute(
        select(
            CapitalEvent.event_type,
            func.sum(CapitalEvent.amount).label("total"),
        )
        .where(CapitalEvent.org_id == org_id)
        .group_by(CapitalEvent.event_type)
    )
    by_type = [CapitalByTypeItem(type=row.event_type.value, amount=float(row.total)) for row in type_result.all()]

    # Recent events
    recent_result = await db.execute(
        select(CapitalEvent)
        .where(CapitalEvent.org_id == org_id)
        .order_by(desc(CapitalEvent.created_at))
        .limit(10)
    )
    recent = [
        CapitalEventItem(
            id=e.id,
            decision_id=e.decision_id,
            product_id=e.product_id,
            event_type=e.event_type.value,
            amount=float(e.amount),
            description=e.description,
            effective_date=e.effective_date.isoformat(),
            created_at=e.created_at.isoformat(),
        )
        for e in recent_result.scalars().all()
    ]

    return CapitalImpactSummaryResponse(
        total_capital_freed=total_freed,
        total_capital_freed_annual=total_freed * 12,
        budget_reallocated=budget_reallocated,
        ai_spend_reduced=ai_spend_reduced,
        portfolio_roi_delta=round(roi_delta, 4),
        portfolio_roi_current=round(roi_current, 4),
        portfolio_roi_previous=round(roi_previous, 4),
        decisions_executed=decisions_executed,
        decisions_under_review=decisions_under_review,
        active_pricing_policies=active_policies,
        pricing_revenue_total=pricing_revenue,
        capital_freed_by_month=freed_by_month,
        capital_by_type=by_type,
        recent_events=recent,
    )
