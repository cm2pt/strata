// ============================================================
// Strata — Learning Loop
//
// Tracks projection accuracy, domain efficiency trends, and
// owner reliability. Detects value inflation and suggests
// weight adjustments for the Economic Signal Engine.
// ============================================================

import type { DataProduct, Decision } from "../types";
import type { EconomicSignalResult } from "./economic-signals";

// ---- Interfaces ----

export interface ProjectionAccuracy {
  decisionId: string;
  productId: string;
  estimatedImpact: number;
  actualImpact: number;
  /** actual / estimated — 1.0 = perfect */
  accuracyRatio: number;
  /** |1 - accuracyRatio| — 0 = perfect */
  absoluteError: number;
}

export interface DomainEfficiencyTrend {
  domain: string;
  productCount: number;
  averageEseScore: number;
  totalMonthlyCost: number;
  averageROI: number;
  /** Trend direction based on lifecycle stage distribution */
  trajectory: "improving" | "stable" | "declining";
}

export interface OwnerAccuracy {
  ownerId: string;
  ownerName: string;
  productCount: number;
  /** Average accuracy ratio across all their resolved decisions */
  averageAccuracyRatio: number;
  /** Number of resolved decisions with impact data */
  decisionsSampled: number;
  /** Flag: consistently over-declares value */
  isValueInflator: boolean;
}

export interface WeightAdjustmentSuggestion {
  category: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
}

export interface ConfidenceAdjustment {
  productId: string;
  currentConfidence: number;
  adjustedConfidence: number;
  reason: string;
}

export interface LearningLoopResult {
  /** Per-decision projection accuracy */
  projectionAccuracies: ProjectionAccuracy[];
  /** Portfolio-level average accuracy */
  portfolioAccuracyScore: number;
  /** Per-domain efficiency trends */
  domainTrends: DomainEfficiencyTrend[];
  /** Per-owner accuracy and reliability */
  ownerAccuracies: OwnerAccuracy[];
  /** Value inflation detections */
  valueInflationFlags: ValueInflationFlag[];
  /** Suggested weight adjustments */
  weightSuggestions: WeightAdjustmentSuggestion[];
  /** Per-product confidence adjustments */
  confidenceAdjustments: ConfidenceAdjustment[];
}

export interface ValueInflationFlag {
  productId: string;
  ownerId: string;
  declaredValue: number;
  inferredMidValue: number;
  inflationRatio: number;
  severity: "low" | "medium" | "high";
}

// ---- Core Computation ----

/**
 * Run the learning loop analysis.
 *
 * @param products - All data products
 * @param decisions - All decisions (need resolved ones with impact data)
 * @param signalResults - Pre-computed ESE results
 * @param inferredValues - Optional: per-product inferred values for inflation detection
 */
