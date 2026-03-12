// ============================================================
// Strata — Opportunity Cost Model + Capital Pressure Index
//
// Quantifies the cost of inaction and capital misallocation.
// Uses ESE scores to identify underperforming capital and
// computes a portfolio-level Capital Pressure Index (CPI).
// ============================================================

import type { DataProduct, Decision } from "../types";
import type { EconomicSignalResult } from "./economic-signals";

// ---- Interfaces ----

export interface OpportunityCostResult {
  /** Total monthly cost locked in products with ESE score below threshold */
  capitalMisallocated: number;
  /** Total monthly cost in the bottom quartile of ESE scores */
  bottomQuartileLockedCapital: number;
  /** 6-month compounding projection of bottom-quartile cost (accounts for cost growth) */
  projected6MonthCompoundingLoss: number;
  /** Cost × time penalty from slow decision resolution */
  decisionLatencyCost: number;
  /** Monthly spend on products with no declared value */
  undeclaredSpend: number;
  /** Monthly spend on products in decline/retired stages */
  declineStageSpend: number;
  /** Capital Pressure Index: 0-100 composite score */
  capitalPressureIndex: number;
  /** Per-product opportunity cost breakdown */
  perProduct: ProductOpportunityCost[];
}

export interface ProductOpportunityCost {
  productId: string;
  /** Whether this product is below the ESE threshold */
  isMisallocated: boolean;
  /** Whether this product is in the bottom quartile of ESE */
  isBottomQuartile: boolean;
  /** Individual product's contribution to latency cost */
  latencyCostContribution: number;
  /** Gap between current ESE score and portfolio median */
  scoreGap: number;
  /** Estimated monthly waste if product stays at current performance */
  estimatedMonthlyWaste: number;
}

// ---- Configurable Parameters ----

export const OPPORTUNITY_COST_CONFIG = {
  /** ESE score below which capital is considered misallocated */
  misallocationThreshold: 35,
  /** Number of months for compounding projection */
  projectionMonths: 6,
  /** CPI category weights (must sum to 1.0) */
  cpiWeights: {
    misallocated: 0.30,
    latency: 0.25,
    undeclared: 0.25,
    decline: 0.20,
  },
} as const;

// ---- Core Computations ----

/**
 * Compute opportunity cost metrics for the entire portfolio.
 *
 * @param products - All data products
 * @param decisions - All decisions (for latency cost)
 * @param signalResults - Pre-computed ESE results from computeEconomicSignals()
 */
