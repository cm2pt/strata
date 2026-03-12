/**
 * Canonical Metrics Layer — Single Source of Truth
 *
 * Every portfolio-level metric, product-derived value, and aggregated KPI
 * must be computed through this module. No page-local calculations.
 *
 * See: /docs/DATA_COHERENCE_CONTRACT.md
 */

import type {
  DataProduct,
  Decision,
  PortfolioSummary,
  CapitalImpactSummary,
  SavingsSummary,
  BoardCapitalSummary,
  CEIResponse,
  CEIComponent,
  CapitalBehavior,
  PortfolioRebalance,
  RebalanceProduct,
  QuartileData,
  CapitalByType,
  CapitalEventType,
  ROIBand,
} from "@/lib/types";

// ─── Configuration ───────────────────────────────────────────────────────────

/** Default value composite weights: 70% declared, 30% usage-implied */
export const VALUE_WEIGHTS = { declared: 0.7, usage: 0.3 } as const;

/** ROI band thresholds (from displayConfig) */
export const ROI_BANDS = {
  high: 3.0,
  healthy: 1.5,
  underperforming: 0.5,
} as const;

/** CEI component max scores */
export const CEI_WEIGHTS = {
  roi_coverage: 20,
  action_rate: 20,
  savings_accuracy: 15,
  capital_freed_ratio: 15,
  value_governance: 15,
  ai_exposure: 15,
} as const;

/** Capital freed ratio target (10% of annual spend = full marks) */
const CAPITAL_FREED_TARGET_RATIO = 0.10;

// ─── Product-Level Calculations ──────────────────────────────────────────────

/** Compute composite value from declared + usage-implied */
export function computeCompositeValue(
  declaredValue: number | null,
  usageImpliedValue: number,
): number {
  const dv = declaredValue ?? 0;
  return VALUE_WEIGHTS.declared * dv + VALUE_WEIGHTS.usage * usageImpliedValue;
}

/** Compute product ROI (null if cost or value is 0) */
export function computeProductROI(
  compositeValue: number,
  monthlyCost: number,
): number | null {
  if (monthlyCost <= 0 || compositeValue <= 0) return null;
  return Math.round((compositeValue / monthlyCost) * 100) / 100;
}

/** Classify ROI into band */
export function classifyROI(roi: number | null): ROIBand | null {
  if (roi === null) return null;
  if (roi >= ROI_BANDS.high) return "high";
  if (roi >= ROI_BANDS.healthy) return "healthy";
  if (roi >= ROI_BANDS.underperforming) return "underperforming";
  return "critical";
}

/** Verify product cost breakdown sums to monthlyCost */
export function verifyCostBreakdown(product: DataProduct): {
  valid: boolean;
  expected: number;
  actual: number;
} {
  const b = product.costBreakdown;
  const sum = b.compute + b.storage + b.pipeline + b.humanEstimate;
  return {
    valid: Math.abs(sum - product.monthlyCost) < 1, // $1 tolerance for rounding
    expected: product.monthlyCost,
    actual: sum,
  };
}

// ─── Portfolio-Level Calculations ────────────────────────────────────────────

/** Filter to active (non-retired) products */
export function activeProducts(products: DataProduct[]): DataProduct[] {
  return products.filter((p) => p.lifecycleStage !== "retired");
}

/** Portfolio monthly spend = sum of all non-retired product costs */
export function computePortfolioMonthlySpend(products: DataProduct[]): number {
  return activeProducts(products).reduce((sum, p) => sum + p.monthlyCost, 0);
}

/** Portfolio average ROI = cost-weighted (total value / total cost) */
export function computePortfolioROI(products: DataProduct[]): number {
  const active = activeProducts(products).filter((p) => p.monthlyCost > 0);
  const totalCost = active.reduce((s, p) => s + p.monthlyCost, 0);
  const totalValue = active.reduce((s, p) => s + p.compositeValue, 0);
  if (totalCost <= 0) return 0;
  return Math.round((totalValue / totalCost) * 100) / 100;
}