export function computeLearningLoop(
  products: DataProduct[],
  decisions: Decision[],
  signalResults: EconomicSignalResult[],
  inferredValues?: Map<string, { inferredMid: number; confidence: number }>,
): LearningLoopResult {
  const signalMap = new Map(signalResults.map((r) => [r.productId, r]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // ---- 1. Projection Accuracy ----
  const projectionAccuracies: ProjectionAccuracy[] = [];
  const resolvedDecisions = decisions.filter(
    (d) => (d.status === "approved" || d.status === "rejected") &&
           d.estimatedImpact != null && d.estimatedImpact > 0 &&
           d.actualImpact != null,
  );

  for (const d of resolvedDecisions) {
    const estimated = d.estimatedImpact!;
    const actual = d.actualImpact!;
    const accuracyRatio = estimated > 0 ? actual / estimated : 0;
    projectionAccuracies.push({
      decisionId: d.id,
      productId: d.productId,
      estimatedImpact: estimated,
      actualImpact: actual,
      accuracyRatio: Math.round(accuracyRatio * 100) / 100,
      absoluteError: Math.round(Math.abs(1 - accuracyRatio) * 100) / 100,
    });
  }

  const portfolioAccuracyScore = projectionAccuracies.length > 0
    ? Math.round(
        (1 - projectionAccuracies.reduce((s, p) => s + p.absoluteError, 0) / projectionAccuracies.length) * 100,
      ) / 100
    : 0.5; // default: no data

  // ---- 2. Domain Efficiency Trends ----
  const domainData = new Map<string, {
    products: DataProduct[];
    scores: number[];
  }>();

  for (const p of products.filter((p) => p.lifecycleStage !== "retired")) {
    if (!domainData.has(p.domain)) {
      domainData.set(p.domain, { products: [], scores: [] });
    }
    const d = domainData.get(p.domain)!;
    d.products.push(p);
    const signal = signalMap.get(p.id);
    if (signal) d.scores.push(signal.economicSignalScore);
  }

  const domainTrends: DomainEfficiencyTrend[] = [...domainData.entries()].map(([domain, data]) => {
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      : 0;
    const totalCost = data.products.reduce((s, p) => s + p.monthlyCost, 0);
    const avgROI = data.products
      .filter((p) => p.roi !== null)
      .reduce((s, p) => s + (p.roi ?? 0), 0) / Math.max(1, data.products.filter((p) => p.roi !== null).length);

    // Trajectory from lifecycle stage distribution
    const growthCount = data.products.filter((p) => p.lifecycleStage === "growth").length;
    const declineCount = data.products.filter((p) => p.lifecycleStage === "decline").length;
    const matureCount = data.products.filter((p) => p.lifecycleStage === "mature").length;

    let trajectory: "improving" | "stable" | "declining" = "stable";
    if (growthCount > declineCount + matureCount * 0.5) trajectory = "improving";
    else if (declineCount > growthCount) trajectory = "declining";

    return {
      domain,
      productCount: data.products.length,
      averageEseScore: Math.round(avgScore * 100) / 100,
      totalMonthlyCost: Math.round(totalCost),
      averageROI: Math.round(avgROI * 100) / 100,
      trajectory,
    };
  });

  // ---- 3. Owner Accuracy ----
  const ownerDecisions = new Map<string, {
    ownerId: string;
    ownerName: string;
    productIds: Set<string>;
    accuracies: number[];
  }>();

  for (const p of products) {
    if (!ownerDecisions.has(p.owner.id)) {
      ownerDecisions.set(p.owner.id, {
        ownerId: p.owner.id,
        ownerName: p.owner.name,
        productIds: new Set(),
        accuracies: [],
      });
    }
    ownerDecisions.get(p.owner.id)!.productIds.add(p.id);
  }

  for (const pa of projectionAccuracies) {
    const product = productMap.get(pa.productId);
    if (product) {
      const owner = ownerDecisions.get(product.owner.id);
      if (owner) owner.accuracies.push(pa.accuracyRatio);
    }
  }

  const ownerAccuracies: OwnerAccuracy[] = [...ownerDecisions.values()].map((o) => {
    const avgAccuracy = o.accuracies.length > 0
      ? o.accuracies.reduce((s, v) => s + v, 0) / o.accuracies.length
      : 1.0;
    // Flag as inflator if average accuracy < 0.7 (over-estimates by 30%+)
    const isValueInflator = o.accuracies.length >= 2 && avgAccuracy < 0.7;

    return {
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      productCount: o.productIds.size,
      averageAccuracyRatio: Math.round(avgAccuracy * 100) / 100,
      decisionsSampled: o.accuracies.length,
      isValueInflator,
    };
  });

  // ---- 4. Value Inflation Detection ----
  const valueInflationFlags: ValueInflationFlag[] = [];

  if (inferredValues) {
    for (const p of products) {
      if (p.declaredValue === null || p.declaredValue === 0) continue;
      const inferred = inferredValues.get(p.id);
      if (!inferred) continue;

      const inferredMonthly = inferred.inferredMid / 12;
      if (inferredMonthly <= 0) continue;

      const inflationRatio = p.declaredValue / inferredMonthly;
      if (inflationRatio > 1.5) {
        valueInflationFlags.push({
          productId: p.id,
          ownerId: p.owner.id,
          declaredValue: p.declaredValue,
          inferredMidValue: Math.round(inferredMonthly),
          inflationRatio: Math.round(inflationRatio * 100) / 100,
          severity: inflationRatio > 3 ? "high" : inflationRatio > 2 ? "medium" : "low",
        });
      }
    }
  }

  // ---- 5. Weight Adjustment Suggestions ----
  const weightSuggestions: WeightAdjustmentSuggestion[] = [];

  // If projection accuracy is low, suggest reducing decision signal weight
  if (portfolioAccuracyScore < 0.6 && projectionAccuracies.length >= 3) {
    weightSuggestions.push({
      category: "decision",
      currentWeight: 0.10,
      suggestedWeight: 0.05,
      reason: `Portfolio projection accuracy is ${Math.round(portfolioAccuracyScore * 100)}% — decision signals may be unreliable`,
    });
  }

  // If many products have high cost volatility, suggest increasing cost weight
  const highVolatilityCount = signalResults.filter(
    (r) => r.costSignals.computeVolatility > 15,
  ).length;
  if (highVolatilityCount > signalResults.length * 0.3) {
    weightSuggestions.push({
      category: "cost",
      currentWeight: 0.25,
      suggestedWeight: 0.30,
      reason: `${highVolatilityCount} products (${Math.round(highVolatilityCount / signalResults.length * 100)}%) have high cost volatility`,
    });
  }

  // ---- 6. Confidence Adjustments ----
  const confidenceAdjustments: ConfidenceAdjustment[] = [];

  for (const p of products) {
    if (p.lifecycleStage === "retired") continue;
    const inferred = inferredValues?.get(p.id);
    if (!inferred) continue;

    const ownerData = ownerDecisions.get(p.owner.id);
    const ownerIsInflator = ownerAccuracies.find(
      (o) => o.ownerId === p.owner.id,
    )?.isValueInflator ?? false;

    if (ownerIsInflator && inferred.confidence > 0.5) {
      confidenceAdjustments.push({
        productId: p.id,
        currentConfidence: inferred.confidence,
        adjustedConfidence: Math.round((inferred.confidence * 0.8) * 100) / 100,
        reason: `Owner ${ownerData?.ownerName ?? p.owner.id} has history of value inflation`,
      });
    }
  }

  return {
    projectionAccuracies,
    portfolioAccuracyScore: Math.max(0, Math.min(1, portfolioAccuracyScore)),
    domainTrends,
    ownerAccuracies,
    valueInflationFlags,
    weightSuggestions,
    confidenceAdjustments,
  };
}
