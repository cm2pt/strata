"""Benchmark routes — industry benchmark data."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.config import BenchmarkData
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class BenchmarkDataPointResponse(BaseModel):
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

@router.get("/", response_model=list[BenchmarkDataPointResponse])
async def list_benchmarks(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("portfolio:read")),
):
    """Return all industry benchmark data points."""
    result = await db.execute(select(BenchmarkData).order_by(BenchmarkData.industry))
    rows = result.scalars().all()
    return [
        BenchmarkDataPointResponse(
            industry=row.industry.value,
            label=row.label,
            median_roi=float(row.median_roi),
            median_cost_per_consumer=float(row.median_cost_per_consumer),
            median_portfolio_roi=float(row.median_portfolio_roi),
            p25_roi=float(row.p25_roi),
            p75_roi=float(row.p75_roi),
            sample_size=row.sample_size,
        )
        for row in rows
    ]
