"""
Decision Impact Verification Engine.

After a decision of type retirement, cost_optimization, pricing_activation, or ai_project_review
is approved, start a validation window. During validation measure cost trend before vs after,
usage changes, and infrastructure cost delta. Then compute actual_savings_measured,
variance_from_projection, and confidence_score. Update the decision automatically after
the validation window closes.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.capital import CapitalEvent
from app.models.data_product import DataProduct
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.time_series import CostMonthly, ROIMonthly

# Decision types that trigger impact verification
VERIFIABLE_TYPES = {
    DecisionType.retirement,
    DecisionType.cost_investigation,  # cost_optimization mapped to this in existing enum
    DecisionType.pricing_activation,
    DecisionType.ai_project_review,
    DecisionType.low_roi_review,
}


async def start_validation(decision: Decision, db: AsyncSession) -> Decision:
    """Begin the validation window after a decision is approved."""
    now = datetime.now(timezone.utc)
    decision.impact_validation_status = "validating"
    decision.validation_start_date = now
    # validation_window_days defaults to 60 on the model
    return decision


async def compute_impact_report(
    decision: Decision,
    db: AsyncSession,
) -> dict:
    """
    Compute the impact report for a decision. Can be called at any time
    to get current validation data — not just at window close.

    Returns a dict with all the impact metrics.
    """
    product_id = decision.product_id
    org_id = decision.org_id
    resolved_at = decision.resolved_at or decision.updated_at or datetime.now(timezone.utc)
    window_days = decision.validation_window_days or 60

    # ---- Time boundaries ----
    resolved_date = resolved_at.date() if isinstance(resolved_at, datetime) else resolved_at
    # 3-month trailing average BEFORE the decision
    pre_start = resolved_date - timedelta(days=90)
    pre_end = resolved_date
    # Post-decision window
    post_start = resolved_date
    post_end = resolved_date + timedelta(days=window_days)
    today = date.today()
    effective_post_end = min(post_end, today)

    # ---- Pre-decision cost average (3-month trailing) ----
    pre_cost_result = await db.execute(
        select(func.avg(CostMonthly.total_cost)).where(
            CostMonthly.data_product_id == product_id,
            CostMonthly.month >= pre_start,
            CostMonthly.month < pre_end,
        )
    )
    pre_cost_avg = float(pre_cost_result.scalar() or 0)

    # ---- Post-decision cost average ----
    post_cost_result = await db.execute(
        select(func.avg(CostMonthly.total_cost)).where(
            CostMonthly.data_product_id == product_id,
            CostMonthly.month >= post_start,
            CostMonthly.month <= effective_post_end,
        )
    )
    post_cost_avg = float(post_cost_result.scalar() or 0)

    # ---- Cost trend data for graph ----
    cost_trend_result = await db.execute(
        select(CostMonthly.month, CostMonthly.total_cost)
        .where(
            CostMonthly.data_product_id == product_id,
            CostMonthly.month >= pre_start,
        )
        .order_by(CostMonthly.month)
    )
    cost_trend = [
        {"month": row.month.isoformat(), "cost": float(row.total_cost)}
        for row in cost_trend_result.all()
    ]

    # ---- Capital events for this decision ----
    events_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.decision_id == decision.id,
        )
    )
    capital_freed_total = float(events_result.scalar())

    # ---- Compute actual savings ----
    # Savings = pre-cost average minus post-cost average (or full cost if retired)
    product_result = await db.execute(
        select(DataProduct.lifecycle_stage, DataProduct.retired_at).where(
            DataProduct.id == product_id
        )
    )
    product_row = product_result.one_or_none()
    is_retired = product_row and str(product_row.lifecycle_stage) == "retired" if product_row else False

    if is_retired:
        actual_savings = pre_cost_avg  # all cost eliminated
    else:
        actual_savings = max(0, pre_cost_avg - post_cost_avg)

    # ---- Projected vs actual ----
    projected_monthly = float(decision.projected_savings_monthly or 0)
    if projected_monthly > 0:
        variance = actual_savings / projected_monthly
    else:
        variance = 1.0 if actual_savings > 0 else 0.0

    # ---- Confidence score (0-100) ----
    # Confidence based on: data completeness + variance proximity to 1.0
    data_months_pre = len([c for c in cost_trend if c["month"] < resolved_date.isoformat()])
    data_months_post = len([c for c in cost_trend if c["month"] >= resolved_date.isoformat()])
    data_completeness = min(1.0, (data_months_pre + data_months_post) / 6)  # 6 months = full confidence
    variance_proximity = max(0, 1.0 - abs(1.0 - variance))  # 1.0 = perfect match
    confidence = round(data_completeness * 50 + variance_proximity * 50, 1)

    # ---- Determine validation status ----
    window_complete = today >= post_end
    if window_complete:
        if variance >= 0.8:
            validation_status = "confirmed"
        elif variance < 0.5:
            validation_status = "underperforming"
        else:
            validation_status = "validating"
    else:
        validation_status = "validating"

    # ---- Narrative summary ----
    if validation_status == "confirmed":
        narrative = (
            f"Impact verified: {decision.product_name} achieved "
            f"${actual_savings:,.0f}/mo savings ({variance:.0%} of projected "
            f"${projected_monthly:,.0f}/mo). Confidence: {confidence}/100."
        )
    elif validation_status == "underperforming":
        narrative = (
            f"Underperforming: {decision.product_name} realized only "
            f"${actual_savings:,.0f}/mo ({variance:.0%} of projected "
            f"${projected_monthly:,.0f}/mo). Review recommended."
        )
    else:
        days_remaining = (post_end - today).days
        narrative = (
            f"Validating: {decision.product_name} currently at "
            f"${actual_savings:,.0f}/mo savings ({variance:.0%} of projection). "
            f"{max(0, days_remaining)} days remaining in validation window."
        )

    return {
        "decision_id": str(decision.id),
        "product_id": str(product_id),
        "product_name": decision.product_name,
        "decision_type": decision.type.value,
        "projected_savings_monthly": projected_monthly,
        "projected_savings_annual": float(decision.projected_savings_annual or 0),
        "actual_savings_measured": round(actual_savings, 2),
        "variance_from_projection": round(variance, 4),
        "confidence_score": confidence,
        "validation_status": validation_status,
        "validation_start_date": (
            decision.validation_start_date.isoformat()
            if decision.validation_start_date else None
        ),
        "validation_window_days": decision.validation_window_days or 60,
        "window_complete": window_complete,
        "pre_decision_cost_avg": round(pre_cost_avg, 2),
        "post_decision_cost_avg": round(post_cost_avg, 2),
        "capital_freed_total": round(capital_freed_total, 2),
        "cost_trend": cost_trend,
        "narrative_summary": narrative,
    }


async def run_validation_sweep(org_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """
    Sweep all approved decisions in validation window and update their status.
    Call periodically (e.g. daily cron or on-demand).
    Returns list of updated decisions.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    # Find all approved decisions that are in 'validating' status
    result = await db.execute(
        select(Decision).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.impact_validation_status == "validating",
            Decision.validation_start_date.isnot(None),
            Decision.deleted_at.is_(None),
        )
    )
    decisions = result.scalars().all()
    updated = []

    for d in decisions:
        report = await compute_impact_report(d, db)

        # Update the decision with measured values
        d.actual_savings_measured = report["actual_savings_measured"]
        d.variance_from_projection = report["variance_from_projection"]
        d.impact_confidence_score = report["confidence_score"]
        d.impact_validation_status = report["validation_status"]

        updated.append(report)

    if updated:
        await db.commit()

    return updated