/** Total consumers across all active products */
export function computeTotalConsumers(products: DataProduct[]): number {
  return activeProducts(products).reduce(
    (sum, p) => sum + p.monthlyConsumers,
    0,
  );
}

/** Capital misallocated = cost of products with ROI < 1.0 */
export function computeCapitalMisallocated(products: DataProduct[]): number {
  return activeProducts(products)
    .filter((p) => p.roi !== null && p.roi < 1.0)
    .reduce((sum, p) => sum + p.monthlyCost, 0);
}

/** Count retirement candidates */
export function countRetirementCandidates(products: DataProduct[]): number {
  return products.filter((p) => p.isRetirementCandidate).length;
}

/** Estimated savings from retiring retirement candidates */
export function computeEstimatedSavings(products: DataProduct[]): number {
  return products
    .filter((p) => p.isRetirementCandidate)
    .reduce((sum, p) => sum + p.monthlyCost, 0);
}

/** Cost coverage = cost-weighted average of product coverages */
export function computeCostCoverage(products: DataProduct[]): number {
  const active = activeProducts(products);
  const totalCost = active.reduce((s, p) => s + p.monthlyCost, 0);
  if (totalCost <= 0) return 0;
  const weighted = active.reduce(
    (s, p) => s + p.costCoverage * p.monthlyCost,
    0,
  );
  return Math.round((weighted / totalCost) * 100) / 100;
}

/** Count products with a value declaration */
export function countProductsWithValue(products: DataProduct[]): number {
  return activeProducts(products).filter(
    (p) => p.declaredValue !== null && p.declaredValue > 0,
  ).length;
}

// ─── Domain & Stage Aggregation ─────────────────────────────────────────────

export interface DomainAllocation {
  name: string;
  cost: number;
  value: number;
  roi: number;
  count: number;
}

