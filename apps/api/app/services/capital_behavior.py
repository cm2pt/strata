"""
Capital Behavior Metrics — governance hygiene indicators.

5 metrics computed from existing models:
1. Decision velocity — average days from creation to resolution
2. Value declaration coverage — % of products with a value declaration
3. Review overdue rate — % of value declarations past next_review
4. Enforcement trigger rate — % of products flagged by automated rules
5. Impact confirmation rate — % of approved decisions with confirmed impact
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus
from app.models.value import ValueDeclaration


async def compute_capital_behavior(
    org_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """
    Compute 5 governance behavior metrics for an org.
    Every metric is derived from existing tables — no arbitrary inputs.
    """

    # ---- 1. Decision Velocity (avg days from creation to resolution) ----
    velocity_result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Decision.resolved_at) -
                func.extract("epoch", Decision.created_at)
            ) / 86400  # convert seconds to days
        ).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.resolved_at.isnot(None),
        )
    )
    avg_velocity_days = float(velocity_result.scalar() or 0)

    # ---- 2. Value Declaration Coverage ----
    total_products_result = await db.execute(
        select(func.count(DataProduct.id)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    total_products = total_products_result.scalar() or 0

    products_with_value_result = await db.execute(
        select(func.count(ValueDeclaration.id)).where(
            ValueDeclaration.data_product_id.in_(
                select(DataProduct.id).where(
                    DataProduct.org_id == org_id,
                    DataProduct.lifecycle_stage != LifecycleStage.retired,
                )
            ),
        )
    )
    products_with_value = products_with_value_result.scalar() or 0
    value_coverage_pct = round(products_with_value / total_products * 100, 1) if total_products > 0 else 0

    # ---- 3. Review Overdue Rate ----
    today = date.today()
    total_declarations_result = await db.execute(
        select(func.count(ValueDeclaration.id)).where(
            ValueDeclaration.data_product_id.in_(
                select(DataProduct.id).where(
                    DataProduct.org_id == org_id,
                    DataProduct.lifecycle_stage != LifecycleStage.retired,
                )
            ),
        )
    )
    total_declarations = total_declarations_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count(ValueDeclaration.id)).where(
            ValueDeclaration.data_product_id.in_(
                select(DataProduct.id).where(
                    DataProduct.org_id == org_id,
                    DataProduct.lifecycle_stage != LifecycleStage.retired,
                )
            ),
            ValueDeclaration.next_review < today,
        )
    )
    overdue_count = overdue_result.scalar() or 0
    review_overdue_pct = round(overdue_count / total_declarations * 100, 1) if total_declarations > 0 else 0

    # ---- 4. Enforcement Trigger Rate ----
    flagged_result = await db.execute(
        select(func.count(DataProduct.id)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
            (DataProduct.is_retirement_candidate == True) |  # noqa: E712
            (DataProduct.has_cost_spike == True) |  # noqa: E712
            (DataProduct.has_usage_decline == True),  # noqa: E712
        )
    )
    flagged_count = flagged_result.scalar() or 0
    enforcement_trigger_rate = round(flagged_count / total_products * 100, 1) if total_products > 0 else 0

    # ---- 5. Impact Confirmation Rate ----
    total_approved_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
        )
    )
    total_approved = total_approved_result.scalar() or 0

    confirmed_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.impact_validation_status == "confirmed",
        )
    )
    confirmed_count = confirmed_result.scalar() or 0
    impact_confirmation_rate = round(confirmed_count / total_approved * 100, 1) if total_approved > 0 else 0

    # ---- Governance Health Score (0-100) ----
    # Normalize each metric to 0-100 scale, then average
    # Higher is better for: value_coverage, impact_confirmation_rate
    # Lower is better for: review_overdue_pct, enforcement_trigger_rate
    # Decision velocity: target 14 days, 0 days = 100, 60+ days = 0
    velocity_score = max(0, min(100, (1 - avg_velocity_days / 60) * 100))
    coverage_score = value_coverage_pct  # already 0-100
    overdue_score = max(0, 100 - review_overdue_pct)  # invert: 0% overdue = 100
    enforcement_score = max(0, 100 - enforcement_trigger_rate)  # invert: 0% flagged = 100
    confirmation_score = impact_confirmation_rate  # already 0-100

    governance_health_score = round(
        (velocity_score + coverage_score + overdue_score + enforcement_score + confirmation_score) / 5,
        1,
    )

    return {
        "avg_decision_velocity_days": round(avg_velocity_days, 1),
        "value_declaration_coverage_pct": value_coverage_pct,
        "review_overdue_pct": review_overdue_pct,
        "enforcement_trigger_rate": enforcement_trigger_rate,
        "impact_confirmation_rate": impact_confirmation_rate,
        "governance_health_score": governance_health_score,
    }
