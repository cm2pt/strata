"""Portfolio routes — summary, cost-trend, ROI history, executive summary."""

import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.data_product import DataProduct, LifecycleStage
from app.models.time_series import PortfolioMonthly, ROIMonthly
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class PortfolioSummaryResponse(BaseModel):
    total_products: int
    total_cost: float
    average_roi: float = Field(serialization_alias="averageROI")
    roi_trend: float
    total_consumers: int
    consumers_trend: float
    active_subscriptions: int
    retirement_candidates: int
    estimated_savings: float
    cost_coverage: float
    products_with_value: int
    new_products_this_quarter: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CostTrendPointResponse(BaseModel):
    month: str
    cost: float
    value: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ROIHistoryPointResponse(BaseModel):
    month: str
    roi: float | None
    cost: float
    composite_value: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ExecutiveInsightResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    product_ids: list[str]
    financial_impact: float | None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DoNothingProjectionResponse(BaseModel):
    current_monthly_cost: float
    projected_monthly_cost: float
    current_roi: float = Field(serialization_alias="currentROI")
    projected_roi: float = Field(serialization_alias="projectedROI")
    projected_wasted_spend: float
    projected_value_at_risk: float
    months: int
    assumptions: list[str]

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ExecutiveSummaryResponse(BaseModel):
    generated_at: str
    confidence_level: float
    confidence_basis: str
    insights: list[ExecutiveInsightResponse]
    do_nothing_projection: DoNothingProjectionResponse

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=PortfolioSummaryResponse)
async def portfolio_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("portfolio:read")),
):
    """Compute portfolio-level KPIs from current data product state."""
    products_q = select(DataProduct).where(DataProduct.org_id == org_id)
    result = await db.execute(products_q)
    products = result.scalars().all()

    total_products = len(products)
    total_cost = sum(float(p.monthly_cost) for p in products)
    total_value = sum(float(p.composite_value) for p in products)
    total_consumers = sum(p.monthly_consumers for p in products)
    average_roi = (total_value / total_cost) if total_cost > 0 else 0.0
    retirement_candidates = sum(1 for p in products if p.is_retirement_candidate)
    products_with_value = sum(1 for p in products if p.declared_value and float(p.declared_value) > 0)
    active_subscriptions = sum(p.subscription_count for p in products)
    cost_coverage = (
        sum(float(p.cost_coverage) for p in products) / total_products
        if total_products > 0 else 0.0
    )

    # Estimated savings from retirement candidates
    estimated_savings = sum(
        float(p.monthly_cost) for p in products if p.is_retirement_candidate
    )

    # Count products created this quarter
    now = datetime.now(timezone.utc)
    quarter_start = date(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
    new_products_this_quarter = sum(
        1 for p in products if p.created_at.date() >= quarter_start
    )

    # Trends from last two portfolio monthly snapshots
    snapshots_q = (
        select(PortfolioMonthly)
        .where(PortfolioMonthly.org_id == org_id)
        .order_by(PortfolioMonthly.month.desc())
        .limit(2)
    )
    snap_result = await db.execute(snapshots_q)
    snapshots = snap_result.scalars().all()
    roi_trend = 0.0
    consumers_trend = 0.0
    if len(snapshots) >= 2:
        curr, prev = snapshots[0], snapshots[1]
        if prev.average_roi and float(prev.average_roi) != 0:
            roi_trend = ((float(curr.average_roi or 0) - float(prev.average_roi)) / abs(float(prev.average_roi))) * 100
        if prev.total_consumers and prev.total_consumers != 0:
            consumers_trend = ((curr.total_consumers - prev.total_consumers) / prev.total_consumers) * 100

    return PortfolioSummaryResponse(
        total_products=total_products,
        total_cost=total_cost,
        average_roi=round(average_roi, 4),
        roi_trend=round(roi_trend, 2),
        total_consumers=total_consumers,
        consumers_trend=round(consumers_trend, 2),
        active_subscriptions=active_subscriptions,
        retirement_candidates=retirement_candidates,
        estimated_savings=estimated_savings,
        cost_coverage=round(cost_coverage, 3),
        products_with_value=products_with_value,
        new_products_this_quarter=new_products_this_quarter,
    )


@router.get("/cost-trend", response_model=list[CostTrendPointResponse])
async def cost_trend(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("portfolio:read")),
):
    """Return monthly cost/value trend from portfolio_monthly."""
    q = (
        select(PortfolioMonthly)
        .where(PortfolioMonthly.org_id == org_id)
        .order_by(PortfolioMonthly.month.asc())
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        CostTrendPointResponse(
            month=row.month.isoformat(),
            cost=float(row.total_cost),
            value=float(row.total_value),
        )
        for row in rows
    ]