/** Aggregate products by domain (pass activeProducts(…) to exclude retired) */
export function computeDomainAllocation(
  products: DataProduct[],
): DomainAllocation[] {
  const map = new Map<string, { cost: number; value: number; count: number }>();
  for (const p of products) {
    const existing = map.get(p.domain) ?? { cost: 0, value: 0, count: 0 };
    existing.cost += p.monthlyCost;
    existing.value += p.compositeValue;
    existing.count += 1;
    map.set(p.domain, existing);
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      cost: data.cost,
      value: data.value,
      roi:
        data.cost > 0
          ? Math.round((data.value / data.cost) * 100) / 100
          : 0,
      count: data.count,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export interface StageAllocation {
  stage: string;
  cost: number;
  value: number;
  count: number;
}

/** Aggregate products by lifecycle stage */
export function computeStageAllocation(
  products: DataProduct[],
): StageAllocation[] {
  const map = new Map<
    string,
    { cost: number; value: number; count: number }
  >();
  for (const p of products) {
    const existing = map.get(p.lifecycleStage) ?? {
      cost: 0,
      value: 0,
      count: 0,
    };
    existing.cost += p.monthlyCost;
    existing.value += p.compositeValue;
    existing.count += 1;
    map.set(p.lifecycleStage, existing);
  }
  return Array.from(map.entries())
    .map(([stage, data]) => ({ stage, ...data }))
    .sort((a, b) => b.cost - a.cost);
}

/** Realized savings from approved decisions with confirmed actual impact */
export function computeRealizedSavings(decisions: Decision[]): number {
  return decisions
    .filter(
      (d) =>
        d.status === "approved" &&
        d.actualImpact !== null &&
        d.actualImpact > 0,
    )
    .reduce((s, d) => s + (d.actualImpact ?? 0), 0);
}

/** Sum of costs for products with no declared value */
export function computeUndeclaredSpend(products: DataProduct[]): number {
  return activeProducts(products)
    .filter((p) => p.declaredValue === null)
    .reduce((s, p) => s + p.monthlyCost, 0);
}

/** Sum of costs for products in decline or retired lifecycle stages */
export function computeDeclineStageSpend(products: DataProduct[]): number {
  return products
    .filter(
      (p) =>
        p.lifecycleStage === "decline" || p.lifecycleStage === "retired",
    )
    .reduce((s, p) => s + p.monthlyCost, 0);
}

// ─── Capital Events & Decisions ──────────────────────────────────────────────

export interface CapitalEvent {
  id: string;
  decisionId: string;
  productId: string | null;
  eventType:
    | "retirement_freed"
    | "cost_optimization"
    | "reallocation"
    | "pricing_revenue"
    | "ai_spend_reduced";
  amount: number;
  description: string;
  effectiveDate: string;
  createdAt: string;
  validationStatus?: "pending" | "validating" | "confirmed" | "underperforming";
}

/** Total capital freed from all events */
export function computeCapitalFreed(events: CapitalEvent[]): number {
  return events.reduce((sum, e) => sum + e.amount, 0);
}

/** Capital freed broken down by event type */
export function computeCapitalByType(
  events: CapitalEvent[],
): Record<string, number> {
  const byType: Record<string, number> = {};
  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + e.amount;
  }
  return byType;
}

/** Confirmed savings = events with validation confirmed */
export function computeConfirmedSavings(events: CapitalEvent[]): number {
  return events
    .filter((e) => e.validationStatus === "confirmed")
    .reduce((s, e) => s + e.amount, 0);
}

/** Projected savings = events still validating or pending */
export function computeProjectedSavings(events: CapitalEvent[]): number {
  return events
    .filter(
      (e) =>
        e.validationStatus === "validating" ||
        e.validationStatus === "pending",
    )
    .reduce((s, e) => s + e.amount, 0);
}

/** Count decisions by status */
export function countDecisionsByStatus(
  decisions: Decision[],
  status: string,
): number {
  return decisions.filter((d) => d.status === status).length;
}

/** Count decisions by type and status */
export function countDecisionsByTypeAndStatus(
  decisions: Decision[],
  type: string,
  statuses: string[],
): number {
  return decisions.filter(
    (d) => d.type === type && statuses.includes(d.status),
  ).length;
}

/** Pending retirement decisions */
export function pendingRetirements(decisions: Decision[]): Decision[] {
  return decisions.filter(
    (d) => d.type === "retirement" && d.status === "under_review",
  );
}

/** Approved retirements */
export function approvedRetirements(decisions: Decision[]): Decision[] {
  return decisions.filter(
    (d) => d.type === "retirement" && d.status === "approved",
  );
}

/** Pending estimated savings */
export function computePendingEstimatedSavings(
  decisions: Decision[],
): number {
  return pendingRetirements(decisions).reduce(
    (s, d) => s + d.estimatedImpact,
    0,
  );
}

/** Average decision velocity (days from creation to resolution) */
export function computeDecisionVelocity(decisions: Decision[]): number {
  const resolved = decisions.filter(
    (d) =>
      d.resolvedAt !== null &&
      (d.status === "approved" || d.status === "rejected"),
  );
  if (resolved.length === 0) return 0;
  const totalDays = resolved.reduce((sum, d) => {
    const created = new Date(d.createdAt).getTime();
    const resolvedAt = new Date(d.resolvedAt!).getTime();
    return sum + (resolvedAt - created) / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round((totalDays / resolved.length) * 10) / 10;
}

// ─── CEI Score ───────────────────────────────────────────────────────────────

export interface CEIInput {
  products: DataProduct[];
  decisions: Decision[];
  capitalEvents: CapitalEvent[];
  impactVariances: number[]; // array of variance_from_projection values
}

export function computeCEI(input: CEIInput): {
  score: number;
  components: Record<string, CEIComponent>;
} {
  const { products, decisions, capitalEvents, impactVariances } = input;
  const active = activeProducts(products);
  const nonRetired = active.filter((p) => p.lifecycleStage !== "draft");

  // 1. ROI Coverage
  const withROI = nonRetired.filter((p) => p.roi !== null);
  const roiAboveOne = withROI.filter((p) => p.roi! > 1.0).length;
  const roiCoveragePct = withROI.length > 0 ? roiAboveOne / withROI.length : 0;
  const roiCoverageScore =
    Math.round(roiCoveragePct * CEI_WEIGHTS.roi_coverage * 10) / 10;

  // 2. Action Rate
  const retirementDecisions = decisions.filter(
    (d) => d.type === "retirement",
  );
  const actionedRetirements = retirementDecisions.filter(
    (d) => d.status === "approved" || d.status === "rejected",
  ).length;
  const actionRatePct =
    retirementDecisions.length > 0
      ? actionedRetirements / retirementDecisions.length
      : 0;
  const actionRateScore =
    Math.round(actionRatePct * CEI_WEIGHTS.action_rate * 10) / 10;

  // 3. Savings Accuracy
  const avgVariance =
    impactVariances.length > 0
      ? impactVariances.reduce((s, v) => s + v, 0) / impactVariances.length
      : 1.0;
  const savingsAccuracyPct = Math.max(0, 1.0 - Math.abs(1.0 - avgVariance));
  const savingsAccuracyScore =
    Math.round(savingsAccuracyPct * CEI_WEIGHTS.savings_accuracy * 10) / 10;

  // 4. Capital Freed Ratio
  const totalFreed = computeCapitalFreed(capitalEvents);
  const annualSpend = computePortfolioMonthlySpend(products) * 12;
  const freedRatio = annualSpend > 0 ? totalFreed * 12 / annualSpend : 0;
  const freedRatioPct = Math.min(1.0, freedRatio / CAPITAL_FREED_TARGET_RATIO);
  const capitalFreedScore =
    Math.round(freedRatioPct * CEI_WEIGHTS.capital_freed_ratio * 10) / 10;

  // 5. Value Governance
  const withValueDecl = active.filter(
    (p) =>
      p.valueDeclaration !== null &&
      !p.valueDeclaration.isExpiring,
  ).length;
  const valueGovPct = active.length > 0 ? withValueDecl / active.length : 0;
  const valueGovScore =
    Math.round(valueGovPct * CEI_WEIGHTS.value_governance * 10) / 10;

  // 6. AI Exposure (well-governed spend ratio)
  const portfolioSpend = computePortfolioMonthlySpend(products);
  const wellGoverned = active
    .filter((p) => p.roi !== null && p.roi > 1.0 && p.trustScore >= 0.7)
    .reduce((s, p) => s + p.monthlyCost, 0);
  const aiExposurePct = portfolioSpend > 0 ? wellGoverned / portfolioSpend : 0;
  const aiExposureScore =
    Math.round(aiExposurePct * CEI_WEIGHTS.ai_exposure * 10) / 10;

  const score =
    Math.round(
      (roiCoverageScore +
        actionRateScore +
        savingsAccuracyScore +
        capitalFreedScore +
        valueGovScore +
        aiExposureScore) *
        10,
    ) / 10;

  return {
    score,
    components: {
      roi_coverage: {
        score: roiCoverageScore,
        max: CEI_WEIGHTS.roi_coverage,
        detail: `${roiAboveOne}/${withROI.length} products with ROI > 1.0 (${Math.round(roiCoveragePct * 100)}%)`,
      },
      action_rate: {
        score: actionRateScore,
        max: CEI_WEIGHTS.action_rate,
        detail: `${actionedRetirements}/${retirementDecisions.length} retirement decisions actioned (${Math.round(actionRatePct * 100)}%)`,
      },
      savings_accuracy: {
        score: savingsAccuracyScore,
        max: CEI_WEIGHTS.savings_accuracy,
        detail: `Average projection variance: ${avgVariance.toFixed(2)}x (1.0 = perfect)`,
      },
      capital_freed_ratio: {
        score: capitalFreedScore,
        max: CEI_WEIGHTS.capital_freed_ratio,
        detail: `$${(totalFreed * 12).toLocaleString()} freed of $${annualSpend.toLocaleString()} annual spend (${(freedRatio * 100).toFixed(1)}%)`,
      },
      value_governance: {
        score: valueGovScore,
        max: CEI_WEIGHTS.value_governance,
        detail: `${withValueDecl}/${active.length} products have current value declarations (${Math.round(valueGovPct * 100)}%)`,
      },
      ai_exposure: {
        score: aiExposureScore,
        max: CEI_WEIGHTS.ai_exposure,
        detail: `$${wellGoverned.toLocaleString()} of $${portfolioSpend.toLocaleString()} monthly spend in well-governed products (${Math.round(aiExposurePct * 100)}%)`,
      },
    },
  };
}

// ─── Capital Behavior ────────────────────────────────────────────────────────

export function computeCapitalBehavior(
  products: DataProduct[],
  decisions: Decision[],
): CapitalBehavior {
  const active = activeProducts(products);

  const velocity = computeDecisionVelocity(decisions);

  const withValueDecl = active.filter(
    (p) => p.valueDeclaration !== null,
  ).length;
  const valueCoverage =
    active.length > 0
      ? Math.round((withValueDecl / active.length) * 1000) / 10
      : 0;

  const overdueReviews = active.filter(
    (p) => p.valueDeclaration?.isExpiring === true,
  ).length;
  const reviewOverdue =
    active.length > 0
      ? Math.round((overdueReviews / active.length) * 1000) / 10
      : 0;

  // Enforcement: % of retirement candidates that have a decision
  const retCandidates = products.filter((p) => p.isRetirementCandidate);
  const withDecision = retCandidates.filter((p) =>
    decisions.some((d) => d.productId === p.id),
  ).length;
  const enforcement =
    retCandidates.length > 0
      ? Math.round((withDecision / retCandidates.length) * 1000) / 10
      : 0;

  // Impact confirmation: % of approved decisions with confirmed validation
  const approved = decisions.filter((d) => d.status === "approved");
  const confirmed = approved.filter(
    (d) => d.impactValidationStatus === "confirmed",
  ).length;
  const confirmRate =
    approved.length > 0
      ? Math.round((confirmed / approved.length) * 1000) / 10
      : 0;

  // Governance health = weighted average of components
  const health =
    Math.round(
      ((100 - Math.min(velocity, 30) * (100 / 30)) * 0.2 +
        valueCoverage * 0.25 +
        (100 - reviewOverdue) * 0.15 +
        enforcement * 0.2 +
        confirmRate * 0.2) *
        10,
    ) / 10;

  return {
    avgDecisionVelocityDays: velocity,
    valueDeclarationCoveragePct: valueCoverage,
    reviewOverduePct: reviewOverdue,
    enforcementTriggerRate: enforcement,
    impactConfirmationRate: confirmRate,
    governanceHealthScore: health,
  };
}

// ─── Portfolio Rebalance ─────────────────────────────────────────────────────

export function computePortfolioRebalance(
  products: DataProduct[],
): PortfolioRebalance {
  // Only include active products with meaningful cost and non-null ROI
  const eligible = activeProducts(products).filter(
    (p) => p.monthlyCost > 0 && p.roi !== null,
  );

  const sorted = [...eligible].sort((a, b) => (a.roi ?? 0) - (b.roi ?? 0));
  const totalCost = eligible.reduce((s, p) => s + p.monthlyCost, 0);
  const totalValue = eligible.reduce((s, p) => s + p.compositeValue, 0);
  const currentROI = totalCost > 0 ? Math.round((totalValue / totalCost) * 100) / 100 : 0;

  const quartileSize = Math.max(1, Math.floor(eligible.length / 4));

  const bottom = sorted.slice(0, quartileSize);
  const top = sorted.slice(-quartileSize);

  const bottomCost = bottom.reduce((s, p) => s + p.monthlyCost, 0);
  const bottomValue = bottom.reduce((s, p) => s + p.compositeValue, 0);
  const bottomROI =
    bottomCost > 0 ? Math.round((bottomValue / bottomCost) * 100) / 100 : 0;

  const topCost = top.reduce((s, p) => s + p.monthlyCost, 0);
  const topValue = top.reduce((s, p) => s + p.compositeValue, 0);
  const topROI =
    topCost > 0 ? Math.round((topValue / topCost) * 100) / 100 : 0;

  const rebalancePct = 0.2; // Move 20% of bottom quartile cost
  const movable = Math.round(bottomCost * rebalancePct);

  // Simulate rebalance: move capital from bottom to top
  const projectedValue = totalValue + movable * (topROI - bottomROI);
  const projectedROI =
    totalCost > 0 ? Math.round((projectedValue / totalCost) * 100) / 100 : 0;

  // Herfindahl-like concentration index
  const costShares = eligible.map((p) => p.monthlyCost / totalCost);
  const concentrationIndex =
    Math.round(costShares.reduce((s, share) => s + share * share, 0) * 100) /
    100;

  return {
    currentBlendedRoi: currentROI,
    projectedBlendedRoi: projectedROI,
    efficiencyDelta:
      Math.round((projectedROI - currentROI) * 100) / 100,
    rebalancePct,
    movableAmountMonthly: movable,
    totalProducts: eligible.length,
    totalMonthlyCost: totalCost,
    totalMonthlyValue: totalValue,
    capitalConcentrationIndex: concentrationIndex,
    bottomQuartile: {
      products: bottom.map((p) => ({
        id: p.id,
        name: p.name,
        monthlyCost: p.monthlyCost,
        trailingRoi: p.roi ?? 0,
      })),
      totalCost: bottomCost,
      totalValue: bottomValue,
      blendedRoi: bottomROI,
      count: bottom.length,
    },
    topQuartile: {
      products: top.map((p) => ({
        id: p.id,
        name: p.name,
        monthlyCost: p.monthlyCost,
        trailingRoi: p.roi ?? 0,
      })),
      totalCost: topCost,
      totalValue: topValue,
      blendedRoi: topROI,
      count: top.length,
    },
    recommendedDivest: bottom.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyCost: p.monthlyCost,
      trailingRoi: p.roi ?? 0,
    })),
    recommendedInvest: top.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyCost: p.monthlyCost,
      trailingRoi: p.roi ?? 0,
    })),
  };
}