export function computeOpportunityCost(
  products: DataProduct[],
  decisions: Decision[],
  signalResults: EconomicSignalResult[],
): OpportunityCostResult {
  const config = OPPORTUNITY_COST_CONFIG;
  const signalMap = new Map(signalResults.map((r) => [r.productId, r]));

  // Active products only (exclude retired)
  const active = products.filter((p) => p.lifecycleStage !== "retired");
  const totalCost = active.reduce((s, p) => s + p.monthlyCost, 0);

  // Sort by ESE score for quartile computation
  const scored = active
    .map((p) => ({
      product: p,
      signal: signalMap.get(p.id),
      score: signalMap.get(p.id)?.economicSignalScore ?? 0,
    }))
    .sort((a, b) => a.score - b.score);

  const q1Index = Math.floor(scored.length * 0.25);
  const medianIndex = Math.floor(scored.length * 0.5);
  const medianScore = scored.length > 0 ? scored[medianIndex].score : 50;

  // Capital misallocated: cost of products below ESE threshold
  const misallocatedProducts = scored.filter((s) => s.score < config.misallocationThreshold);
  const capitalMisallocated = misallocatedProducts.reduce((s, p) => s + p.product.monthlyCost, 0);

  // Bottom quartile locked capital
  const bottomQuartile = scored.slice(0, Math.max(1, q1Index));
  const bottomQuartileLockedCapital = bottomQuartile.reduce((s, p) => s + p.product.monthlyCost, 0);

  // 6-month compounding loss using average cost growth velocity of bottom quartile
  const avgGrowthVelocity = bottomQuartile.length > 0
    ? bottomQuartile.reduce((s, p) => s + (p.signal?.costSignals.costGrowthVelocity ?? 0), 0) / bottomQuartile.length
    : 0;
  const monthlyGrowthRate = Math.max(0, avgGrowthVelocity / 100); // convert % to decimal, floor at 0
  let projected6MonthCompoundingLoss = 0;
  for (let m = 0; m < config.projectionMonths; m++) {
    projected6MonthCompoundingLoss += bottomQuartileLockedCapital * Math.pow(1 + monthlyGrowthRate, m);
  }
  projected6MonthCompoundingLoss = Math.round(projected6MonthCompoundingLoss);

  // Decision latency cost: for each pending/in-review decision, cost × days_pending / 30
  const decisionLatencyCost = computeDecisionLatencyCost(active, decisions);

  // Undeclared spend: products with no declared value
  const undeclaredSpend = active
    .filter((p) => p.declaredValue === null || p.declaredValue === 0)
    .reduce((s, p) => s + p.monthlyCost, 0);

  // Decline stage spend
  const declineStageSpend = active
    .filter((p) => p.lifecycleStage === "decline")
    .reduce((s, p) => s + p.monthlyCost, 0);

  // Capital Pressure Index (0-100)
  const w = config.cpiWeights;
  const capitalPressureIndex = totalCost > 0
    ? Math.round(
        (w.misallocated * (capitalMisallocated / totalCost) +
         w.latency * (decisionLatencyCost / totalCost) +
         w.undeclared * (undeclaredSpend / totalCost) +
         w.decline * (declineStageSpend / totalCost)) * 100 * 100,
      ) / 100
    : 0;

  // Per-product breakdown
  const bottomQuartileIds = new Set(bottomQuartile.map((p) => p.product.id));
  const perProduct: ProductOpportunityCost[] = scored.map((s) => {
    const isMisallocated = s.score < config.misallocationThreshold;
    const isBottomQuartile = bottomQuartileIds.has(s.product.id);
    const scoreGap = Math.max(0, medianScore - s.score);

    // Waste estimate: if below median, the gap × cost implies misallocation
    const wasteRatio = medianScore > 0 ? scoreGap / medianScore : 0;
    const estimatedMonthlyWaste = Math.round(s.product.monthlyCost * wasteRatio);

    // Latency cost contribution for this product
    const productDecisions = decisions.filter(
      (d) => d.productId === s.product.id && (d.status === "under_review" || d.status === "delayed"),
    );
    let latencyCostContribution = 0;
    for (const d of productDecisions) {
      const daysPending = (Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      latencyCostContribution += s.product.monthlyCost * (daysPending / 30);
    }
    latencyCostContribution = Math.round(latencyCostContribution);

    return {
      productId: s.product.id,
      isMisallocated,
      isBottomQuartile,
      latencyCostContribution,
      scoreGap: Math.round(scoreGap * 100) / 100,
      estimatedMonthlyWaste,
    };
  });

  return {
    capitalMisallocated: Math.round(capitalMisallocated),
    bottomQuartileLockedCapital: Math.round(bottomQuartileLockedCapital),
    projected6MonthCompoundingLoss,
    decisionLatencyCost: Math.round(decisionLatencyCost),
    undeclaredSpend: Math.round(undeclaredSpend),
    declineStageSpend: Math.round(declineStageSpend),
    capitalPressureIndex: Math.min(100, Math.max(0, capitalPressureIndex)),
    perProduct,
  };
}

// ---- Helpers ----

function computeDecisionLatencyCost(
  products: DataProduct[],
  decisions: Decision[],
): number {
  const productCostMap = new Map(products.map((p) => [p.id, p.monthlyCost]));

  // Only count pending or in-review decisions (not resolved)
  const pendingDecisions = decisions.filter(
    (d) => d.status === "under_review" || d.status === "delayed",
  );

  let total = 0;
  for (const d of pendingDecisions) {
    const cost = productCostMap.get(d.productId) ?? 0;
    const daysPending = (Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    // Latency cost = monthly cost × (days pending / 30)
    // Interpretation: each month of delay costs the full monthly spend
    total += cost * (daysPending / 30);
  }

  return total;
}
