"""Capital allocation routes — returns raw data for frontend aggregation + reallocation approval."""

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status as http_status
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.data_product import DataProduct
from app.models.config import BenchmarkData
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.user import User
from app.services.capital_allocation import compute_portfolio_rebalance

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Response schemas — lightweight product item for allocation view
# ---------------------------------------------------------------------------

class OwnerBrief(BaseModel):
    id: str
    name: str
    title: str | None = None
    team: str = ""

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class AllocationProductItem(BaseModel):
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
    is_published: bool = False
    created_at: str
    updated_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class BenchmarkItem(BaseModel):
    industry: str
    label: str
    median_roi: float = Field(serialization_alias="medianROI")
    median_cost_per_consumer: float
    median_portfolio_roi: float = Field(serialization_alias="medianPortfolioROI")
    p25_roi: float = Field(serialization_alias="p25ROI")
    p75_roi: float = Field(serialization_alias="p75ROI")
    sample_size: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/summary")
async def allocation_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("allocation:read")),
) -> dict[str, Any]:
    """Return raw data products + benchmark data for frontend allocation aggregation."""
    result = await db.execute(
        select(DataProduct)
        .where(DataProduct.org_id == org_id)
        .options(selectinload(DataProduct.owner))
    )
    products = result.scalars().all()

    bench_result = await db.execute(select(BenchmarkData).order_by(BenchmarkData.industry))
    benchmarks = bench_result.scalars().all()

    data_products = [
        AllocationProductItem(
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
            is_published=p.is_published,
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        ).model_dump(by_alias=True)
        for p in products
    ]

    benchmark_data = [
        BenchmarkItem(
            industry=b.industry.value,
            label=b.label,
            median_roi=float(b.median_roi),
            median_cost_per_consumer=float(b.median_cost_per_consumer),
            median_portfolio_roi=float(b.median_portfolio_roi),
            p25_roi=float(b.p25_roi),
            p75_roi=float(b.p75_roi),
            sample_size=b.sample_size,
        ).model_dump(by_alias=True)
        for b in benchmarks
    ]

    return {"dataProducts": data_products, "benchmarkData": benchmark_data}


# ---------------------------------------------------------------------------
# Approve Reallocation
# ---------------------------------------------------------------------------

class ApproveReallocationRequest(BaseModel):
    from_products: list[uuid.UUID]
    to_products: list[uuid.UUID]
    amount: float
    projected_roi_impact: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ApproveReallocationResponse(BaseModel):
    decision_id: uuid.UUID
    capital_event_id: uuid.UUID
    message: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


@router.post("/approve-reallocation", response_model=ApproveReallocationResponse, status_code=http_status.HTTP_201_CREATED)
async def approve_reallocation(
    body: ApproveReallocationRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:approve")),
):
    """Approve a capital reallocation from low-ROI to high-ROI products."""
    now = datetime.now(timezone.utc)

    # Look up product names for description
    from_result = await db.execute(
        select(DataProduct).where(DataProduct.id.in_(body.from_products), DataProduct.org_id == org_id)
    )
    from_names = [p.name for p in from_result.scalars().all()]
    to_result = await db.execute(
        select(DataProduct).where(DataProduct.id.in_(body.to_products), DataProduct.org_id == org_id)
    )
    to_names = [p.name for p in to_result.scalars().all()]

    # Create decision record
    decision = Decision(
        org_id=org_id,
        type=DecisionType.capital_reallocation,
        status=DecisionStatus.approved,
        product_id=body.from_products[0] if body.from_products else None,
        product_name=from_names[0] if from_names else "Multiple products",
        title=f"Capital reallocation: ${body.amount:,.0f}/mo from low to high ROI",
        description=(
            f"Reallocating ${body.amount:,.0f}/mo from {', '.join(from_names[:3])} "
            f"to {', '.join(to_names[:3])}. "
            f"Projected ROI impact: +{body.projected_roi_impact:.1%}."
        ),
        initiated_by=user.name,
        assigned_to=user.name,
        estimated_impact=body.amount,
        actual_impact=0,
        capital_freed=body.amount,
        projected_savings_monthly=body.amount * body.projected_roi_impact,
        projected_savings_annual=body.amount * body.projected_roi_impact * 12,
        resolved_at=now,
    )
    db.add(decision)
    await db.flush()

    # Create capital event
    event = CapitalEvent(
        org_id=org_id,
        decision_id=decision.id,
        product_id=body.from_products[0] if body.from_products else None,
        event_type=CapitalEventType.reallocation,
        amount=body.amount,
        description=f"Budget reallocation: ${body.amount:,.0f}/mo moved from bottom to top ROI quartile",
        effective_date=now.date(),
    )
    db.add(event)

    await db.commit()
    await db.refresh(decision)
    await db.refresh(event)

    return ApproveReallocationResponse(
        decision_id=decision.id,
        capital_event_id=event.id,
        message=f"Reallocation of ${body.amount:,.0f}/mo approved and logged.",
    )


# ---------------------------------------------------------------------------
# Portfolio Rebalance Simulation — Response models
# ---------------------------------------------------------------------------

class RebalanceProductItem(BaseModel):
    id: str
    name: str
    domain: str = ""
    business_unit: str = ""
    lifecycle_stage: str = ""
    monthly_cost: float = 0
    composite_value: float = 0
    trailing_roi: float = 0
    monthly_consumers: int = 0
    usage_trend: float = 0
    cost_trend: float = 0

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class QuartileDataResponse(BaseModel):
    products: list[RebalanceProductItem] = []
    total_cost: float = 0
    total_value: float = 0
    blended_roi: float = 0
    count: int = 0

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class RebalanceDivestItem(BaseModel):
    id: str
    name: str
    monthly_cost: float = 0
    trailing_roi: float = 0

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class PortfolioRebalanceResponse(BaseModel):
    current_blended_roi: float = 0
    projected_blended_roi: float = 0
    efficiency_delta: float = 0
    rebalance_pct: float = 0.20
    movable_amount_monthly: float = 0
    total_products: int = 0
    total_monthly_cost: float = 0
    total_monthly_value: float = 0
    capital_concentration_index: float = 0
    bottom_quartile: QuartileDataResponse = QuartileDataResponse()
    top_quartile: QuartileDataResponse = QuartileDataResponse()
    recommended_divest: list[RebalanceDivestItem] = []
    recommended_invest: list[RebalanceDivestItem] = []

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Portfolio Rebalance Simulation
# ---------------------------------------------------------------------------

@router.get("/portfolio-rebalance", response_model=PortfolioRebalanceResponse)
async def portfolio_rebalance(
    db: DbSession,
    org_id: OrgId,
    rebalance_pct: float = 0.20,
    _user: User = Depends(require_permission("allocation:read")),
):
    """
    Simulate portfolio rebalancing: move budget from bottom-quartile to
    top-quartile ROI products and project new blended ROI.

    Query param `rebalance_pct` controls what % of bottom-quartile spend
    to move (default 20%).
    """
    raw = await compute_portfolio_rebalance(org_id, db, rebalance_pct=rebalance_pct)
    return PortfolioRebalanceResponse(**raw)