// ─── Full Portfolio Summary (canonical derivation) ───────────────────────────

export function computePortfolioSummary(
  products: DataProduct[],
): PortfolioSummary {
  const active = activeProducts(products);
  const totalCost = active.reduce((s, p) => s + p.monthlyCost, 0);
  const totalValue = active.reduce((s, p) => s + p.compositeValue, 0);
  const avgROI = totalCost > 0 ? Math.round((totalValue / totalCost) * 100) / 100 : 0;

  return {
    totalProducts: products.length,
    totalCost,
    averageROI: avgROI,
    roiTrend: 0.3, // Would come from historical comparison
    totalConsumers: active.reduce((s, p) => s + p.monthlyConsumers, 0),
    consumersTrend: 12, // Would come from historical comparison
    activeSubscriptions: active.reduce((s, p) => s + p.subscriptionCount, 0),
    retirementCandidates: countRetirementCandidates(products),
    estimatedSavings: computeEstimatedSavings(products),
    costCoverage: computeCostCoverage(products),
    productsWithValue: countProductsWithValue(products),
    newProductsThisQuarter: products.filter((p) => {
      const created = new Date(p.createdAt);
      const now = new Date();
      const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      return created >= quarterStart;
    }).length,
  };
}

// ─── Board Summary (canonical derivation) ────────────────────────────────────

