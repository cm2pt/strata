"""
Enforcement Triggers — automated rules that create decisions, notifications,
and audit events when capital governance thresholds are breached.

Rules:
1. ROI < 0.5x for 3 consecutive months → auto-create Decision(type="low_roi_review")
2. Usage decay > 60% sustained 90 days → auto-create Decision(type="retirement")
3. Cost spike > 40% MoM → auto-create Decision(type="cost_investigation")
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.config import Notification, NotificationType
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.time_series import CostMonthly, ROIMonthly, UsageMonthly


async def run_enforcement_sweep(
    org_id: uuid.UUID,
    db: AsyncSession,
    initiator: str = "system",
) -> dict:
    """
    Run all enforcement trigger rules for an org.
    Returns a summary of actions taken.
    """
    results = {
        "low_roi_decisions": [],
        "retirement_decisions": [],
        "cost_anomaly_decisions": [],
        "total_created": 0,
    }

    # Get all non-retired products
    product_result = await db.execute(
        select(DataProduct).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    products = product_result.scalars().all()

    for product in products:
        # Check if there's already an open decision for this product
        existing = await _has_open_decision(product.id, db)

        # ---- Rule 1: Low ROI for 3 consecutive months ----
        if not existing:
            low_roi = await _check_low_roi(product, org_id, db)
            if low_roi:
                d = await _create_enforcement_decision(
                    org_id=org_id,
                    product=product,
                    decision_type=DecisionType.low_roi_review,
                    title=f"Low ROI review: {product.name} below 0.5x for 3 months",
                    description=(
                        f"{product.name} has maintained ROI below 0.5x for 3 consecutive months. "
                        f"Current cost: ${float(product.monthly_cost):,.0f}/mo. "
                        f"Recommend optimization or retirement review."
                    ),
                    estimated_savings=float(product.monthly_cost) * 0.3,  # conservative 30% savings estimate
                    notification_type=NotificationType.lifecycle_change,
                    initiator=initiator,
                    db=db,
                )
                results["low_roi_decisions"].append(str(d.id))
                results["total_created"] += 1
                existing = True  # prevent duplicate triggers

        # ---- Rule 2: Usage decay > 60% sustained 90 days ----
        if not existing:
            usage_decay = await _check_usage_decay(product, db)
            if usage_decay:
                d = await _create_enforcement_decision(
                    org_id=org_id,
                    product=product,
                    decision_type=DecisionType.retirement,
                    title=f"Retirement candidate: {product.name} usage dropped >60%",
                    description=(
                        f"{product.name} has experienced >60% usage decline sustained for 90+ days. "
                        f"Peak consumers: {product.peak_consumers}, current: {product.monthly_consumers}. "
                        f"Monthly cost: ${float(product.monthly_cost):,.0f}."
                    ),
                    estimated_savings=float(product.monthly_cost),
                    notification_type=NotificationType.retirement_candidate,
                    initiator=initiator,
                    db=db,
                )
                # Also flag the product
                product.is_retirement_candidate = True
                product.has_usage_decline = True
                results["retirement_decisions"].append(str(d.id))
                results["total_created"] += 1
                existing = True

        # ---- Rule 3: Cost spike > 40% MoM ----
        if not existing:
            cost_spike = await _check_cost_spike(product, db)
            if cost_spike:
                d = await _create_enforcement_decision(
                    org_id=org_id,
                    product=product,
                    decision_type=DecisionType.cost_investigation,
                    title=f"Cost anomaly: {product.name} spiked >40% MoM",
                    description=(
                        f"{product.name} cost increased by >40% month-over-month. "
                        f"Current cost: ${float(product.monthly_cost):,.0f}/mo. "
                        f"Investigation required."
                    ),
                    estimated_savings=float(product.monthly_cost) * 0.2,
                    notification_type=NotificationType.cost_spike,
                    initiator=initiator,
                    db=db,
                )
                product.has_cost_spike = True
                results["cost_anomaly_decisions"].append(str(d.id))
                results["total_created"] += 1

    if results["total_created"] > 0:
        await db.commit()

    return results


async def _has_open_decision(product_id: uuid.UUID, db: AsyncSession) -> bool:
    """Check if there's already an under_review decision for this product."""
    result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.product_id == product_id,
            Decision.status == DecisionStatus.under_review,
        )
    )
    return result.scalar() > 0


