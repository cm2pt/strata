"""
Capital Allocation Engine.

Computes portfolio rebalancing recommendations based on trailing ROI,
cost, usage trends, and lifecycle stage. Simulates the effect of moving
budget from bottom-quartile to top-quartile ROI products.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_product import DataProduct, LifecycleStage
from app.models.time_series import ROIMonthly


async def compute_portfolio_rebalance(
    org_id: uuid.UUID,
    db: AsyncSession,
    rebalance_pct: float = 0.20,
) -> dict:
    """
    Compute a portfolio rebalance recommendation.

    1. Pull all non-retired products with their trailing 3-month ROI.
    2. Rank into quartiles.
    3. Simulate shifting `rebalance_pct` of bottom-quartile spend to top-quartile.
    4. Project new blended ROI.

    Returns structured dict for the API response.
    """
    # ---- Trailing 3-month window ----
    three_months_ago = date.today() - timedelta(days=90)

    # ---- Get all active products with their current economics ----
    result = await db.execute(
        select(DataProduct).where(
            DataProduct.org_id == org_id,
            DataProduct.lifecycle_stage != LifecycleStage.retired,
        )
    )
    products = result.scalars().all()

    if not products:
        return _empty_result()

    # ---- Compute trailing 3-month average ROI per product ----
    product_metrics = []
    for p in products:
        roi_result = await db.execute(
            select(func.avg(ROIMonthly.roi)).where(
                ROIMonthly.data_product_id == p.id,
                ROIMonthly.month >= three_months_ago,
            )
        )
        trailing_roi = float(roi_result.scalar() or p.roi or 0)
        cost = float(p.monthly_cost or 0)

        product_metrics.append({
            "id": str(p.id),
            "name": p.name,
            "domain": p.domain,
            "business_unit": p.business_unit,
            "lifecycle_stage": p.lifecycle_stage.value,
            "monthly_cost": cost,
            "composite_value": float(p.composite_value or 0),
            "trailing_roi": round(trailing_roi, 4),
            "monthly_consumers": p.monthly_consumers,
            "usage_trend": float(p.usage_trend or 0),
            "cost_trend": float(p.cost_trend or 0),
        })

    # Sort by trailing ROI ascending
    product_metrics.sort(key=lambda x: x["trailing_roi"])
    n = len(product_metrics)

    # ---- Quartile boundaries ----
    q1_end = max(1, n // 4)
    q3_start = n - max(1, n // 4)

    bottom_quartile = product_metrics[:q1_end]
    top_quartile = product_metrics[q3_start:]

    # ---- Current blended ROI ----
    total_cost = sum(p["monthly_cost"] for p in product_metrics)
    total_value = sum(p["composite_value"] for p in product_metrics)
    current_blended_roi = total_value / total_cost if total_cost > 0 else 0

    # ---- Bottom quartile stats ----
    bottom_cost = sum(p["monthly_cost"] for p in bottom_quartile)
    bottom_value = sum(p["composite_value"] for p in bottom_quartile)
    bottom_roi = bottom_value / bottom_cost if bottom_cost > 0 else 0

    # ---- Top quartile stats ----
    top_cost = sum(p["monthly_cost"] for p in top_quartile)
    top_value = sum(p["composite_value"] for p in top_quartile)
    top_roi = top_value / top_cost if top_cost > 0 else 0

    # ---- Capital concentration index ----
    # Herfindahl-style: sum of (cost_share)^2 — higher = more concentrated
    if total_cost > 0:
        concentration_index = sum(
            (p["monthly_cost"] / total_cost) ** 2 for p in product_metrics
        )
    else:
        concentration_index = 0

    # ---- Simulate rebalance ----
    movable_amount = bottom_cost * rebalance_pct
    # After rebalance: bottom loses movable_amount, top gains it
    new_bottom_cost = bottom_cost - movable_amount
    new_top_cost = top_cost + movable_amount
    # Assume top quartile ROI applies to the additional budget
    new_top_value = top_value + (movable_amount * top_roi) if top_roi > 0 else top_value
    # Assume bottom quartile value shrinks proportionally
    new_bottom_value = bottom_value * (new_bottom_cost / bottom_cost) if bottom_cost > 0 else 0

    # Middle quartiles unchanged
    middle = product_metrics[q1_end:q3_start]
    middle_cost = sum(p["monthly_cost"] for p in middle)
    middle_value = sum(p["composite_value"] for p in middle)

    new_total_cost = new_bottom_cost + middle_cost + new_top_cost
    new_total_value = new_bottom_value + middle_value + new_top_value
    projected_blended_roi = new_total_value / new_total_cost if new_total_cost > 0 else 0

    efficiency_delta = projected_blended_roi - current_blended_roi

    return {
        "current_blended_roi": round(current_blended_roi, 4),
        "projected_blended_roi": round(projected_blended_roi, 4),
        "efficiency_delta": round(efficiency_delta, 4),
        "rebalance_pct": rebalance_pct,
        "movable_amount_monthly": round(movable_amount, 2),
        "total_products": n,
        "total_monthly_cost": round(total_cost, 2),
        "total_monthly_value": round(total_value, 2),
        "capital_concentration_index": round(concentration_index, 6),
        "bottom_quartile": {
            "products": bottom_quartile,
            "total_cost": round(bottom_cost, 2),
            "total_value": round(bottom_value, 2),
            "blended_roi": round(bottom_roi, 4),
            "count": len(bottom_quartile),
        },
        "top_quartile": {
            "products": top_quartile,
            "total_cost": round(top_cost, 2),
            "total_value": round(top_value, 2),
            "blended_roi": round(top_roi, 4),
            "count": len(top_quartile),
        },
        "recommended_divest": [
            {"id": p["id"], "name": p["name"], "monthly_cost": p["monthly_cost"], "trailing_roi": p["trailing_roi"]}
            for p in bottom_quartile
        ],
        "recommended_invest": [
            {"id": p["id"], "name": p["name"], "monthly_cost": p["monthly_cost"], "trailing_roi": p["trailing_roi"]}
            for p in top_quartile
        ],
    }


def _empty_result() -> dict:
    return {
        "current_blended_roi": 0,
        "projected_blended_roi": 0,
        "efficiency_delta": 0,
        "rebalance_pct": 0.20,
        "movable_amount_monthly": 0,
        "total_products": 0,
        "total_monthly_cost": 0,
        "total_monthly_value": 0,
        "capital_concentration_index": 0,
        "bottom_quartile": {"products": [], "total_cost": 0, "total_value": 0, "blended_roi": 0, "count": 0},
        "top_quartile": {"products": [], "total_cost": 0, "total_value": 0, "blended_roi": 0, "count": 0},
        "recommended_divest": [],
        "recommended_invest": [],
    }
