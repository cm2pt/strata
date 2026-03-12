from uuid import UUID

from app.schemas.common import CamelModel


class CapitalEventSchema(CamelModel):
    id: UUID
    decision_id: UUID
    product_id: UUID | None = None
    event_type: str
    amount: float
    description: str
    effective_date: str
    created_at: str


class CapitalFreedMonthSchema(CamelModel):
    month: str
    amount: float
    cumulative: float


class CapitalByTypeSchema(CamelModel):
    type: str
    amount: float


class SavingsSummarySchema(CamelModel):
    total_capital_freed_monthly: float
    total_capital_freed_annual: float
    capital_freed_by_month: list[CapitalFreedMonthSchema]
    pending_retirements: int
    pending_estimated_savings: float
    approved_retirements: int
    decisions_this_quarter: int


class CapitalImpactSummarySchema(CamelModel):
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
    capital_freed_by_month: list[CapitalFreedMonthSchema]
    capital_by_type: list[CapitalByTypeSchema]
    recent_events: list[CapitalEventSchema]
