/**
 * Reconciliation Test Suite
 *
 * Validates that ALL seed data is internally consistent according to
 * the Coherence Contract (see /docs/DATA_COHERENCE_CONTRACT.md).
 *
 * These tests run against the demo seed data and must pass before deployment.
 */

import { describe, it, expect } from "vitest";
import {
  computePortfolioMonthlySpend,
  computePortfolioROI,
  computeTotalConsumers,
  computeCapitalMisallocated,
  countRetirementCandidates,
  computeEstimatedSavings,
  computeCostCoverage,
  countProductsWithValue,
  computeCapitalFreed,
  computeCapitalByType,
  computeConfirmedSavings,
  computeProjectedSavings,
  computeCEI,
  computePortfolioSummary,
  computeBoardSummary,
  computeCapitalImpactSummary,
  computeSavingsSummary,
  computePortfolioRebalance,
  computeCapitalBehavior,
  computeCompositeValue,
  computeProductROI,
  classifyROI,
  verifyCostBreakdown,
  activeProducts,
  runReconciliation,
  type CapitalEvent,
} from "../canonical";

// ─── Import seed data ────────────────────────────────────────────────────────

import {
  dataProducts,
  portfolioSummary,
  capitalImpactSummary,
  savingsSummary,
  boardCapitalSummary,
  capitalEfficiency,
  portfolioRebalance,
  capitalBehavior,
  decisions,
  portfolioCostTrend,
  portfolioROIHistory,
} from "@/lib/mock-data/seed";

// ─── Extract capital events from seed data ───────────────────────────────────