@router.get("/roi-history", response_model=list[ROIHistoryPointResponse])
async def roi_history(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("portfolio:read")),
):
    """Portfolio-level ROI history, aggregated from roi_monthly per org."""
    # Aggregate all products belonging to org by month
    q = (
        select(
            ROIMonthly.month,
            func.avg(ROIMonthly.roi).label("avg_roi"),
            func.sum(ROIMonthly.cost).label("total_cost"),
            func.sum(ROIMonthly.composite_value).label("total_value"),
        )
        .join(DataProduct, DataProduct.id == ROIMonthly.data_product_id)
        .where(DataProduct.org_id == org_id)
        .group_by(ROIMonthly.month)
        .order_by(ROIMonthly.month.asc())
    )
    result = await db.execute(q)
    rows = result.all()
    return [
        ROIHistoryPointResponse(
            month=row.month.isoformat(),
            roi=round(float(row.avg_roi), 4) if row.avg_roi is not None else None,
            cost=float(row.total_cost),
            composite_value=float(row.total_value),
        )
        for row in rows
    ]


@router.get("/executive-summary", response_model=ExecutiveSummaryResponse)
async def executive_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("portfolio:read")),
):
    """Rule-based executive summary derived from current portfolio state."""
    products_q = select(DataProduct).where(DataProduct.org_id == org_id)
    result = await db.execute(products_q)
    products = result.scalars().all()

    total_cost = sum(float(p.monthly_cost) for p in products)
    total_value = sum(float(p.composite_value) for p in products)
    avg_coverage = (
        sum(float(p.cost_coverage) for p in products) / len(products)
        if products else 0.0
    )
    current_roi = (total_value / total_cost) if total_cost > 0 else 0.0

    # Build insights
    insights: list[ExecutiveInsightResponse] = []

    retirement_candidates = [p for p in products if p.is_retirement_candidate]
    if retirement_candidates:
        savings = sum(float(p.monthly_cost) for p in retirement_candidates)
        insights.append(ExecutiveInsightResponse(
            id="insight-retirement",
            type="opportunity",
            title=f"{len(retirement_candidates)} products identified for potential retirement",
            description=f"Retiring these products could save ${savings:,.0f}/month",
            product_ids=[str(p.id) for p in retirement_candidates],
            financial_impact=savings,
        ))

    cost_spikes = [p for p in products if p.has_cost_spike]
    if cost_spikes:
        spike_cost = sum(float(p.monthly_cost) for p in cost_spikes)
        insights.append(ExecutiveInsightResponse(
            id="insight-cost-spikes",
            type="risk",
            title=f"{len(cost_spikes)} products have cost spikes",
            description=f"Combined monthly cost of ${spike_cost:,.0f} warrants investigation",
            product_ids=[str(p.id) for p in cost_spikes],
            financial_impact=-spike_cost * 0.2,
        ))

    critical = [p for p in products if p.roi_band and p.roi_band.value == "critical"]
    if critical:
        insights.append(ExecutiveInsightResponse(
            id="insight-critical-roi",
            type="risk",
            title=f"{len(critical)} products in critical ROI band",
            description="These products are consuming budget without proportional value",
            product_ids=[str(p.id) for p in critical],
            financial_impact=-sum(float(p.monthly_cost) for p in critical),
        ))

    if not insights:
        insights.append(ExecutiveInsightResponse(
            id="insight-healthy",
            type="insight",
            title="Portfolio in healthy condition",
            description="No immediate risks or opportunities flagged",
            product_ids=[],
            financial_impact=None,
        ))

    # Do-nothing projection (simple linear)
    projected_cost = total_cost * 1.08  # assume 8% growth in 6 months
    projected_roi = current_roi * 0.92  # assume 8% decline
    wasted_spend = sum(float(p.monthly_cost) for p in retirement_candidates) * 6 if retirement_candidates else 0
    value_at_risk = sum(float(p.composite_value) for p in products if p.has_usage_decline)

    # Confidence
    products_with_value_count = sum(1 for p in products if p.declared_value and float(p.declared_value) > 0)
    confidence = min(avg_coverage, products_with_value_count / len(products) if products else 0.0)

    return ExecutiveSummaryResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        confidence_level=round(confidence, 2),
        confidence_basis=f"Based on {avg_coverage:.0%} cost coverage and {products_with_value_count}/{len(products)} products with declared value",
        insights=insights,
        do_nothing_projection=DoNothingProjectionResponse(
            current_monthly_cost=total_cost,
            projected_monthly_cost=round(projected_cost, 2),
            current_roi=round(current_roi, 4),
            projected_roi=round(projected_roi, 4),
            projected_wasted_spend=round(wasted_spend, 2),
            projected_value_at_risk=round(value_at_risk, 2),
            months=6,
            assumptions=[
                "Cost growth continues at current trend",
                "No new value declarations submitted",
                "Retirement candidates remain active",
                "Consumer trends stay flat",
            ],
        ),
    )
