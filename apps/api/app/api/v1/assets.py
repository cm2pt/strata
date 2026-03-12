"""Asset (Data Product) routes — list, create, detail, metrics, value declarations."""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.data_product import (
    CostBreakdown,
    ConsumerTeam,
    DataProduct,
    DataProductTag,
    LifecycleStage,
    PlatformType,
    ROIBand,
)
from app.models.time_series import CostMonthly, UsageMonthly, ROIMonthly
from app.models.user import User
from app.models.value import ValueDeclaration, ValueMethod

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class OwnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    title: str | None = None
    team: str = ""
    avatar: str | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CostBreakdownResponse(BaseModel):
    compute: float
    storage: float
    pipeline: float
    human_estimate: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ConsumerTeamResponse(BaseModel):
    name: str
    consumers: int
    percentage: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ValueDeclarationResponse(BaseModel):
    declared_by: str
    declared_by_title: str
    method: str
    value: float
    basis: str
    status: list[str]
    declared_at: str
    next_review: str
    is_expiring: bool

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DataProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    business_unit: str
    owner: OwnerResponse
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
    created_at: str
    updated_at: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DataProductListResponse(BaseModel):
    items: list[DataProductListItem]
    total: int
    page: int
    page_size: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DataProductDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    business_unit: str
    owner: OwnerResponse
    platform: str
    lifecycle_stage: str
    created_at: str
    updated_at: str

    # Economics
    monthly_cost: float
    cost_breakdown: CostBreakdownResponse | None
    declared_value: float | None
    usage_implied_value: float
    composite_value: float
    roi: float | None
    roi_band: str | None
    cost_trend: float
    cost_coverage: float

    # Usage
    monthly_consumers: int
    total_queries: int
    consumer_teams: list[ConsumerTeamResponse]
    usage_trend: float
    peak_consumers: int

    # Quality
    freshness_hours: float
    freshness_sla: float = Field(serialization_alias="freshnessSLA")
    completeness: float
    accuracy: float
    trust_score: float

    # Marketplace
    is_published: bool
    is_certified: bool
    subscription_count: int

    # Value
    value_declaration: ValueDeclarationResponse | None

    # Dependencies
    downstream_products: int
    downstream_models: int
    downstream_dashboards: int

    # Flags
    is_retirement_candidate: bool
    has_cost_spike: bool
    has_usage_decline: bool

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CostTrendPointResponse(BaseModel):
    month: str
    cost: float
    value: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class UsageTrendPointResponse(BaseModel):
    month: str
    consumers: int
    queries: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ROIHistoryPointResponse(BaseModel):
    month: str
    roi: float | None
    cost: float
    composite_value: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class AssetMetricsResponse(BaseModel):
    cost_trend: list[CostTrendPointResponse]
    usage_trend: list[UsageTrendPointResponse]
    roi_history: list[ROIHistoryPointResponse]

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CreateDataProductRequest(BaseModel):
    name: str
    domain: str
    business_unit: str
    platform: str
    lifecycle_stage: str = "draft"

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DeclareValueRequest(BaseModel):
    """Create or update a value declaration for a data product."""
    method: str = Field(..., description="One of: revenue_attribution, cost_avoidance, efficiency_gain, compliance, strategic")
    value: float = Field(..., gt=0, description="Monthly value in dollars")
    basis: str = Field(..., min_length=1, max_length=2000, description="Justification for the declared value")

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _owner_response(owner: User) -> OwnerResponse:
    return OwnerResponse(
        id=owner.id,
        name=owner.name,
        title=owner.title,
        team="",
        avatar=owner.avatar_url,
    )


def _cost_breakdown_response(cb: CostBreakdown | None) -> CostBreakdownResponse | None:
    if cb is None:
        return None
    return CostBreakdownResponse(
        compute=float(cb.compute),
        storage=float(cb.storage),
        pipeline=float(cb.pipeline),
        human_estimate=float(cb.human_estimate),
    )


def _value_declaration_response(vd: ValueDeclaration | None) -> ValueDeclarationResponse | None:
    if vd is None:
        return None
    return ValueDeclarationResponse(
        declared_by=vd.declared_by,
        declared_by_title=vd.declared_by_title,
        method=vd.method.value,
        value=float(vd.value),
        basis=vd.basis,
        status=vd.status or [],
        declared_at=vd.declared_at.isoformat(),
        next_review=vd.next_review.isoformat(),
        is_expiring=vd.is_expiring,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=DataProductListResponse)
