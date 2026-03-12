/**
 * Capital Intelligence Engine — Reconciliation Tests
 *
 * Validates that all engine outputs are internally consistent,
 * deterministic, and reconcile with portfolio-level metrics.
 */

import { describe, it, expect } from "vitest";
import {
  dataProducts,
  decisions,
  capitalEvents,
} from "@/lib/mock-data/seed";
import {
  computeEconomicSignals,
  computePortfolioSignalSummary,
  computeOpportunityCost,
  computePortfolioFrontier,
  computeValueAttribution,
  computeValueInference,
  computeLearningLoop,
} from "../index";

// ─── Pre-compute all engine outputs ──────────────────────────────────────────

const signalResults = computeEconomicSignals(dataProducts, decisions, capitalEvents);
const signalSummary = computePortfolioSignalSummary(signalResults);
const opportunityCost = computeOpportunityCost(dataProducts, decisions, signalResults);
const frontier = computePortfolioFrontier(dataProducts, signalResults);
const attribution = computeValueAttribution(dataProducts, decisions, capitalEvents, signalResults);
const inference = computeValueInference(dataProducts, decisions, signalResults);
const activeProducts = dataProducts.filter((p) => p.lifecycleStage !== "retired");

// ═══════════════════════════════════════════════════════════════════════════════
// E1: Economic Signal Engine Consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe("E1: Economic Signal Scores", () => {
  it("produces one result per product", () => {
    expect(signalResults.length).toBe(dataProducts.length);
  });

  it("all scores are in range 0-100", () => {
    for (const r of signalResults) {
      expect(r.economicSignalScore).toBeGreaterThanOrEqual(0);
      expect(r.economicSignalScore).toBeLessThanOrEqual(100);
      expect(r.costScore).toBeGreaterThanOrEqual(0);
      expect(r.costScore).toBeLessThanOrEqual(100);
      expect(r.usageScore).toBeGreaterThanOrEqual(0);
      expect(r.usageScore).toBeLessThanOrEqual(100);
      expect(r.structuralScore).toBeGreaterThanOrEqual(0);
      expect(r.structuralScore).toBeLessThanOrEqual(100);
      expect(r.decisionScore).toBeGreaterThanOrEqual(0);
      expect(r.decisionScore).toBeLessThanOrEqual(100);
      expect(r.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(r.stabilityScore).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic — same inputs produce same outputs", () => {
    const second = computeEconomicSignals(dataProducts, decisions, capitalEvents);
    for (let i = 0; i < signalResults.length; i++) {
      expect(signalResults[i].economicSignalScore).toBe(second[i].economicSignalScore);
    }
  });

  it("portfolio summary statistics are internally consistent", () => {
    expect(signalSummary.averageScore).toBeGreaterThan(0);
    expect(signalSummary.medianScore).toBeGreaterThan(0);
    expect(signalSummary.bottomQuartileThreshold).toBeLessThanOrEqual(signalSummary.medianScore);
    expect(signalSummary.topQuartileThreshold).toBeGreaterThanOrEqual(signalSummary.medianScore);
    expect(signalSummary.lowestScore.score).toBeLessThanOrEqual(signalSummary.highestScore.score);
  });

  it("efficiency ratio is positive for non-zero cost products", () => {
    for (const r of signalResults) {
      expect(r.economicEfficiencyRatio).toBeGreaterThanOrEqual(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2: Opportunity Cost & CPI
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2: Opportunity Cost Reconciliation", () => {
  it("CPI is in range 0-100", () => {
    expect(opportunityCost.capitalPressureIndex).toBeGreaterThanOrEqual(0);
    expect(opportunityCost.capitalPressureIndex).toBeLessThanOrEqual(100);
  });

  it("misallocated capital <= total active portfolio cost", () => {
    const totalActiveCost = activeProducts.reduce((s, p) => s + p.monthlyCost, 0);
    expect(opportunityCost.capitalMisallocated).toBeLessThanOrEqual(totalActiveCost);
  });

  it("bottom quartile capital <= total active portfolio cost", () => {
    const totalActiveCost = activeProducts.reduce((s, p) => s + p.monthlyCost, 0);
    expect(opportunityCost.bottomQuartileLockedCapital).toBeLessThanOrEqual(totalActiveCost);
  });

  it("per-product entries match active product count", () => {
    expect(opportunityCost.perProduct.length).toBe(activeProducts.length);
  });

  it("undeclared spend equals sum of products with no declared value", () => {
    const expected = activeProducts
      .filter((p) => p.declaredValue === null || p.declaredValue === 0)
      .reduce((s, p) => s + p.monthlyCost, 0);
    expect(opportunityCost.undeclaredSpend).toBe(Math.round(expected));
  });

  it("decline stage spend equals sum of declining products", () => {
    const expected = activeProducts
      .filter((p) => p.lifecycleStage === "decline")
      .reduce((s, p) => s + p.monthlyCost, 0);
    expect(opportunityCost.declineStageSpend).toBe(Math.round(expected));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E3: Portfolio Frontier
// ═══════════════════════════════════════════════════════════════════════════════

describe("E3: Portfolio Frontier Consistency", () => {
  it("frontier products have inefficiencyGap = 0", () => {
    for (const p of frontier.points) {
      if (p.isOnFrontier) {
        expect(p.inefficiencyGap).toBe(0);
        expect(p.costReductionToFrontier).toBe(0);
      }
    }
  });

  it("at least one product is on the frontier", () => {
    expect(frontier.frontierProducts.length).toBeGreaterThan(0);
  });

  it("frontier products are a subset of active products", () => {
    const activeIds = new Set(activeProducts.map((p) => p.id));
    for (const fpId of frontier.frontierProducts) {
      expect(activeIds.has(fpId)).toBe(true);
    }
  });

  it("portfolio efficiency score is in range 0-100", () => {
    expect(frontier.portfolioEfficiencyScore).toBeGreaterThanOrEqual(0);
    expect(frontier.portfolioEfficiencyScore).toBeLessThanOrEqual(100);
  });

  it("reallocation potential is non-negative", () => {
    expect(frontier.reallocationPotential).toBeGreaterThanOrEqual(0);
  });

  it("no frontier product is dominated", () => {
    const frontierSet = new Set(frontier.frontierProducts);
    const frontierPoints = frontier.points.filter((p) => frontierSet.has(p.productId));

    for (const candidate of frontierPoints) {
      for (const other of frontierPoints) {
        if (other.productId === candidate.productId) continue;
        // No other frontier product should strictly dominate
        const strictlyDominates =
          other.economicSignalScore > candidate.economicSignalScore &&
          other.monthlyCost < candidate.monthlyCost;
        expect(strictlyDominates).toBe(false);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4: Value Attribution
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4: Value Attribution Reconciliation", () => {
  it("attribution coverage is between 0 and 1", () => {
    expect(attribution.attributionCoverage).toBeGreaterThanOrEqual(0);
    expect(attribution.attributionCoverage).toBeLessThanOrEqual(1);
  });

  it("total attributed does not exceed total capital events × 1.01 (rounding tolerance)", () => {
    expect(attribution.totalAttributed).toBeLessThanOrEqual(
      attribution.totalCapitalEvents * 1.01 + 1,
    );
  });

  it("per-product entries exist for all active products", () => {
    expect(attribution.perProduct.length).toBe(activeProducts.length);
  });

  it("impact accuracy scores are in range 0-1", () => {
    for (const p of attribution.perProduct) {
      expect(p.impactAccuracyScore).toBeGreaterThanOrEqual(0);
      expect(p.impactAccuracyScore).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5: Value Inference
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5: Value Inference Consistency", () => {
  it("produces results for all active products", () => {
    expect(inference.perProduct.length).toBe(activeProducts.length);
  });

  it("confidence scores are in range 0-1", () => {
    for (const p of inference.perProduct) {
      expect(p.inferenceConfidenceScore).toBeGreaterThanOrEqual(0);
      expect(p.inferenceConfidenceScore).toBeLessThanOrEqual(1);
    }
  });

  it("value bands are ordered: low <= mid <= high", () => {
    for (const p of inference.perProduct) {
      expect(p.inferredAnnualValueBand.low).toBeLessThanOrEqual(
        p.inferredAnnualValueBand.mid,
      );
      expect(p.inferredAnnualValueBand.mid).toBeLessThanOrEqual(
        p.inferredAnnualValueBand.high,
      );
    }
  });

  it("blended monthly values are non-negative", () => {
    for (const p of inference.perProduct) {
      expect(p.blendedMonthlyValue).toBeGreaterThanOrEqual(0);
    }
  });

  it("value mismatches have inflation ratio > 1.5 or < 0.5", () => {
    for (const m of inference.valueMismatches) {
      expect(m.inflationRatio > 1.5 || m.inflationRatio < 0.5).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E6: Learning Loop
// ═══════════════════════════════════════════════════════════════════════════════

describe("E6: Learning Loop Consistency", () => {
  const learningLoop = computeLearningLoop(dataProducts, decisions, signalResults);

  it("portfolio accuracy score is in range 0-1", () => {
    expect(learningLoop.portfolioAccuracyScore).toBeGreaterThanOrEqual(0);
    expect(learningLoop.portfolioAccuracyScore).toBeLessThanOrEqual(1);
  });

  it("domain trends cover all active domains", () => {
    const activeDomains = new Set(activeProducts.map((p) => p.domain));
    const trendDomains = new Set(learningLoop.domainTrends.map((t) => t.domain));
    for (const d of activeDomains) {
      expect(trendDomains.has(d)).toBe(true);
    }
  });

  it("domain product counts sum to total active products", () => {
    const sum = learningLoop.domainTrends.reduce((s, t) => s + t.productCount, 0);
    expect(sum).toBe(activeProducts.length);
  });

  it("projection accuracy entries reference valid decisions", () => {
    const decisionIds = new Set(decisions.map((d) => d.id));
    for (const pa of learningLoop.projectionAccuracies) {
      expect(decisionIds.has(pa.decisionId)).toBe(true);
    }
  });

  it("value inflation flags have severity", () => {
    for (const flag of learningLoop.valueInflationFlags) {
      expect(["low", "medium", "high"]).toContain(flag.severity);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E7: Cross-Engine Consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe("E7: Cross-Engine Consistency", () => {
  it("ESE results used by frontier match ESE direct computation", () => {
    const signalMap = new Map(signalResults.map((r) => [r.productId, r]));
    for (const fp of frontier.points) {
      const signal = signalMap.get(fp.productId);
      if (signal) {
        expect(fp.economicSignalScore).toBe(signal.economicSignalScore);
      }
    }
  });

  it("product count consistent across engines", () => {
    const activeCount = activeProducts.length;
    expect(opportunityCost.perProduct.length).toBe(activeCount);
    expect(frontier.points.length).toBe(activeCount);
    expect(attribution.perProduct.length).toBe(activeCount);
    expect(inference.perProduct.length).toBe(activeCount);
  });
});
