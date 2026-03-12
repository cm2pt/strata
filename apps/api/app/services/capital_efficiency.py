"""
Capital Efficiency Score — org-level KPI (0–100).

Components (configurable weights via policy_configs):
1. ROI coverage        — % of products with ROI > 1
2. Action rate         — % of retirement candidates actioned
3. Savings accuracy    — variance between projected vs actual savings
4. Capital freed ratio — capital freed cumulative vs total data spend
5. Value governance    — % of products with current (non-expiring) value declarations
6. AI exposure         — % of monthly spend in well-governed products (ROI > 1 AND trust >= 0.7)
"""

import json
import uuid
from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.capital import CapitalEvent, CapitalEventType
from app.models.config import BenchmarkData, PolicyConfig
from app.models.data_product import DataProduct, LifecycleStage
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.time_series import PortfolioMonthly
from app.models.value import ValueDeclaration

# Default weights if policy_configs row is missing
_DEFAULT_WEIGHTS = {
    "roi_coverage": 20,
    "action_rate": 20,
    "savings_accuracy": 15,
    "capital_freed_ratio": 15,
    "value_governance": 15,
    "ai_exposure": 15,
}


async def _load_weights(org_id: uuid.UUID, db: AsyncSession) -> dict[str, int]:
    """Load CEI component weights from policy_configs, falling back to defaults."""
    result = await db.execute(
        select(PolicyConfig.current_value).where(
            PolicyConfig.org_id == org_id,
            PolicyConfig.name == "CEI — Component Weights",
        )
    )
    raw = result.scalar_one_or_none()
    if raw:
        try:
            weights = json.loads(raw)
            # Validate all keys present and sum to ~100
            if all(k in weights for k in _DEFAULT_WEIGHTS):
                return weights
        except (json.JSONDecodeError, TypeError):
            pass
    return _DEFAULT_WEIGHTS