async def list_assets(
    db: DbSession,
    org_id: OrgId,
    search: str | None = Query(None),
    lifecycle_stage: str | None = Query(None),
    sort_by: str = Query("name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _user: User = Depends(require_permission("products:read")),
):
    """List data products for the org with search, filter, sort, pagination."""
    base_q = select(DataProduct).where(DataProduct.org_id == org_id).options(
        selectinload(DataProduct.owner),
    )

    if search:
        pattern = f"%{search}%"
        base_q = base_q.where(
            or_(
                DataProduct.name.ilike(pattern),
                DataProduct.domain.ilike(pattern),
                DataProduct.business_unit.ilike(pattern),
            )
        )

    if lifecycle_stage:
        base_q = base_q.where(DataProduct.lifecycle_stage == lifecycle_stage)

    # Total count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Sorting
    sort_col = getattr(DataProduct, sort_by, DataProduct.name)
    base_q = base_q.order_by(sort_col)

    # Pagination
    offset = (page - 1) * page_size
    base_q = base_q.offset(offset).limit(page_size)

    result = await db.execute(base_q)
    products = result.scalars().all()

    items = [
        DataProductListItem(
            id=p.id,
            name=p.name,
            domain=p.domain,
            business_unit=p.business_unit,
            owner=_owner_response(p.owner),
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
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        )
        for p in products
    ]

    return DataProductListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=DataProductDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: CreateDataProductRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("products:write")),
):
    """Create a new data product."""
    product = DataProduct(
        org_id=org_id,
        owner_id=user.id,
        name=body.name,
        domain=body.domain,
        business_unit=body.business_unit,
        platform=PlatformType(body.platform),
        lifecycle_stage=LifecycleStage(body.lifecycle_stage),
    )
    db.add(product)
    await db.commit()
    await db.refresh(product, attribute_names=["owner", "cost_breakdown", "consumer_teams", "value_declaration"])

    return _build_detail_response(product)


@router.get("/{asset_id}", response_model=DataProductDetailResponse)
async def get_asset(
    asset_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("products:read")),
):
    """Full detail for a single data product with nested objects."""
    q = (
        select(DataProduct)
        .where(DataProduct.id == asset_id, DataProduct.org_id == org_id)
        .options(
            selectinload(DataProduct.owner),
            selectinload(DataProduct.cost_breakdown),
            selectinload(DataProduct.consumer_teams),
            selectinload(DataProduct.value_declaration),
        )
    )
    result = await db.execute(q)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    return _build_detail_response(product)


@router.get("/{asset_id}/metrics", response_model=AssetMetricsResponse)
async def get_asset_metrics(
    asset_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("products:read")),
):
    """Cost trend, usage trend, ROI history time series for one data product."""
    # Verify product belongs to org
    product = await db.execute(
        select(DataProduct.id).where(DataProduct.id == asset_id, DataProduct.org_id == org_id)
    )
    if not product.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    # Cost monthly
    cost_rows = (await db.execute(
        select(CostMonthly)
        .where(CostMonthly.data_product_id == asset_id)
        .order_by(CostMonthly.month.asc())
    )).scalars().all()

    # Usage monthly
    usage_rows = (await db.execute(
        select(UsageMonthly)
        .where(UsageMonthly.data_product_id == asset_id)
        .order_by(UsageMonthly.month.asc())
    )).scalars().all()

    # ROI monthly
    roi_rows = (await db.execute(
        select(ROIMonthly)
        .where(ROIMonthly.data_product_id == asset_id)
        .order_by(ROIMonthly.month.asc())
    )).scalars().all()

    # Build value lookup from roi_monthly for the cost trend
    value_by_month = {r.month.isoformat(): float(r.composite_value) for r in roi_rows}

    return AssetMetricsResponse(
        cost_trend=[
            CostTrendPointResponse(
                month=c.month.isoformat(),
                cost=float(c.total_cost),
                value=value_by_month.get(c.month.isoformat(), 0.0),
            )
            for c in cost_rows
        ],
        usage_trend=[
            UsageTrendPointResponse(
                month=u.month.isoformat(),
                consumers=u.consumers,
                queries=u.queries,
            )
            for u in usage_rows
        ],
        roi_history=[
            ROIHistoryPointResponse(
                month=r.month.isoformat(),
                roi=float(r.roi) if r.roi is not None else None,
                cost=float(r.cost),
                composite_value=float(r.composite_value),
            )
            for r in roi_rows
        ],
    )


# ---------------------------------------------------------------------------
# Value Declaration endpoints
# ---------------------------------------------------------------------------