export function computeBoardSummary(
  products: DataProduct[],
  capitalEvents: CapitalEvent[],
  ceiScore: number,
): BoardCapitalSummary {
  const totalFreed = computeCapitalFreed(capitalEvents);
  const confirmed = computeConfirmedSavings(capitalEvents);
  const projected = computeProjectedSavings(capitalEvents);
  const portfolioROI = computePortfolioROI(products);
  const underperforming = capitalEvents.filter(
    (e) => e.validationStatus === "underperforming",
  ).length;

  return {
    totalCapitalFreed: totalFreed,
    totalCapitalFreedAnnual: totalFreed * 12,
    confirmedSavings: confirmed,
    projectedSavings: projected,
    underperformingDecisions: underperforming,
    portfolioRoiCurrent: portfolioROI,
    portfolioRoiDelta: 0.15, // Would come from historical comparison
    capitalEfficiencyScore: ceiScore,
    topCapitalActions: [], // Populated by caller
  };
}

// ─── Capital Impact Summary (canonical derivation) ───────────────────────────

export function computeCapitalImpactSummary(
  products: DataProduct[],
  capitalEvents: CapitalEvent[],
  decisions: Decision[],
): Omit<CapitalImpactSummary, "capitalFreedByMonth" | "recentEvents"> {
  const totalFreed = computeCapitalFreed(capitalEvents);
  const byType = computeCapitalByType(capitalEvents);
  const portfolioROI = computePortfolioROI(products);

  return {
    totalCapitalFreed: totalFreed,
    totalCapitalFreedAnnual: totalFreed * 12,
    budgetReallocated: byType["reallocation"] ?? 0,
    aiSpendReduced: byType["ai_spend_reduced"] ?? 0,
    portfolioRoiDelta: 0.04, // Would come from historical comparison
    portfolioRoiCurrent: portfolioROI,
    portfolioRoiPrevious: Math.round((portfolioROI - 0.04) * 100) / 100,
    decisionsExecuted: countDecisionsByStatus(decisions, "approved"),
    decisionsUnderReview: countDecisionsByStatus(decisions, "under_review"),
    activePricingPolicies: 0, // Populated by caller
    pricingRevenueTotal: 0,
    capitalByType: Object.entries(byType).map(([type, amount]) => ({
      type: type as CapitalEventType,
      amount,
    })),
  };
}

