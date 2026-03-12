"""
Capital Drift & Liability Projection Engine.

Deterministic 36-month forward simulation under 3 governance scenarios:
- Passive: No decisions, unchecked cost growth
- Governance: Retirements + cost optimizations at current velocity
- Active Capital: Full governance + AI kills + pricing + reallocation

All rates are module-level constants. No randomness.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_scorecard import AIProjectRiskLevel, AIProjectScorecard
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.pricing import PricingPolicy, PricingPolicyStatus
from app.models.value import ValueDeclaration
from app.services.capital_efficiency import compute_capital_efficiency

# ── Deterministic constants ────────────────────────────────────────────────────

AI_SPEND_GROWTH_RATE = 0.08  # 8 % monthly if unmanaged
DECLINE_COST_DECAY = 0.02  # 2 % monthly
DECLINE_VALUE_DECAY = 0.05  # 5 % monthly (widens loss gap)
COST_INFLATION = 0.015  # 1.5 % monthly base
PRICING_REVENUE_GROWTH = 0.03  # 3 % monthly
RETIREMENT_BACKLOG_GROWTH = 2  # products per quarter
OPTIMAL_VELOCITY_DAYS = 14
CEI_DECAY_RATE = 0.5  # points / month when governance weak
CEI_RECOVERY_RATE = 0.8  # points / month under full governance
COST_OPTIMIZATION_RATE = 0.05  # 5 % monthly reduction of flagged cost


# ── Snapshot collection ────────────────────────────────────────────────────────

async def _collect_snapshot(org_id: uuid.UUID, db: AsyncSession) -> dict:
    """Gather the current-state metrics needed to seed all three simulations."""

    non_retired = and_(
        DataProduct.org_id == org_id,
        DataProduct.lifecycle_stage != LifecycleStage.retired,
    )

    # Total cost / value / average ROI
    agg = await db.execute(
        select(
            func.coalesce(func.sum(DataProduct.monthly_cost), 0),
            func.coalesce(func.sum(DataProduct.composite_value), 0),
        ).where(non_retired)
    )
    total_cost, total_value = (float(v) for v in agg.one())

    # Cost-weighted ROI (canonical: SUM(value) / SUM(cost), not simple AVG)
    average_roi = total_value / total_cost if total_cost > 0 else 0

    # AI spend
    ai_agg = await db.execute(
        select(
            func.coalesce(func.sum(AIProjectScorecard.monthly_cost), 0),
        ).where(AIProjectScorecard.org_id == org_id)
    )
    ai_spend = float(ai_agg.scalar())

    ai_flagged = await db.execute(
        select(
            func.count(AIProjectScorecard.id),
            func.coalesce(func.sum(AIProjectScorecard.monthly_cost), 0),
        ).where(
            AIProjectScorecard.org_id == org_id,
            AIProjectScorecard.risk_level.in_([AIProjectRiskLevel.high, AIProjectRiskLevel.critical]),
        )
    )
    ai_flagged_count, ai_flagged_cost = (int(ai_flagged.one()[0]), float(ai_flagged.one()[1])) if False else (0, 0.0)
    row = (await db.execute(
        select(
            func.count(AIProjectScorecard.id),
            func.coalesce(func.sum(AIProjectScorecard.monthly_cost), 0),
        ).where(
            AIProjectScorecard.org_id == org_id,
            AIProjectScorecard.risk_level.in_([AIProjectRiskLevel.high, AIProjectRiskLevel.critical]),
        )
    )).one()
    ai_flagged_count = int(row[0])
    ai_flagged_cost = float(row[1])

    # Decline-stage products
    decline = await db.execute(
        select(
            func.count(DataProduct.id),
            func.coalesce(func.sum(DataProduct.monthly_cost), 0),
            func.coalesce(func.sum(DataProduct.composite_value), 0),
        ).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage == LifecycleStage.decline,
        )
    )
    decline_row = decline.one()
    decline_count = int(decline_row[0])
    decline_cost = float(decline_row[1])
    decline_value = float(decline_row[2])

    # Decision velocity (avg days from created to resolved for approved)
    vel = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Decision.resolved_at)
                - func.extract("epoch", Decision.created_at)
            )
        ).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.resolved_at.isnot(None),
        )
    )
    avg_seconds = vel.scalar()
    decision_velocity_days = round(float(avg_seconds) / 86400, 1) if avg_seconds else 30.0

    # Value coverage
    total_products_r = await db.execute(
        select(func.count(DataProduct.id)).where(non_retired)
    )
    total_products = int(total_products_r.scalar() or 0)

    products_with_val = await db.execute(
        select(func.count(ValueDeclaration.id)).where(
            ValueDeclaration.data_product_id.in_(
                select(DataProduct.id).where(non_retired)
            )
        )
    )
    val_count = int(products_with_val.scalar() or 0)
    value_coverage_pct = round(val_count / total_products * 100, 1) if total_products else 0

    # Enforcement rate
    flagged_r = await db.execute(
        select(func.count(DataProduct.id)).where(
            non_retired,
            (DataProduct.is_retirement_candidate == True)  # noqa: E712
            | (DataProduct.has_cost_spike == True)  # noqa: E712
            | (DataProduct.has_usage_decline == True),  # noqa: E712
        )
    )
    flagged = int(flagged_r.scalar() or 0)
    enforcement_rate = round(flagged / total_products * 100, 1) if total_products else 0

    # Retirement backlog
    backlog_r = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.type.in_([DecisionType.retirement, DecisionType.low_roi_review]),
            Decision.status == DecisionStatus.under_review,
        )
    )
    retirement_backlog = int(backlog_r.scalar() or 0)

    # CEI score
    cei = await compute_capital_efficiency(org_id, db)
    cei_score = float(cei.get("score", 50))

    # Pricing revenue
    pricing_r = await db.execute(
        select(func.coalesce(func.sum(PricingPolicy.projected_revenue), 0)).where(
            PricingPolicy.org_id == org_id,
            PricingPolicy.status == PricingPolicyStatus.active,
        )
    )
    pricing_revenue = float(pricing_r.scalar())

    # Capital freed cumulative (retirement + cost optimization only — R4)
    _FREED_EVENT_TYPES = [CapitalEventType.retirement_freed, CapitalEventType.cost_optimization]
    freed_r = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
            CapitalEvent.event_type.in_(_FREED_EVENT_TYPES),
        )
    )
    capital_freed_cumulative = float(freed_r.scalar())

    # Non-decline cost (for inflation calculation)
    non_decline_cost = total_cost - decline_cost

    # Average decline product cost (for retirement savings calc)
    avg_decline_cost = decline_cost / decline_count if decline_count else 0

    return {
        "total_cost": total_cost,
        "total_value": total_value,
        "average_roi": round(average_roi, 4),
        "ai_spend": ai_spend,
        "ai_flagged_count": ai_flagged_count,
        "ai_flagged_cost": ai_flagged_cost,
        "decline_count": decline_count,
        "decline_cost": decline_cost,
        "decline_value": decline_value,
        "non_decline_cost": non_decline_cost,
        "avg_decline_cost": avg_decline_cost,
        "decision_velocity_days": decision_velocity_days,
        "value_coverage_pct": value_coverage_pct,
        "enforcement_rate": enforcement_rate,
        "retirement_backlog": retirement_backlog,
        "cei_score": cei_score,
        "pricing_revenue": pricing_revenue,
        "capital_freed_cumulative": capital_freed_cumulative,
    }


# ── Simulation functions ───────────────────────────────────────────────────────

def _simulate_passive(s: dict) -> list[dict]:
    """Passive Mode — no decisions, unchecked growth."""
    months: list[dict] = []
    cost = s["total_cost"]
    value = s["total_value"]
    ai = s["ai_spend"]
    decline_c = s["decline_cost"]
    decline_v = s["decline_value"]
    non_decline_c = s["non_decline_cost"]
    backlog = s["retirement_backlog"]
    cei = s["cei_score"]
    freed = s["capital_freed_cumulative"]
    gov_score = 100 - (s["enforcement_rate"] * 0.3 + (100 - s["value_coverage_pct"]) * 0.3 + min(s["decision_velocity_days"], 60) * 0.4 / 60 * 100 * 0.4)
    gov_score = max(0, min(100, gov_score))

    for m in range(1, 37):
        # AI spend grows unchecked
        ai *= (1 + AI_SPEND_GROWTH_RATE)
        # Decline cost decays slowly, value decays faster
        decline_c *= (1 - DECLINE_COST_DECAY)
        decline_v *= (1 - DECLINE_VALUE_DECAY)
        # Non-decline cost inflates
        non_decline_c *= (1 + COST_INFLATION)
        # Backlog grows every quarter
        if m % 3 == 0:
            backlog += RETIREMENT_BACKLOG_GROWTH
        # CEI decays
        cei = max(0, cei - CEI_DECAY_RATE)
        # Governance erodes
        gov_score = max(0, gov_score - 0.4)

        total_c = non_decline_c + decline_c + ai
        total_v = value * (1 - 0.005 * m / 36)  # Slight value erosion from neglect
        total_v = max(total_v - decline_v * 0.01 * m, 0)  # Further drain from decline
        roi = total_v / total_c if total_c > 0 else 0

        months.append({
            "month": m,
            "projected_cost": round(total_c, 2),
            "projected_value": round(total_v, 2),
            "projected_roi": round(roi, 4),
            "projected_cei": round(cei, 1),
            "capital_liability": 0,  # computed post-hoc
            "ai_spend": round(ai, 2),
            "retirement_backlog": backlog,
            "governance_score": round(gov_score, 1),
            "capital_freed_cumulative": round(freed, 2),
            "missed_capital_freed": 0,  # computed post-hoc
        })

    return months


def _simulate_governance(s: dict) -> list[dict]:
    """Governance Mode — retirements + cost optimizations at current velocity."""
    months: list[dict] = []
    cost = s["total_cost"]
    value = s["total_value"]
    ai = s["ai_spend"]
    decline_c = s["decline_cost"]
    decline_v = s["decline_value"]
    non_decline_c = s["non_decline_cost"]
    backlog = s["retirement_backlog"]
    cei = s["cei_score"]
    freed = s["capital_freed_cumulative"]
    velocity = s["decision_velocity_days"]
    velocity_factor = min(1.0, OPTIMAL_VELOCITY_DAYS / max(velocity, 1))
    avg_retire_cost = s["avg_decline_cost"]
    flagged_cost = s["decline_cost"] * 0.3  # Approx flagged product cost

    gov_score = 100 - (s["enforcement_rate"] * 0.3 + (100 - s["value_coverage_pct"]) * 0.3 + min(velocity, 60) / 60 * 100 * 0.4)
    gov_score = max(0, min(100, gov_score))

    for m in range(1, 37):
        # AI spend still grows unchecked (no kills in governance mode)
        ai *= (1 + AI_SPEND_GROWTH_RATE)
        # Retirements processed at current velocity
        retired_this_month = velocity_factor * max(backlog, 0) * 0.15
        retire_savings = retired_this_month * avg_retire_cost
        decline_c = max(0, decline_c * (1 - DECLINE_COST_DECAY) - retire_savings)
        decline_v *= (1 - DECLINE_VALUE_DECAY * 0.7)  # Slower value loss with governance
        # Cost optimization on flagged products
        opt_savings = flagged_cost * COST_OPTIMIZATION_RATE
        flagged_cost = max(0, flagged_cost - opt_savings)
        non_decline_c = non_decline_c * (1 + COST_INFLATION) - opt_savings * 0.5
        # Backlog managed — slower growth
        if m % 3 == 0:
            backlog = max(0, backlog + RETIREMENT_BACKLOG_GROWTH - int(retired_this_month * 3))
        # CEI decays slower
        cei = max(0, cei - CEI_DECAY_RATE * 0.5)
        # Governance stable
        gov_score = max(0, min(100, gov_score - 0.15))
        # Capital freed accumulates
        freed += retire_savings + opt_savings

        total_c = non_decline_c + decline_c + ai
        total_v = value * (1 - 0.002 * m / 36)
        roi = total_v / total_c if total_c > 0 else 0

        months.append({
            "month": m,
            "projected_cost": round(total_c, 2),
            "projected_value": round(total_v, 2),
            "projected_roi": round(roi, 4),
            "projected_cei": round(cei, 1),
            "capital_liability": 0,
            "ai_spend": round(ai, 2),
            "retirement_backlog": backlog,
            "governance_score": round(gov_score, 1),
            "capital_freed_cumulative": round(freed, 2),
            "missed_capital_freed": 0,
        })

    return months


def _simulate_active(s: dict) -> list[dict]:
    """Active Capital Mode — full governance + AI kills + pricing + reallocation."""
    months: list[dict] = []
    cost = s["total_cost"]
    value = s["total_value"]
    ai = s["ai_spend"]
    ai_flagged_cost = s["ai_flagged_cost"]
    decline_c = s["decline_cost"]
    decline_v = s["decline_value"]
    non_decline_c = s["non_decline_cost"]
    backlog = s["retirement_backlog"]
    cei = s["cei_score"]
    freed = s["capital_freed_cumulative"]
    velocity = s["decision_velocity_days"]
    avg_retire_cost = s["avg_decline_cost"]
    flagged_cost = s["decline_cost"] * 0.3
    pricing_rev = s["pricing_revenue"]
    realloc_benefit = s["decline_cost"] * 0.05  # 5% reallocation from decline to top

    gov_score = 100 - (s["enforcement_rate"] * 0.3 + (100 - s["value_coverage_pct"]) * 0.3 + min(velocity, 60) / 60 * 100 * 0.4)
    gov_score = max(0, min(100, gov_score))

    # AI kill schedule: eliminate flagged AI cost over first 3 months
    ai_kill_per_month = ai_flagged_cost / 3 if ai_flagged_cost > 0 else 0

    for m in range(1, 37):
        # Velocity improves toward optimal
        velocity = max(OPTIMAL_VELOCITY_DAYS, velocity - 1)
        velocity_factor = min(1.0, OPTIMAL_VELOCITY_DAYS / max(velocity, 1))

        # AI kills in first 3 months
        if m <= 3 and ai_kill_per_month > 0:
            ai = max(0, ai - ai_kill_per_month)
            freed += ai_kill_per_month
        # AI spend grows (but from a lower base after kills)
        ai *= (1 + AI_SPEND_GROWTH_RATE * 0.5)  # Growth rate halved under active management

        # Aggressive retirements
        retired_this_month = velocity_factor * max(backlog, 0) * 0.25
        retire_savings = retired_this_month * avg_retire_cost
        decline_c = max(0, decline_c * (1 - DECLINE_COST_DECAY) - retire_savings)
        decline_v *= (1 - DECLINE_VALUE_DECAY * 0.5)
        # Cost optimization
        opt_savings = flagged_cost * COST_OPTIMIZATION_RATE * 1.5  # More aggressive
        flagged_cost = max(0, flagged_cost - opt_savings)
        non_decline_c = non_decline_c * (1 + COST_INFLATION * 0.7) - opt_savings * 0.5  # Lower inflation
        # Pricing revenue grows
        pricing_rev *= (1 + PRICING_REVENUE_GROWTH)
        # Reallocation improves value
        value += realloc_benefit * 0.3  # Reinvested capital generates value
        realloc_benefit *= 0.98  # Diminishing returns

        # Backlog shrinks
        if m % 3 == 0:
            backlog = max(0, backlog - int(retired_this_month * 3))
        # CEI improves
        cei = min(95, cei + CEI_RECOVERY_RATE)
        # Governance improves
        gov_score = min(95, gov_score + 0.3)
        # Capital freed
        freed += retire_savings + opt_savings + pricing_rev

        total_c = non_decline_c + decline_c + ai
        total_v = value * (1 + 0.001 * m / 36)  # Value grows with active management
        roi = total_v / total_c if total_c > 0 else 0

        months.append({
            "month": m,
            "projected_cost": round(total_c, 2),
            "projected_value": round(total_v, 2),
            "projected_roi": round(roi, 4),
            "projected_cei": round(cei, 1),
            "capital_liability": 0,
            "ai_spend": round(ai, 2),
            "retirement_backlog": backlog,
            "governance_score": round(gov_score, 1),
            "capital_freed_cumulative": round(freed, 2),
            "missed_capital_freed": 0,
        })

    return months


# ── Post-hoc derived metrics ──────────────────────────────────────────────────

def _compute_derived(passive: list[dict], governance: list[dict], active: list[dict]) -> None:
    """Compute capital_liability and missed_capital_freed in-place."""
    cum_liability_p = 0.0
    cum_liability_g = 0.0

    for i in range(len(passive)):
        # Liability = cumulative excess cost vs active
        cum_liability_p += passive[i]["projected_cost"] - active[i]["projected_cost"]
        cum_liability_g += governance[i]["projected_cost"] - active[i]["projected_cost"]
        passive[i]["capital_liability"] = round(cum_liability_p, 2)
        governance[i]["capital_liability"] = round(cum_liability_g, 2)
        active[i]["capital_liability"] = 0

        # Missed capital freed
        passive[i]["missed_capital_freed"] = round(
            active[i]["capital_freed_cumulative"] - passive[i]["capital_freed_cumulative"], 2
        )
        governance[i]["missed_capital_freed"] = round(
            active[i]["capital_freed_cumulative"] - governance[i]["capital_freed_cumulative"], 2
        )


def _compute_drift_delta(passive: list[dict], active: list[dict]) -> dict:
    """ROI drift, cost drift, and liability at 12/24/36 month marks."""
    def _at(months: list[dict], idx: int) -> dict:
        return months[min(idx, len(months) - 1)]

    p12, a12 = _at(passive, 11), _at(active, 11)
    p24, a24 = _at(passive, 23), _at(active, 23)
    p36, a36 = _at(passive, 35), _at(active, 35)

    return {
        "roi_drift_12m": round(p12["projected_roi"] - a12["projected_roi"], 4),
        "roi_drift_24m": round(p24["projected_roi"] - a24["projected_roi"], 4),
        "roi_drift_36m": round(p36["projected_roi"] - a36["projected_roi"], 4),
        "cost_drift_12m": round(p12["projected_cost"] - a12["projected_cost"], 2),
        "liability_12m": round(p12["capital_liability"], 2),
        "liability_24m": round(p24["capital_liability"], 2),
        "liability_36m": round(p36["capital_liability"], 2),
    }


def _compute_liability_estimate(
    passive: list[dict], governance: list[dict], active: list[dict]
) -> dict:
    """Total 36-month liability aggregates."""
    p36 = passive[-1]
    g36 = governance[-1]
    a36 = active[-1]

    return {
        "total_passive_liability_36m": round(p36["capital_liability"], 2),
        "total_governance_gap_36m": round(g36["capital_liability"], 2),
        "capital_freed_active_36m": round(a36["capital_freed_cumulative"], 2),
        "ai_exposure_passive_36m": round(p36["ai_spend"] * 36, 2),  # Annualized AI liability
    }


# ── Public API ─────────────────────────────────────────────────────────────────

async def compute_capital_projection(
    org_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """
    36-month deterministic capital projection under 3 governance scenarios.

    Returns scenarios (passive/governance/active), drift deltas,
    liability estimates, and the current snapshot.
    """
    snapshot = await _collect_snapshot(org_id, db)

    passive = _simulate_passive(snapshot)
    governance = _simulate_governance(snapshot)
    active = _simulate_active(snapshot)

    _compute_derived(passive, governance, active)

    return {
        "scenarios": {
            "passive": {"label": "Passive Mode", "months": passive},
            "governance": {"label": "Governance Mode", "months": governance},
            "active": {"label": "Active Capital Mode", "months": active},
        },
        "drift_delta": _compute_drift_delta(passive, active),
        "liability_estimate": _compute_liability_estimate(passive, governance, active),
        "current_snapshot": {
            "total_cost": snapshot["total_cost"],
            "total_value": snapshot["total_value"],
            "average_roi": snapshot["average_roi"],
            "ai_spend": snapshot["ai_spend"],
            "decline_cost": snapshot["decline_cost"],
            "decision_velocity_days": snapshot["decision_velocity_days"],
            "value_coverage_pct": snapshot["value_coverage_pct"],
            "enforcement_rate": snapshot["enforcement_rate"],
            "retirement_backlog": snapshot["retirement_backlog"],
            "cei_score": snapshot["cei_score"],
        },
    }