@router.post("/{asset_id}/value", response_model=ValueDeclarationResponse, status_code=status.HTTP_201_CREATED)
async def declare_value(
    asset_id: uuid.UUID,
    body: DeclareValueRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("products:write")),
):
    """Create a value declaration for a data product that has none."""
    # Verify product belongs to org and eagerly load relationships
    q = (
        select(DataProduct)
        .where(DataProduct.id == asset_id, DataProduct.org_id == org_id)
        .options(selectinload(DataProduct.value_declaration))
    )
    result = await db.execute(q)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    if product.value_declaration is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Value declaration already exists. Use PATCH to update.",
        )

    # Validate method enum
    try:
        method_enum = ValueMethod(body.method)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid method: {body.method}. Must be one of: {', '.join(m.value for m in ValueMethod)}",
        )

    today = date.today()
    vd = ValueDeclaration(
        data_product_id=asset_id,
        declared_by=user.name,
        declared_by_title=user.title or "Team Member",
        method=method_enum,
        value=body.value,
        basis=body.basis,
        status=[],
        declared_at=today,
        next_review=today + timedelta(days=180),
        is_expiring=False,
    )
    db.add(vd)

    # Update the product's declared_value for ROI calculations
    product.declared_value = body.value
    product.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(vd)

    return _value_declaration_response(vd)


@router.patch("/{asset_id}/value", response_model=ValueDeclarationResponse)
async def update_value(
    asset_id: uuid.UUID,
    body: DeclareValueRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("products:write")),
):
    """Update the existing value declaration for a data product."""
    # Verify product belongs to org and eagerly load relationships
    q = (
        select(DataProduct)
        .where(DataProduct.id == asset_id, DataProduct.org_id == org_id)
        .options(selectinload(DataProduct.value_declaration))
    )
    result = await db.execute(q)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    vd = product.value_declaration
    if vd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No value declaration to update. Use POST to create one.",
        )

    # Validate method enum
    try:
        method_enum = ValueMethod(body.method)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid method: {body.method}. Must be one of: {', '.join(m.value for m in ValueMethod)}",
        )

    today = date.today()
    vd.method = method_enum
    vd.value = body.value
    vd.basis = body.basis
    vd.declared_by = user.name
    vd.declared_by_title = user.title or "Team Member"
    vd.declared_at = today
    vd.next_review = today + timedelta(days=180)
    # Reset review statuses since the value changed
    vd.status = []
    vd.is_expiring = False

    # Update the product's declared_value for ROI calculations
    product.declared_value = body.value
    product.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(vd)

    return _value_declaration_response(vd)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_detail_response(p: DataProduct) -> DataProductDetailResponse:
    return DataProductDetailResponse(
        id=p.id,
        name=p.name,
        domain=p.domain,
        business_unit=p.business_unit,
        owner=_owner_response(p.owner),
        platform=p.platform.value,
        lifecycle_stage=p.lifecycle_stage.value,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
        monthly_cost=float(p.monthly_cost),
        cost_breakdown=_cost_breakdown_response(p.cost_breakdown),
        declared_value=float(p.declared_value) if p.declared_value is not None else None,
        usage_implied_value=float(p.usage_implied_value),
        composite_value=float(p.composite_value),
        roi=float(p.roi) if p.roi is not None else None,
        roi_band=p.roi_band.value if p.roi_band else None,
        cost_trend=float(p.cost_trend),
        cost_coverage=float(p.cost_coverage),
        monthly_consumers=p.monthly_consumers,
        total_queries=p.total_queries,
        consumer_teams=[
            ConsumerTeamResponse(
                name=ct.team_name,
                consumers=ct.consumers,
                percentage=float(ct.percentage),
            )
            for ct in (p.consumer_teams or [])
        ],
        usage_trend=float(p.usage_trend),
        peak_consumers=p.peak_consumers,
        freshness_hours=float(p.freshness_hours),
        freshness_sla=float(p.freshness_sla),
        completeness=float(p.completeness),
        accuracy=float(p.accuracy),
        trust_score=float(p.trust_score),
        is_published=p.is_published,
        is_certified=p.is_certified,
        subscription_count=p.subscription_count,
        value_declaration=_value_declaration_response(p.value_declaration),
        downstream_products=p.downstream_products,
        downstream_models=p.downstream_models,
        downstream_dashboards=p.downstream_dashboards,
        is_retirement_candidate=p.is_retirement_candidate,
        has_cost_spike=p.has_cost_spike,
        has_usage_decline=p.has_usage_decline,
    )
