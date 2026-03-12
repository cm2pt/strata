from uuid import UUID

from app.schemas.common import CamelModel


class OwnerSchema(CamelModel):
    id: UUID
    name: str
    title: str | None = None
    team: str | None = None
    avatar: str | None = None


class CostBreakdownSchema(CamelModel):
    compute: float
    storage: float
    pipeline: float
    human_estimate: float


class ConsumerTeamSchema(CamelModel):
    name: str
    consumers: int
    percentage: float


class ValueDeclarationSchema(CamelModel):
    declared_by: str
    declared_by_title: str
    method: str
    value: float
    basis: str
    status: list[str]
    declared_at: str
    next_review: str
    is_expiring: bool


class DataProductSchema(CamelModel):
    id: UUID
    name: str
    domain: str
    business_unit: str
    owner: OwnerSchema
    platform: str
    lifecycle_stage: str
    created_at: str
    updated_at: str

    # Economics
    monthly_cost: float
    cost_breakdown: CostBreakdownSchema | None = None
    declared_value: float | None = None
    usage_implied_value: float
    composite_value: float
    roi: float | None = None
    roi_band: str | None = None
    cost_trend: float
    cost_coverage: float

    # Usage
    monthly_consumers: int
    total_queries: int
    consumer_teams: list[ConsumerTeamSchema] = []
    usage_trend: float
    peak_consumers: int

    # Quality
    freshness_hours: float
    freshness_sla: float
    completeness: float
    accuracy: float
    trust_score: float

    # Marketplace
    is_published: bool
    is_certified: bool
    subscription_count: int

    # Value
    value_declaration: ValueDeclarationSchema | None = None

    # Dependencies
    downstream_products: int
    downstream_models: int
    downstream_dashboards: int

    # Flags
    is_retirement_candidate: bool
    has_cost_spike: bool
    has_usage_decline: bool


class DataProductListSchema(CamelModel):
    """Simplified schema for list views."""
    id: UUID
    name: str
    domain: str
    business_unit: str
    owner: OwnerSchema
    platform: str
    lifecycle_stage: str
    monthly_cost: float
    declared_value: float | None = None
    composite_value: float
    roi: float | None = None
    roi_band: str | None = None
    monthly_consumers: int
    trust_score: float
    is_published: bool
    is_certified: bool
    is_retirement_candidate: bool
    has_cost_spike: bool
    has_usage_decline: bool