const capitalEvents: CapitalEvent[] =
  capitalImpactSummary.recentEvents.map((e) => ({
    ...e,
    validationStatus:
      decisions.find((d) => d.id === e.decisionId)?.impactValidationStatus ??
      undefined,
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// R1: Portfolio Cost = Sum of Product Costs
// ═══════════════════════════════════════════════════════════════════════════════

describe("R1: Portfolio Cost Reconciliation", () => {
  it("portfolio totalCost equals sum of active product monthlyCosts", () => {
    const computed = computePortfolioMonthlySpend(dataProducts);
    expect(portfolioSummary.totalCost).toBe(computed);
  });

  it("each product monthlyCost equals sum of cost breakdown", () => {
    for (const p of dataProducts) {
      const result = verifyCostBreakdown(p);
      expect(result.valid).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R2: Product Composite Value and ROI
// ═══════════════════════════════════════════════════════════════════════════════

describe("R2: Product Value & ROI Consistency", () => {
  it("each product compositeValue follows 70/30 formula", () => {
    for (const p of dataProducts) {
      const expected = computeCompositeValue(
        p.declaredValue,
        p.usageImpliedValue,
      );
      expect(p.compositeValue).toBeCloseTo(expected, 0);
    }
  });

  it("each product ROI = compositeValue / monthlyCost", () => {
    for (const p of dataProducts) {
      const expected = computeProductROI(p.compositeValue, p.monthlyCost);
      if (expected === null) {
        expect(p.roi === null || p.roi === 0).toBe(true);
      } else {
        expect(p.roi).toBeCloseTo(expected, 1);
      }
    }
  });

  it("each product roiBand matches its ROI value", () => {
    for (const p of dataProducts) {
      const expected = classifyROI(p.roi);
      expect(p.roiBand).toBe(expected);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R3: Portfolio ROI = Cost-Weighted ROI
// ═══════════════════════════════════════════════════════════════════════════════

describe("R3: Portfolio ROI Reconciliation", () => {
  it("portfolioSummary.averageROI equals cost-weighted calculation", () => {
    const computed = computePortfolioROI(dataProducts);
    expect(portfolioSummary.averageROI).toBeCloseTo(computed, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R4: Capital Freed = Sum of Capital Events
// ═══════════════════════════════════════════════════════════════════════════════

describe("R4: Capital Freed Reconciliation", () => {
  it("capitalImpact.totalCapitalFreed equals sum of events", () => {
    const computed = computeCapitalFreed(capitalEvents);
    expect(capitalImpactSummary.totalCapitalFreed).toBe(computed);
  });

  it("savingsSummary.totalCapitalFreedMonthly equals sum of events", () => {
    const computed = computeCapitalFreed(capitalEvents);
    expect(savingsSummary.totalCapitalFreedMonthly).toBe(computed);
  });

  it("boardSummary.totalCapitalFreed equals sum of events", () => {
    const computed = computeCapitalFreed(capitalEvents);
    expect(boardCapitalSummary.totalCapitalFreed).toBe(computed);
  });

  it("capitalByType sums to total", () => {
    const byType = capitalImpactSummary.capitalByType;
    const sumByType = byType.reduce((s, t) => s + t.amount, 0);
    expect(sumByType).toBe(capitalImpactSummary.totalCapitalFreed);
  });

  it("annual equals monthly × 12", () => {
    expect(capitalImpactSummary.totalCapitalFreedAnnual).toBe(
      capitalImpactSummary.totalCapitalFreed * 12,
    );
    expect(savingsSummary.totalCapitalFreedAnnual).toBe(
      savingsSummary.totalCapitalFreedMonthly * 12,
    );
    expect(boardCapitalSummary.totalCapitalFreedAnnual).toBe(
      boardCapitalSummary.totalCapitalFreed * 12,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R5: ROI Shown Everywhere Matches
// ═══════════════════════════════════════════════════════════════════════════════

describe("R5: ROI Cross-Surface Consistency", () => {
  const canonical = computePortfolioROI(dataProducts);

  it("capitalImpact.portfolioRoiCurrent matches canonical", () => {
    expect(capitalImpactSummary.portfolioRoiCurrent).toBeCloseTo(
      canonical,
      1,
    );
  });

  it("boardSummary.portfolioRoiCurrent matches canonical", () => {
    expect(boardCapitalSummary.portfolioRoiCurrent).toBeCloseTo(canonical, 1);
  });

  it("portfolioRebalance.currentBlendedRoi matches canonical", () => {
    // Rebalance may exclude draft/zero-cost products, so use its own calc
    const rebalanceCanonical = computePortfolioRebalance(dataProducts);
    expect(portfolioRebalance.currentBlendedRoi).toBeCloseTo(
      rebalanceCanonical.currentBlendedRoi,
      1,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R6: CEI Score Matches
// ═══════════════════════════════════════════════════════════════════════════════

describe("R6: CEI Score Consistency", () => {
  it("board CEI matches capitalEfficiency CEI", () => {
    expect(boardCapitalSummary.capitalEfficiencyScore).toBeCloseTo(
      capitalEfficiency.score,
      0,
    );
  });

  it("CEI component scores sum to total", () => {
    const components = capitalEfficiency.components;
    const sum = Object.values(components).reduce(
      (s, c) => s + c.score,
      0,
    );
    expect(sum).toBeCloseTo(capitalEfficiency.score, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R7: Total Products
// ═══════════════════════════════════════════════════════════════════════════════

describe("R7: Product Count Consistency", () => {
  it("portfolioSummary.totalProducts equals dataProducts.length", () => {
    expect(portfolioSummary.totalProducts).toBe(dataProducts.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R8: Consumer Total
// ═══════════════════════════════════════════════════════════════════════════════

describe("R8: Consumer Count Reconciliation", () => {
  it("portfolioSummary.totalConsumers equals sum of product consumers", () => {
    const computed = computeTotalConsumers(dataProducts);
    expect(portfolioSummary.totalConsumers).toBe(computed);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R9: Decision-Event-Product Integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe("R9: Decision/Event/Product Integrity", () => {
  it("every capital event references a valid decision", () => {
    for (const event of capitalEvents) {
      const decision = decisions.find((d) => d.id === event.decisionId);
      expect(decision).toBeDefined();
    }
  });

  it("capital event amounts match decision capitalFreed", () => {
    for (const event of capitalEvents) {
      const decision = decisions.find((d) => d.id === event.decisionId);
      if (decision && decision.capitalFreed > 0) {
        expect(event.amount).toBe(decision.capitalFreed);
      }
    }
  });

  it("every decision references a valid product or known legacy product", () => {
    const productIds = new Set(dataProducts.map((p) => p.id));
    const knownLegacy = new Set(["dp-legacy-1"]); // Legacy CRM Extract

    for (const d of decisions) {
      const isValid =
        productIds.has(d.productId) || knownLegacy.has(d.productId);
      expect(isValid).toBe(true);
    }
  });

  it("retirement candidates count matches portfolio summary", () => {
    const computed = countRetirementCandidates(dataProducts);
    expect(portfolioSummary.retirementCandidates).toBe(computed);
  });

  it("estimated savings from retirement candidates matches", () => {
    const computed = computeEstimatedSavings(dataProducts);
    expect(portfolioSummary.estimatedSavings).toBe(computed);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R10: Time Series Alignment
// ═══════════════════════════════════════════════════════════════════════════════

describe("R10: Time Series Alignment", () => {
  it("cost trend and ROI history cover same months", () => {
    const costMonths = portfolioCostTrend.map((p) => p.month);
    const roiMonths = portfolioROIHistory.map((p) => p.month);
    expect(costMonths).toEqual(roiMonths);
  });

  it("capitalFreedByMonth entries sum to totalCapitalFreed", () => {
    const byMonth = capitalImpactSummary.capitalFreedByMonth;
    if (byMonth.length > 0) {
      const lastCumulative = byMonth[byMonth.length - 1].cumulative;
      expect(lastCumulative).toBe(capitalImpactSummary.totalCapitalFreed);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R11: Portfolio Rebalance Internal Consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe("R11: Portfolio Rebalance Consistency", () => {
  it("totalMonthlyCost matches sum of eligible products", () => {
    const rebalance = computePortfolioRebalance(dataProducts);
    expect(portfolioRebalance.totalMonthlyCost).toBe(
      rebalance.totalMonthlyCost,
    );
  });

  it("totalProducts matches count of eligible products", () => {
    const rebalance = computePortfolioRebalance(dataProducts);
    expect(portfolioRebalance.totalProducts).toBe(rebalance.totalProducts);
  });

  it("bottom quartile has lower ROI than top quartile", () => {
    expect(portfolioRebalance.bottomQuartile.blendedRoi).toBeLessThan(
      portfolioRebalance.topQuartile.blendedRoi,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Full Reconciliation Suite
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Reconciliation", () => {
  it("all rules pass", () => {
    const results = runReconciliation(
      dataProducts,
      decisions,
      capitalEvents,
      portfolioSummary,
      capitalImpactSummary,
      boardCapitalSummary,
      capitalEfficiency,
      savingsSummary,
    );

    const failures = results.filter((r) => !r.passed);
    if (failures.length > 0) {
      const details = failures
        .map(
          (f) =>
            `  ❌ ${f.rule}: expected=${f.expected}, actual=${f.actual} — ${f.detail}`,
        )
        .join("\n");
      console.error(`Reconciliation failures:\n${details}`);
    }
    expect(failures).toHaveLength(0);
  });
});