async def _check_low_roi(product: DataProduct, org_id: uuid.UUID, db: AsyncSession) -> bool:
    """ROI < 0.5x for 3 consecutive months."""
    three_months_ago = date.today() - timedelta(days=90)
    result = await db.execute(
        select(ROIMonthly.roi)
        .where(
            ROIMonthly.data_product_id == product.id,
            ROIMonthly.month >= three_months_ago,
        )
        .order_by(ROIMonthly.month.desc())
        .limit(3)
    )
    rows = result.scalars().all()
    if len(rows) < 3:
        return False
    return all(r is not None and float(r) < 0.5 for r in rows)


async def _check_usage_decay(product: DataProduct, db: AsyncSession) -> bool:
    """Usage dropped > 60% from peak, sustained for 90+ days."""
    peak = product.peak_consumers or 0
    current = product.monthly_consumers or 0

    if peak <= 0:
        return False

    decay_ratio = (peak - current) / peak
    if decay_ratio <= 0.6:
        return False

    # Check that usage has been this low for 3 months
    three_months_ago = date.today() - timedelta(days=90)
    result = await db.execute(
        select(UsageMonthly.consumers)
        .where(
            UsageMonthly.data_product_id == product.id,
            UsageMonthly.month >= three_months_ago,
        )
        .order_by(UsageMonthly.month.desc())
        .limit(3)
    )
    rows = result.scalars().all()
    if len(rows) < 3:
        return False

    threshold = peak * 0.4  # 60% decay means <= 40% of peak
    return all(c <= threshold for c in rows)


async def _check_cost_spike(product: DataProduct, db: AsyncSession) -> bool:
    """Cost increased > 40% month-over-month."""
    result = await db.execute(
        select(CostMonthly.total_cost)
        .where(CostMonthly.data_product_id == product.id)
        .order_by(CostMonthly.month.desc())
        .limit(2)
    )
    rows = result.scalars().all()
    if len(rows) < 2:
        return False

    current_cost = float(rows[0])
    previous_cost = float(rows[1])

    if previous_cost <= 0:
        return False

    increase_pct = (current_cost - previous_cost) / previous_cost
    return increase_pct > 0.40


async def _create_enforcement_decision(
    org_id: uuid.UUID,
    product: DataProduct,
    decision_type: DecisionType,
    title: str,
    description: str,
    estimated_savings: float,
    notification_type: NotificationType,
    initiator: str,
    db: AsyncSession,
) -> Decision:
    """Create a decision, notification, and audit log for an enforcement trigger."""
    decision = Decision(
        org_id=org_id,
        type=decision_type,
        product_id=product.id,
        product_name=product.name,
        title=title,
        description=description,
        initiated_by=initiator,
        assigned_to="CDO",
        assigned_to_title="Chief Data Officer",
        estimated_impact=estimated_savings,
        projected_savings_monthly=estimated_savings,
        projected_savings_annual=estimated_savings * 12,
    )
    db.add(decision)
    await db.flush()  # get decision.id

    # Create notification
    notification = Notification(
        org_id=org_id,
        type=notification_type,
        title=title,
        description=description,
        product_id=product.id,
        product_name=product.name,
    )
    db.add(notification)

    # Audit log
    audit = AuditLog(
        org_id=org_id,
        user_id=None,  # system-generated
        action=f"enforcement.{decision_type.value}",
        entity_type="decision",
        entity_id=str(decision.id),
        metadata_json={
            "product_id": str(product.id),
            "product_name": product.name,
            "trigger_type": decision_type.value,
            "estimated_savings": estimated_savings,
        },
    )
    db.add(audit)

    return decision