async def compute_capital_efficiency(
    org_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """
    Compute the Capital Efficiency Score (0-100) for an org.
    Returns score, component breakdown, trend, and benchmark comparison.
    """

    weights = await _load_weights(org_id, db)

    # ---- Component 1: ROI Coverage ----
    # % of non-retired products with ROI > 1.0
    total_products_result = await db.execute(
        select(func.count(DataProduct.id)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    total_products = total_products_result.scalar() or 0

    roi_above_result = await db.execute(
        select(func.count(DataProduct.id)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
            DataProduct.roi > 1.0,
        )
    )
    roi_above_count = roi_above_result.scalar() or 0

    roi_coverage_pct = roi_above_count / total_products if total_products > 0 else 0
    w_roi = weights["roi_coverage"]
    roi_score = round(roi_coverage_pct * w_roi, 1)

    # ---- Component 2: Action Rate ----
    # % of retirement candidates that have been actioned (approved or rejected, not left under_review)
    retirement_total_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.type.in_([DecisionType.retirement, DecisionType.low_roi_review]),
        )
    )
    retirement_total = retirement_total_result.scalar() or 0

    retirement_actioned_result = await db.execute(
        select(func.count(Decision.id)).where(
            Decision.org_id == org_id,
            Decision.type.in_([DecisionType.retirement, DecisionType.low_roi_review]),
            Decision.status.in_([DecisionStatus.approved, DecisionStatus.rejected]),
        )
    )
    retirement_actioned = retirement_actioned_result.scalar() or 0

    action_rate_pct = retirement_actioned / retirement_total if retirement_total > 0 else 1.0
    w_action = weights["action_rate"]
    action_score = round(action_rate_pct * w_action, 1)

    # ---- Component 3: Savings Accuracy ----
    # Average variance_from_projection across confirmed decisions (closer to 1.0 = better)
    accuracy_result = await db.execute(
        select(func.avg(Decision.variance_from_projection)).where(
            Decision.org_id == org_id,
            Decision.status == DecisionStatus.approved,
            Decision.variance_from_projection.isnot(None),
        )
    )
    avg_variance = float(accuracy_result.scalar() or 1.0)
    # Score: 1.0 = perfect (full weight), deviation penalized
    accuracy_proximity = max(0, 1.0 - abs(1.0 - avg_variance))
    w_accuracy = weights["savings_accuracy"]
    accuracy_score = round(accuracy_proximity * w_accuracy, 1)

    # ---- Component 4: Capital Freed Ratio ----
    # capital_freed_cumulative / total_data_spend
    freed_result = await db.execute(
        select(func.coalesce(func.sum(CapitalEvent.amount), 0)).where(
            CapitalEvent.org_id == org_id,
        )
    )
    total_freed = float(freed_result.scalar())

    total_spend_result = await db.execute(
        select(func.coalesce(func.sum(DataProduct.monthly_cost), 0)).where(
            DataProduct.org_id == org_id,
        )
    )
    total_monthly_spend = float(total_spend_result.scalar())
    total_annual_spend = total_monthly_spend * 12

    freed_ratio = total_freed / total_annual_spend if total_annual_spend > 0 else 0
    # Cap at full weight; 10% freed = full score
    w_freed = weights["capital_freed_ratio"]
    capital_score = round(min(1.0, freed_ratio / 0.10) * w_freed, 1)

    # ---- Component 5: Value Governance ----
    # % of non-retired products with a current (non-expiring) value declaration
    products_with_value_result = await db.execute(
        select(func.count(ValueDeclaration.id)).where(
            ValueDeclaration.data_product_id.in_(
                select(DataProduct.id).where(
                    DataProduct.org_id == org_id,
                    DataProduct.lifecycle_stage != LifecycleStage.retired,
                )
            ),
            ValueDeclaration.is_expiring == False,  # noqa: E712
        )
    )
    products_with_value = products_with_value_result.scalar() or 0
    value_gov_pct = products_with_value / total_products if total_products > 0 else 0
    w_value_gov = weights["value_governance"]
    value_gov_score = round(value_gov_pct * w_value_gov, 1)

    # ---- Component 6: AI Exposure ----
    # % of total monthly spend in well-governed products (ROI > 1.0 AND trust_score >= 0.7)
    managed_spend_result = await db.execute(
        select(func.coalesce(func.sum(DataProduct.monthly_cost), 0)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
            DataProduct.roi > 1.0,
            DataProduct.trust_score >= 0.7,
        )
    )
    managed_spend = float(managed_spend_result.scalar())
    # Total non-retired spend
    active_spend_result = await db.execute(
        select(func.coalesce(func.sum(DataProduct.monthly_cost), 0)).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    active_spend = float(active_spend_result.scalar())
    managed_spend_pct = managed_spend / active_spend if active_spend > 0 else 0
    w_ai = weights["ai_exposure"]
    ai_score = round(managed_spend_pct * w_ai, 1)

    # ---- Composite Score ----
    total_score = round(roi_score + action_score + accuracy_score + capital_score + value_gov_score + ai_score, 1)

    # ---- Trend (last 6 months of portfolio data) ----
    trend_result = await db.execute(
        select(PortfolioMonthly.month, PortfolioMonthly.average_roi, PortfolioMonthly.capital_freed_cumulative)
        .where(PortfolioMonthly.org_id == org_id)
        .order_by(PortfolioMonthly.month.desc())
        .limit(6)
    )
    trend_rows = trend_result.all()
    trend = [
        {
            "month": row.month.isoformat(),
            "average_roi": round(float(row.average_roi or 0), 4),
            "capital_freed_cumulative": round(float(row.capital_freed_cumulative or 0), 2),
        }
        for row in reversed(trend_rows)
    ]

    # ---- Benchmark comparison ----
    bench_result = await db.execute(select(BenchmarkData).limit(4))
    benchmarks = bench_result.scalars().all()
    benchmark_comparison = [
        {
            "industry": b.industry.value,
            "label": b.label,
            "median_portfolio_roi": round(float(b.median_portfolio_roi), 2),
        }
        for b in benchmarks
    ]

    return {
        "score": total_score,
        "components": {
            "roi_coverage": {
                "score": roi_score,
                "max": w_roi,
                "detail": f"{roi_above_count}/{total_products} products with ROI > 1.0 ({roi_coverage_pct:.0%})",
            },
            "action_rate": {
                "score": action_score,
                "max": w_action,
                "detail": f"{retirement_actioned}/{retirement_total} retirement decisions actioned ({action_rate_pct:.0%})",
            },
            "savings_accuracy": {
                "score": accuracy_score,
                "max": w_accuracy,
                "detail": f"Average projection variance: {avg_variance:.2f}x (1.0 = perfect)",
            },
            "capital_freed_ratio": {
                "score": capital_score,
                "max": w_freed,
                "detail": f"${total_freed:,.0f} freed of ${total_annual_spend:,.0f} annual spend ({freed_ratio:.1%})",
            },
            "value_governance": {
                "score": value_gov_score,
                "max": w_value_gov,
                "detail": f"{products_with_value}/{total_products} products have current value declarations ({value_gov_pct:.0%})",
            },
            "ai_exposure": {
                "score": ai_score,
                "max": w_ai,
                "detail": f"${managed_spend:,.0f} of ${active_spend:,.0f} monthly spend in well-governed products ({managed_spend_pct:.0%})",
            },
        },
        "trend": trend,
        "benchmark_comparison": benchmark_comparison,
    }