// ─── Savings Summary (canonical derivation) ──────────────────────────────────

export function computeSavingsSummary(
  decisions: Decision[],
  capitalEvents: CapitalEvent[],
): Omit<SavingsSummary, "capitalFreedByMonth"> {
  const totalFreed = computeCapitalFreed(capitalEvents);
  const pending = pendingRetirements(decisions);
  const approved = approvedRetirements(decisions);

  return {
    totalCapitalFreedMonthly: totalFreed,
    totalCapitalFreedAnnual: totalFreed * 12,
    pendingRetirements: pending.length,
    pendingEstimatedSavings: pending.reduce(
      (s, d) => s + d.estimatedImpact,
      0,
    ),
    approvedRetirements: approved.length,
    decisionsThisQuarter: decisions.filter((d) => {
      const created = new Date(d.createdAt);
      const now = new Date();
      const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      return created >= quarterStart;
    }).length,
  };
}

// ─── Reconciliation Helpers ──────────────────────────────────────────────────

export interface ReconciliationResult {
  rule: string;
  passed: boolean;
  expected: number | string;
  actual: number | string;
  tolerance: number;
  detail: string;
}

export function runReconciliation(
  products: DataProduct[],
  decisions: Decision[],
  capitalEvents: CapitalEvent[],
  portfolioSummary: PortfolioSummary,
  capitalImpact: CapitalImpactSummary,
  boardSummary: BoardCapitalSummary,
  ceiResponse: CEIResponse,
  savingsSummary: SavingsSummary,
): ReconciliationResult[] {
  const results: ReconciliationResult[] = [];
  const active = activeProducts(products);

  // R1: Portfolio Cost = Sum of Product Costs
  const sumCosts = active.reduce((s, p) => s + p.monthlyCost, 0);
  results.push({
    rule: "R1: Portfolio Cost = Sum of Product Costs",
    passed: Math.abs(portfolioSummary.totalCost - sumCosts) < 1,
    expected: sumCosts,
    actual: portfolioSummary.totalCost,
    tolerance: 0,
    detail: `Sum of ${active.length} active product costs`,
  });

  // R3: Portfolio ROI = Weighted ROI
  const computedROI = computePortfolioROI(products);
  results.push({
    rule: "R3: Portfolio ROI = Weighted ROI",
    passed: Math.abs(portfolioSummary.averageROI - computedROI) < 0.02,
    expected: computedROI,
    actual: portfolioSummary.averageROI,
    tolerance: 0.01,
    detail: "Cost-weighted total_value / total_cost",
  });

  // R4: Capital Freed across all surfaces
  const totalFreed = computeCapitalFreed(capitalEvents);
  results.push({
    rule: "R4a: Capital Impact Freed = Sum Events",
    passed: Math.abs(capitalImpact.totalCapitalFreed - totalFreed) < 1,
    expected: totalFreed,
    actual: capitalImpact.totalCapitalFreed,
    tolerance: 0,
    detail: `Sum of ${capitalEvents.length} capital events`,
  });
  results.push({
    rule: "R4b: Savings Summary Freed = Sum Events",
    passed:
      Math.abs(savingsSummary.totalCapitalFreedMonthly - totalFreed) < 1,
    expected: totalFreed,
    actual: savingsSummary.totalCapitalFreedMonthly,
    tolerance: 0,
    detail: `Must match capital impact total`,
  });
  results.push({
    rule: "R4c: Board Summary Freed = Sum Events",
    passed: Math.abs(boardSummary.totalCapitalFreed - totalFreed) < 1,
    expected: totalFreed,
    actual: boardSummary.totalCapitalFreed,
    tolerance: 0,
    detail: `Must match capital impact total`,
  });

  // R5: ROI Shown Everywhere
  results.push({
    rule: "R5a: Capital Impact ROI = Portfolio ROI",
    passed:
      Math.abs(capitalImpact.portfolioRoiCurrent - computedROI) < 0.02,
    expected: computedROI,
    actual: capitalImpact.portfolioRoiCurrent,
    tolerance: 0.01,
    detail: "Must use same canonical calculation",
  });
  results.push({
    rule: "R5b: Board ROI = Portfolio ROI",
    passed: Math.abs(boardSummary.portfolioRoiCurrent - computedROI) < 0.02,
    expected: computedROI,
    actual: boardSummary.portfolioRoiCurrent,
    tolerance: 0.01,
    detail: "Must use same canonical calculation",
  });

  // R6: CEI Score Matches
  results.push({
    rule: "R6: Board CEI = Capital Efficiency CEI",
    passed:
      Math.abs(
        boardSummary.capitalEfficiencyScore - ceiResponse.score,
      ) < 0.2,
    expected: ceiResponse.score,
    actual: boardSummary.capitalEfficiencyScore,
    tolerance: 0.1,
    detail: "CEI must be identical across surfaces",
  });

  // R7: Total Products
  results.push({
    rule: "R7: Portfolio total products = dataProducts.length",
    passed: portfolioSummary.totalProducts === products.length,
    expected: products.length,
    actual: portfolioSummary.totalProducts,
    tolerance: 0,
    detail: "Include all products (all stages)",
  });

  // R8: Consumer total
  const totalConsumers = active.reduce(
    (s, p) => s + p.monthlyConsumers,
    0,
  );
  results.push({
    rule: "R8: Portfolio consumers = Sum of product consumers",
    passed: portfolioSummary.totalConsumers === totalConsumers,
    expected: totalConsumers,
    actual: portfolioSummary.totalConsumers,
    tolerance: 0,
    detail: `Sum of ${active.length} active product consumer counts`,
  });

  return results;
}
