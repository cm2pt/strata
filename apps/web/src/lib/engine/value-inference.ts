// ============================================================
// Strata — Value Inference Engine
//
// Estimates product value WITHOUT manual declarations using
// observable signals: executive usage, cross-domain integration,
// dependency centrality, decision linkage, and stability.
//
// Manual declared value becomes a modifier (increases confidence),
// not the sole source. This enables valuation even for products
// with no owner-declared value.
// ============================================================

import type { DataProduct, Decision } from "../types";
import type { EconomicSignalResult } from "./economic-signals";

// ---- Interfaces ----

export interface InferredValue {
  productId: string;
  /** Value band estimate: low, mid, high (annual) */
  inferredAnnualValueBand: {
    low: number;
    mid: number;
    high: number;
  };
  /** How confident we are in this estimate (0-1) */
  inferenceConfidenceScore: number;
  /** Whether a manual declaration exists */
  hasManualDeclaration: boolean;
  /** Manual declared value (null if none) */
  manualDeclaredValue: number | null;
  /** Blended final value: inference weighted by confidence + manual weighted by its presence */
  blendedMonthlyValue: number;
  /** Signal breakdown that drove the inference */
  signalContributions: InferenceSignalContribution[];
}

export interface InferenceSignalContribution {
  signal: string;
  rawValue: number;
  normalizedScore: number; // 0-100
  weight: number;
  contribution: number;    // normalized × weight
}

export interface ValueInferenceResult {
  perProduct: InferredValue[];
  /** Products where inference significantly differs from declaration */
  valueMismatches: ValueMismatch[];
  /** Portfolio-level: total inferred monthly value */
  totalInferredMonthlyValue: number;
  /** Portfolio-level: total declared monthly value (for comparison) */
  totalDeclaredMonthlyValue: number;
}

export interface ValueMismatch {
  productId: string;
  declaredMonthly: number;
  inferredMonthlyMid: number;
  /** > 1 means declared > inferred (possible inflation) */
  inflationRatio: number;
}

// ---- Configurable Weights ----

export const INFERENCE_WEIGHTS = {
  executiveUsage: 0.20,
  crossDomainIntegration: 0.15,
  dependencyCentrality: 0.20,
  decisionLinkage: 0.10,
  consumerScale: 0.15,
  stability: 0.10,
  costAsProxy: 0.10,
} as const;

/** Confidence boost when a manual declaration exists */
const MANUAL_DECLARATION_CONFIDENCE_BOOST = 0.15;
/** Base confidence floor (even with no signals) */
const BASE_CONFIDENCE = 0.30;
/** Maximum confidence achievable */
const MAX_CONFIDENCE = 0.95;

/**
 * Value multiplier curves: map normalized scores to annual value ranges.
 * These represent enterprise-calibrated value bands based on signal strength.
 * A product scoring 100 on all signals would be valued at ~$2M-$6M/year.
 * A product scoring 0 would be valued at ~$10K-$50K/year (base existence value).
 */
const VALUE_CURVE = {
  baseAnnual: 10_000,      // Minimum annual value even with no signals
  maxAnnual: 6_000_000,    // Maximum annual value cap
  midMultiplier: 0.50,     // Mid = 50% of max at max score
  lowMultiplier: 0.20,     // Low = 20% of max at max score
  highMultiplier: 1.00,    // High = 100% of max at max score
};

// ---- Normalization ----

