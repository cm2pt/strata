"""Board Mode — structured JSON capital summary for executive export."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.time_series import PortfolioMonthly
from app.models.user import User

# Canonical "capital freed" event types — consistent with capital_impact (R4)
_FREED_EVENT_TYPES = [CapitalEventType.retirement_freed, CapitalEventType.cost_optimization]
from app.services.capital_efficiency import compute_capital_efficiency

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


class CapitalActionItem(BaseModel):
    decision_id: str
    product_name: str
    decision_type: str
    capital_freed: float
    status: str
    resolved_at: str | None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class BoardCapitalSummaryResponse(BaseModel):
    total_capital_freed: float
    total_capital_freed_annual: float
    confirmed_savings: float
    projected_savings: float
    underperforming_decisions: int
    portfolio_roi_current: float
    portfolio_roi_delta: float
    capital_efficiency_score: float
    top_capital_actions: list[CapitalActionItem]

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


@router.get("/capital-summary", response_model=BoardCapitalSummaryResponse)
async def board_capital_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("capital:export")),
):
    """
    Structured JSON for board-level capital summary.
    Designed for future PDF/slide export.

    Returns:
    - total capital freed (monthly & annual)
    - confirmed vs projected savings
    - underperforming decisions count
    - portfolio ROI current + delta
    - capital efficiency score
    - top 5 capital actions this quarter
    """

    # ---- Total capital freed (retirement + cost optimization only — R4) ----
    freed_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type.in_(_FREED_EVENT_TYPES),
        )
    )
    total_freed = float(freed_result.scalar())

    # ---- Confirmed savings (from decisions with impact_validation_status = 'confirmed') ----
    confirmed_result = await db.execute(
        select(func.coalesce(func.sum(Decision.actual_savings_measured), 0)).where(
            Decision.org_id == org_id,
            Decision.impact_validation_status == "confirmed",
        )
    )
    confirmed_savings = float(confirmed_result.scalar())

    # ---- Projected savings (still in validating or pending) ----
    projected_result = await db.execute(
        select(func.coalesce(func.sum(Decision.projected_savings_monthly), 0)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.impact_validation_status.in_(["pending", "validating"]),
        )
    )
    projected_savings = float(projected_result.scalar())

    # ---- Underperforming decisions ----
    underperforming_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.impact_validation_status == "underperforming",
        )
    )
    underperforming_count = underperforming_result.scalar() or 0

    # ---- Portfolio ROI — live cost-weighted from data_products (R5 canonical) ----
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

    # ---- Capital efficiency score ----
    efficiency = await compute_capital_efficiency(org_id, db)
    efficiency_score = efficiency["score"]

    # ---- Top 5 capital actions this quarter ----
    now = datetime.now(timezone.utc)
    quarter_start_month = ((now.month - 1) // 3) * 3 + 1
    quarter_start = datetime(now.year, quarter_start_month, 1, tzinfo=timezone.utc)

    actions_result = await db.execute(
        select(Decision)
        .where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.resolved_at >= quarter_start,
            Decision.deleted_at.is_(None),
        )
        .order_by(desc(Decision.capital_freed))
        .limit(5)
    )
    top_actions = [
        CapitalActionItem(
            decision_id=str(d.id),
            product_name=d.product_name,
            decision_type=d.type.value,
            capital_freed=float(d.capital_freed or 0),
            status=d.impact_validation_status or "pending",
            resolved_at=d.resolved_at.isoformat() if d.resolved_at else None,
        )
        for d in actions_result.scalars().all()
    ]

    return BoardCapitalSummaryResponse(
        total_capital_freed=total_freed,
        total_capital_freed_annual=total_freed * 12,
        confirmed_savings=confirmed_savings,
        projected_savings=projected_savings,
        underperforming_decisions=underperforming_count,
        portfolio_roi_current=round(roi_current, 4),
        portfolio_roi_delta=round(roi_delta, 4),
        capital_efficiency_score=efficiency_score,
        top_capital_actions=top_actions,
    )
