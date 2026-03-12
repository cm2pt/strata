"""Marketplace routes — browse published products, toggle subscription."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.models.data_product import DataProduct
from app.models.config import MarketplaceSubscription
from app.models.user import User

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


class MarketplaceProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    business_unit: str
    owner: OwnerResponse
    platform: str
    lifecycle_stage: str
    monthly_cost: float
    composite_value: float
    roi: float | None = None
    roi_band: str | None = None
    monthly_consumers: int
    trust_score: float
    is_certified: bool
    is_published: bool = True
    subscription_count: int
    is_subscribed: bool

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class SubscribeRequest(BaseModel):
    product_id: uuid.UUID

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class SubscribeResponse(BaseModel):
    subscribed: bool
    subscription_count: int

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/products", response_model=list[MarketplaceProductResponse])
async def list_marketplace_products(
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("marketplace:read")),
    search: str | None = Query(None),
):
    """List published data products available on the marketplace."""
    q = (
        select(DataProduct)
        .where(DataProduct.is_published.is_(True))
        .options(selectinload(DataProduct.owner))
        .order_by(DataProduct.subscription_count.desc())
    )

    if search:
        pattern = f"%{search}%"
        q = q.where(DataProduct.name.ilike(pattern))

    result = await db.execute(q)
    products = result.scalars().all()

    # Get user's subscriptions
    sub_result = await db.execute(
        select(MarketplaceSubscription.data_product_id).where(
            MarketplaceSubscription.user_id == user.id
        )
    )
    subscribed_ids = {row for row in sub_result.scalars().all()}

    return [
        MarketplaceProductResponse(
            id=p.id,
            name=p.name,
            domain=p.domain,
            business_unit=p.business_unit,
            owner=OwnerResponse(
                id=p.owner.id,
                name=p.owner.name,
                title=p.owner.title,
                team="",
                avatar=p.owner.avatar_url,
            ) if p.owner else OwnerResponse(id=p.owner_id, name="Unknown"),
            platform=p.platform.value,
            lifecycle_stage=p.lifecycle_stage.value,
            monthly_cost=float(p.monthly_cost),
            composite_value=float(p.composite_value),
            roi=float(p.roi) if p.roi is not None else None,
            roi_band=p.roi_band.value if p.roi_band else None,
            monthly_consumers=p.monthly_consumers,
            trust_score=float(p.trust_score),
            is_certified=p.is_certified,
            subscription_count=p.subscription_count,
            is_subscribed=p.id in subscribed_ids,
        )
        for p in products
    ]


@router.post("/subscribe", response_model=SubscribeResponse)
async def toggle_subscription(
    body: SubscribeRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("marketplace:subscribe")),
):
    """Toggle subscription to a data product (subscribe / unsubscribe)."""
    # Verify product exists
    product = await db.execute(
        select(DataProduct).where(DataProduct.id == body.product_id)
    )
    dp = product.scalar_one_or_none()
    if not dp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    if not dp.is_published:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is not published to marketplace")

    # Check current subscription state
    existing = await db.execute(
        select(MarketplaceSubscription).where(
            MarketplaceSubscription.user_id == user.id,
            MarketplaceSubscription.data_product_id == body.product_id,
        )
    )
    sub = existing.scalar_one_or_none()

    if sub:
        # Unsubscribe
        await db.delete(sub)
        dp.subscription_count = max(0, dp.subscription_count - 1)
        subscribed = False
    else:
        # Subscribe
        new_sub = MarketplaceSubscription(user_id=user.id, data_product_id=body.product_id)
        db.add(new_sub)
        dp.subscription_count += 1
        subscribed = True

    await db.commit()
    await db.refresh(dp)

    return SubscribeResponse(subscribed=subscribed, subscription_count=dp.subscription_count)
