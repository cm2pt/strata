"""Organization info endpoint — returns org metadata for the frontend."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id
from app.models.org import Organization, Team
from app.models.user import User, UserOrgRole, UserRole
from app.models.config import PolicyConfig

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


class OrgInfoResponse(BaseModel):
    name: str
    slug: str
    industry: str | None
    team_count: int
    user_count: int
    role_count: int
    value_weights: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


@router.get("/", response_model=OrgInfoResponse)
async def get_org_info(db: DbSession, org_id: OrgId):
    # Organization basics
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    name = org.name if org else "Unknown"
    slug = org.slug if org else "unknown"
    industry = org.industry if org else None

    # Counts
    team_count = (await db.execute(
        select(func.count()).select_from(Team).where(Team.org_id == org_id)
    )).scalar() or 0

    user_count = (await db.execute(
        select(func.count(func.distinct(UserOrgRole.user_id))).where(UserOrgRole.org_id == org_id)
    )).scalar() or 0

    role_count = (await db.execute(
        select(func.count(func.distinct(UserOrgRole.role))).where(UserOrgRole.org_id == org_id)
    )).scalar() or 0

    # Value weights from policy config
    weight_row = (await db.execute(
        select(PolicyConfig.current_value).where(
            PolicyConfig.org_id == org_id,
            PolicyConfig.name == "Value Composite Weights",
        )
    )).scalar_one_or_none()
    value_weights = weight_row or "70/30 declared/usage"

    return OrgInfoResponse(
        name=name,
        slug=slug,
        industry=industry,
        team_count=team_count,
        user_count=user_count,
        role_count=role_count,
        value_weights=value_weights,
    )
