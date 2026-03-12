from uuid import UUID

from app.schemas.common import CamelModel


class DecisionSchema(CamelModel):
    id: UUID
    type: str
    status: str
    product_id: UUID
    product_name: str
    title: str
    description: str
    initiated_by: str
    assigned_to: str
    assigned_to_title: str | None = None
    estimated_impact: float
    actual_impact: float | None = None
    impact_basis: str | None = None
    created_at: str
    updated_at: str
    resolved_at: str | None = None
    resolution: str | None = None
    # Capital impact fields
    capital_freed: float = 0
    projected_savings_monthly: float = 0
    projected_savings_annual: float = 0
    delay_reason: str | None = None
    delayed_until: str | None = None


class CreateDecisionRequest(CamelModel):
    type: str
    product_id: UUID
    title: str
    description: str
    assigned_to: str
    assigned_to_title: str | None = None
    estimated_impact: float = 0
    impact_basis: str | None = None
    projected_savings_monthly: float | None = None


class UpdateDecisionRequest(CamelModel):
    status: str | None = None
    resolution: str | None = None
    actual_impact: float | None = None
    delay_reason: str | None = None
    delayed_until: str | None = None
