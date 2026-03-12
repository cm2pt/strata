"""Pricing simulation routes — run what-if scenarios against data products."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.data_product import DataProduct, ConsumerTeam
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class PricingSimulationRequest(BaseModel):
    product_id: uuid.UUID
    model: str  # cost_plus | usage_based | tiered | flat | value_share
    params: dict[str, float] = {}
    adoption_impact: float = 0.0  # % change in usage predicted
    revenue_neutral: bool = False

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class TeamImpactResponse(BaseModel):
    team: str
    usage: int
    charge: float
    budget_status: str  # within | over | under
    over_by: float | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ScenarioResultResponse(BaseModel):
    total_revenue: float
    total_cost: float
    net_position: float
    team_impacts: list[TeamImpactResponse]
    behavioral_prediction: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/pricing", response_model=ScenarioResultResponse)
async def simulate_pricing(
    body: PricingSimulationRequest,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("pricing:simulate")),
):
    """Run a pricing simulation against a data product."""
    result = await db.execute(
        select(DataProduct)
        .where(DataProduct.id == body.product_id, DataProduct.org_id == org_id)
        .options(selectinload(DataProduct.consumer_teams))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data product not found")

    total_cost = float(product.monthly_cost)
    consumers = product.monthly_consumers
    queries = product.total_queries
    teams: list[ConsumerTeam] = product.consumer_teams or []

    # --- Compute revenue by model ---
    markup = body.params.get("markup", 0.2)
    base_rate = body.params.get("baseRate", 0)
    per_query_rate = body.params.get("perQueryRate", 0)
    flat_fee = body.params.get("flatFee", 0)
    value_share_pct = body.params.get("valueSharePct", 0.1)

    if body.model == "cost_plus":
        total_revenue = total_cost * (1 + markup)
    elif body.model == "usage_based":
        total_revenue = (base_rate * consumers) + (per_query_rate * queries)
    elif body.model == "tiered":
        tier1_limit = int(body.params.get("tier1Limit", 100))
        tier1_rate = body.params.get("tier1Rate", 10)
        tier2_rate = body.params.get("tier2Rate", 5)
        if consumers <= tier1_limit:
            total_revenue = consumers * tier1_rate
        else:
            total_revenue = (tier1_limit * tier1_rate) + ((consumers - tier1_limit) * tier2_rate)
    elif body.model == "flat":
        total_revenue = flat_fee
    elif body.model == "value_share":
        total_revenue = float(product.composite_value) * value_share_pct
    else:
        total_revenue = total_cost  # fallback

    # Apply adoption impact
    if body.adoption_impact != 0:
        adoption_factor = 1 + (body.adoption_impact / 100)
        total_revenue *= adoption_factor

    # Revenue-neutral adjustment
    if body.revenue_neutral and total_revenue != 0:
        total_revenue = total_cost

    net_position = total_revenue - total_cost

    # --- Per-team impacts ---
    team_impacts: list[TeamImpactResponse] = []
    for t in teams:
        pct = float(t.percentage) / 100 if float(t.percentage) > 1 else float(t.percentage)
        team_charge = total_revenue * pct
        # Simple budget heuristic: assume team budget is proportional share of cost * 1.1
        team_budget = total_cost * pct * 1.1
        if team_charge <= team_budget * 0.9:
            budget_status = "under"
            over_by = None
        elif team_charge <= team_budget:
            budget_status = "within"
            over_by = None
        else:
            budget_status = "over"
            over_by = round(team_charge - team_budget, 2)

        team_impacts.append(TeamImpactResponse(
            team=t.team_name,
            usage=t.consumers,
            charge=round(team_charge, 2),
            budget_status=budget_status,
            over_by=over_by,
        ))

    # --- Behavioral prediction ---
    if body.adoption_impact < -10:
        prediction = "Significant usage reduction expected. Teams may seek alternatives or reduce query frequency."
    elif body.adoption_impact < 0:
        prediction = "Moderate usage reduction expected. Some non-critical consumers may drop off."
    elif body.adoption_impact > 10:
        prediction = "Strong adoption growth expected. Consider capacity planning for increased load."
    elif body.adoption_impact > 0:
        prediction = "Slight adoption increase expected. Pricing is competitive with alternatives."
    else:
        prediction = "No significant behavioral change expected at this price point."

    return ScenarioResultResponse(
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        net_position=round(net_position, 2),
        team_impacts=team_impacts,
        behavioral_prediction=prediction,
    )
