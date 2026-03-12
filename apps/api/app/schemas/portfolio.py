from app.schemas.common import CamelModel


class PortfolioSummarySchema(CamelModel):
    total_products: int
    total_cost: float
    average_roi: float
    roi_trend: float
    total_consumers: int
    consumers_trend: float
    active_subscriptions: int
    retirement_candidates: int
    estimated_savings: float
    cost_coverage: float
    products_with_value: int
    new_products_this_quarter: int


class CostTrendPointSchema(CamelModel):
    month: str
    cost: float
    value: float


class ROIHistoryPointSchema(CamelModel):
    month: str
    roi: float | None = None
    cost: float
    composite_value: float


class ExecutiveInsightSchema(CamelModel):
    id: str
    type: str
    title: str
    description: str
    product_ids: list[str]
    financial_impact: float | None = None


class DoNothingProjectionSchema(CamelModel):
    current_monthly_cost: float
    projected_monthly_cost: float
    current_roi: float
    projected_roi: float
    projected_wasted_spend: float
    projected_value_at_risk: float
    months: int
    assumptions: list[str]


class ExecutiveSummarySchema(CamelModel):
    generated_at: str
    confidence_level: float
    confidence_basis: str
    insights: list[ExecutiveInsightSchema]
    do_nothing_projection: DoNothingProjectionSchema