function minMaxNorm(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// ---- Core Computation ----

/**
 * Infer value for all products using observable signals.
 *
 * @param products - All data products
 * @param decisions - All decisions (for decision linkage signal)
 * @param signalResults - Pre-computed ESE results
 */
export function computeValueInference(
  products: DataProduct[],
  decisions: Decision[],
  signalResults: EconomicSignalResult[],
): ValueInferenceResult {
  const signalMap = new Map(signalResults.map((r) => [r.productId, r]));
  const active = products.filter((p) => p.lifecycleStage !== "retired");

  // Compute bounds for normalization
  const decisionCounts = new Map<string, number>();
  for (const d of decisions) {
    decisionCounts.set(d.productId, (decisionCounts.get(d.productId) ?? 0) + 1);
  }

  const rawValues = active.map((p) => {
    const signal = signalMap.get(p.id);
    return {
      product: p,
      executiveUsage: signal?.usageSignals.executiveConsumerWeight ?? 0,
      crossDomain: signal?.usageSignals.crossDomainDensity ?? 0,
      centrality: signal?.usageSignals.dependencyCentrality ?? 0,
      decisionCount: decisionCounts.get(p.id) ?? 0,
      consumerScale: p.monthlyConsumers,
      stabilityScore: signal?.stabilityScore ?? 50,
      costProxy: p.monthlyCost,
    };
  });

  const bounds = {
    executive: { min: Math.min(...rawValues.map((r) => r.executiveUsage)), max: Math.max(...rawValues.map((r) => r.executiveUsage)) },
    crossDomain: { min: Math.min(...rawValues.map((r) => r.crossDomain)), max: Math.max(...rawValues.map((r) => r.crossDomain)) },
    centrality: { min: Math.min(...rawValues.map((r) => r.centrality)), max: Math.max(...rawValues.map((r) => r.centrality)) },
    decisions: { min: Math.min(...rawValues.map((r) => r.decisionCount)), max: Math.max(...rawValues.map((r) => r.decisionCount)) },
    consumers: { min: Math.min(...rawValues.map((r) => r.consumerScale)), max: Math.max(...rawValues.map((r) => r.consumerScale)) },
    stability: { min: Math.min(...rawValues.map((r) => r.stabilityScore)), max: Math.max(...rawValues.map((r) => r.stabilityScore)) },
    cost: { min: Math.min(...rawValues.map((r) => r.costProxy)), max: Math.max(...rawValues.map((r) => r.costProxy)) },
  };

  const perProduct: InferredValue[] = rawValues.map((r) => {
    const w = INFERENCE_WEIGHTS;

    // Normalize each signal to 0-100
    const signals: InferenceSignalContribution[] = [
      {
        signal: "executiveUsage",
        rawValue: r.executiveUsage,
        normalizedScore: minMaxNorm(r.executiveUsage, bounds.executive.min, bounds.executive.max),
        weight: w.executiveUsage,
        contribution: 0,
      },
      {
        signal: "crossDomainIntegration",
        rawValue: r.crossDomain,
        normalizedScore: minMaxNorm(r.crossDomain, bounds.crossDomain.min, bounds.crossDomain.max),
        weight: w.crossDomainIntegration,
        contribution: 0,
      },
      {
        signal: "dependencyCentrality",
        rawValue: r.centrality,
        normalizedScore: minMaxNorm(r.centrality, bounds.centrality.min, bounds.centrality.max),
        weight: w.dependencyCentrality,
        contribution: 0,
      },
      {
        signal: "decisionLinkage",
        rawValue: r.decisionCount,
        normalizedScore: minMaxNorm(r.decisionCount, bounds.decisions.min, bounds.decisions.max),
        weight: w.decisionLinkage,
        contribution: 0,
      },
      {
        signal: "consumerScale",
        rawValue: r.consumerScale,
        normalizedScore: minMaxNorm(r.consumerScale, bounds.consumers.min, bounds.consumers.max),
        weight: w.consumerScale,
        contribution: 0,
      },
      {
        signal: "stability",
        rawValue: r.stabilityScore,
        normalizedScore: minMaxNorm(r.stabilityScore, bounds.stability.min, bounds.stability.max),
        weight: w.stability,
        contribution: 0,
      },
      {
        signal: "costAsProxy",
        rawValue: r.costProxy,
        normalizedScore: minMaxNorm(r.costProxy, bounds.cost.min, bounds.cost.max),
        weight: w.costAsProxy,
        contribution: 0,
      },
    ];

    // Compute contributions
    for (const s of signals) {
      s.contribution = Math.round(s.normalizedScore * s.weight * 100) / 100;
    }

    // Composite score (0-100)
    const compositeScore = signals.reduce((sum, s) => sum + s.contribution, 0);

    // Map composite score to value band
    const scoreRatio = compositeScore / 100; // 0-1
    const rangeFull = VALUE_CURVE.maxAnnual - VALUE_CURVE.baseAnnual;
    const inferredAnnualValueBand = {
      low: Math.round(VALUE_CURVE.baseAnnual + rangeFull * scoreRatio * VALUE_CURVE.lowMultiplier),
      mid: Math.round(VALUE_CURVE.baseAnnual + rangeFull * scoreRatio * VALUE_CURVE.midMultiplier),
      high: Math.round(VALUE_CURVE.baseAnnual + rangeFull * scoreRatio * VALUE_CURVE.highMultiplier),
    };

    // Confidence: based on signal diversity + manual declaration
    const nonZeroSignals = signals.filter((s) => s.normalizedScore > 10).length;
    const signalDiversityBoost = (nonZeroSignals / signals.length) * 0.30;
    const hasManualDeclaration = r.product.declaredValue !== null && r.product.declaredValue > 0;
    const manualBoost = hasManualDeclaration ? MANUAL_DECLARATION_CONFIDENCE_BOOST : 0;
    const inferenceConfidenceScore = Math.min(
      MAX_CONFIDENCE,
      Math.round((BASE_CONFIDENCE + signalDiversityBoost + manualBoost) * 100) / 100,
    );

    // Blended monthly value: inference weighted by confidence, declaration by its presence
    const inferredMonthly = inferredAnnualValueBand.mid / 12;
    const declaredMonthly = r.product.declaredValue ?? 0;
    const blendedMonthlyValue = hasManualDeclaration
      ? Math.round(inferredMonthly * (1 - inferenceConfidenceScore * 0.3) + declaredMonthly * (inferenceConfidenceScore * 0.3))
      : Math.round(inferredMonthly);

    return {
      productId: r.product.id,
      inferredAnnualValueBand,
      inferenceConfidenceScore,
      hasManualDeclaration,
      manualDeclaredValue: r.product.declaredValue,
      blendedMonthlyValue,
      signalContributions: signals,
    };
  });

  // Detect value mismatches (declared vs inferred)
  const valueMismatches: ValueMismatch[] = perProduct
    .filter((p) => p.hasManualDeclaration && p.manualDeclaredValue !== null)
    .map((p) => {
      const declaredMonthly = p.manualDeclaredValue!;
      const inferredMonthlyMid = p.inferredAnnualValueBand.mid / 12;
      const inflationRatio = inferredMonthlyMid > 0
        ? Math.round((declaredMonthly / inferredMonthlyMid) * 100) / 100
        : 0;
      return {
        productId: p.productId,
        declaredMonthly,
        inferredMonthlyMid: Math.round(inferredMonthlyMid),
        inflationRatio,
      };
    })
    .filter((m) => m.inflationRatio > 1.5 || m.inflationRatio < 0.5); // Flag if >50% deviation

  return {
    perProduct,
    valueMismatches,
    totalInferredMonthlyValue: Math.round(perProduct.reduce((s, p) => s + p.blendedMonthlyValue, 0)),
    totalDeclaredMonthlyValue: Math.round(
      active
        .filter((p) => p.declaredValue !== null)
        .reduce((s, p) => s + (p.declaredValue ?? 0), 0),
    ),
  };
}
