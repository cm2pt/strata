// ============================================================
// Strata — Value Attribution Engine (VAE)
//
// Traces capital event impact through the lineage graph and
// allocates value to upstream products based on usage weight,
// centrality, and confidence.
// ============================================================

import type { DataProduct, Decision, CapitalEvent } from "../types";
import type { EconomicSignalResult } from "./economic-signals";

// ---- Interfaces ----

export interface ProductAttribution {
  productId: string;
  /** Total attributed capital impact from all events (monthly) */
  validatedCapitalImpact: number;
  /** Number of capital events that influenced this product */
  eventsAttributed: number;
  /** estimated impact vs actual impact ratio for resolved decisions */
  expectedVsRealizedRatio: number | null;
  /** Rolling accuracy of projections (0-1) */
  impactAccuracyScore: number;
  /** Breakdown per event */
  eventBreakdown: EventAttributionDetail[];
}

export interface EventAttributionDetail {
  eventId: string;
  decisionId: string;
  eventType: string;
  totalAmount: number;
  /** What fraction was attributed to this product */
  attributionWeight: number;
  /** Attributed amount = totalAmount × attributionWeight */
  attributedAmount: number;
  /** How the weight was computed */
  attributionMethod: "direct" | "lineage_weighted" | "usage_weighted";
}

export interface AttributionResult {
  /** Per-product attribution */
  perProduct: ProductAttribution[];
  /** Total capital attributed across all products */
  totalAttributed: number;
  /** Total capital events amount */
  totalCapitalEvents: number;
  /** Attribution coverage: how much of total events got attributed (0-1) */
  attributionCoverage: number;
}

// ---- Attribution Weights ----

export const ATTRIBUTION_WEIGHTS = {
  /** Weight for direct product linkage (event.productId matches) */
  directWeight: 0.60,
  /** Weight for usage-based allocation (consumer count × centrality) */
  usageWeight: 0.25,
  /** Weight for structural position (downstream reach) */
  structuralWeight: 0.15,
} as const;

// ---- Core Computation ----

/**
 * Compute value attribution for all products based on capital events.
 *
 * Attribution logic:
 * 1. Events with a direct productId get 60% weight to that product
 * 2. Remaining 40% is distributed across related products based on:
 *    - Usage (consumer count as proxy for dependency)
 *    - Structural position (downstream reach)
 * 3. Events without a productId are distributed across all products
 *    weighted by their ESE score
 */
export function computeValueAttribution(
  products: DataProduct[],
  decisions: Decision[],
  capitalEvents: CapitalEvent[],
  signalResults: EconomicSignalResult[],
): AttributionResult {
  const signalMap = new Map(signalResults.map((r) => [r.productId, r]));
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));
  const active = products.filter((p) => p.lifecycleStage !== "retired");
  const productMap = new Map(active.map((p) => [p.id, p]));

  // Initialize per-product accumulators
  const attributions = new Map<string, {
    directAmount: number;
    indirectAmount: number;
    events: EventAttributionDetail[];
  }>();

  for (const p of active) {
    attributions.set(p.id, { directAmount: 0, indirectAmount: 0, events: [] });
  }

  // Total ESE score for proportional distribution
  const totalScore = signalResults
    .filter((r) => productMap.has(r.productId))
    .reduce((s, r) => s + r.economicSignalScore, 0);

  let totalAttributed = 0;

  for (const event of capitalEvents) {
    const decision = decisionMap.get(event.decisionId);
    const directProductId = event.productId ?? decision?.productId ?? null;
    const directProduct = directProductId ? productMap.get(directProductId) : null;

    if (directProduct) {
      // Direct attribution: 60% to the directly linked product
      const directAmount = event.amount * ATTRIBUTION_WEIGHTS.directWeight;
      const acc = attributions.get(directProduct.id)!;
      acc.directAmount += directAmount;
      acc.events.push({
        eventId: event.id,
        decisionId: event.decisionId,
        eventType: event.eventType,
        totalAmount: event.amount,
        attributionWeight: ATTRIBUTION_WEIGHTS.directWeight,
        attributedAmount: Math.round(directAmount),
        attributionMethod: "direct",
      });
      totalAttributed += directAmount;

      // Indirect attribution: remaining 40% distributed by usage + structural
      const indirectPool = event.amount * (1 - ATTRIBUTION_WEIGHTS.directWeight);
      const samedomainProducts = active.filter(
        (p) => p.domain === directProduct.domain && p.id !== directProduct.id,
      );

      if (samedomainProducts.length > 0) {
        // Weight by usage + structural signals
        const weights = samedomainProducts.map((p) => {
          const signal = signalMap.get(p.id);
          const usageComponent = (signal?.usageScore ?? 0) * ATTRIBUTION_WEIGHTS.usageWeight;
          const structuralComponent = (signal?.structuralScore ?? 0) * ATTRIBUTION_WEIGHTS.structuralWeight;
          return { productId: p.id, weight: usageComponent + structuralComponent };
        });

        const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

        for (const w of weights) {
          if (totalWeight === 0) continue;
          const amount = indirectPool * (w.weight / totalWeight);
          const acc = attributions.get(w.productId)!;
          acc.indirectAmount += amount;
          acc.events.push({
            eventId: event.id,
            decisionId: event.decisionId,
            eventType: event.eventType,
            totalAmount: event.amount,
            attributionWeight: Math.round((w.weight / totalWeight) * (1 - ATTRIBUTION_WEIGHTS.directWeight) * 10000) / 10000,
            attributedAmount: Math.round(amount),
            attributionMethod: "usage_weighted",
          });
          totalAttributed += amount;
        }
      } else {
        // No same-domain products; direct product absorbs all
        acc.directAmount += indirectPool;
        totalAttributed += indirectPool;
      }
    } else {
      // No direct product link — distribute by ESE score
      if (totalScore === 0) continue;

      for (const p of active) {
        const signal = signalMap.get(p.id);
        const weight = (signal?.economicSignalScore ?? 0) / totalScore;
        const amount = event.amount * weight;
        const acc = attributions.get(p.id)!;
        acc.indirectAmount += amount;
        acc.events.push({
          eventId: event.id,
          decisionId: event.decisionId,
          eventType: event.eventType,
          totalAmount: event.amount,
          attributionWeight: Math.round(weight * 10000) / 10000,
          attributedAmount: Math.round(amount),
          attributionMethod: "lineage_weighted",
        });
        totalAttributed += amount;
      }
    }
  }

  // Build per-product results
  const decisionsByProduct = new Map<string, Decision[]>();
  for (const d of decisions) {
    if (!decisionsByProduct.has(d.productId)) decisionsByProduct.set(d.productId, []);
    decisionsByProduct.get(d.productId)!.push(d);
  }

  const perProduct: ProductAttribution[] = active.map((p) => {
    const acc = attributions.get(p.id)!;
    const totalImpact = acc.directAmount + acc.indirectAmount;

    // Expected vs realized ratio from resolved decisions
    const productDecisions = decisionsByProduct.get(p.id) ?? [];
    const resolved = productDecisions.filter((d) => d.status === "approved");
    let expectedVsRealizedRatio: number | null = null;
    let impactAccuracyScore = 0.5; // default: no data

    if (resolved.length > 0) {
      let totalEstimated = 0;
      let totalRealized = 0;

      for (const d of resolved) {
        totalEstimated += d.estimatedImpact ?? 0;
        totalRealized += d.actualImpact ?? 0;
      }

      if (totalEstimated > 0) {
        expectedVsRealizedRatio = Math.round((totalRealized / totalEstimated) * 100) / 100;
        // Accuracy = 1 - |1 - ratio| clamped to [0, 1]
        impactAccuracyScore = Math.max(0, Math.min(1,
          1 - Math.abs(1 - expectedVsRealizedRatio),
        ));
      }
    }

    return {
      productId: p.id,
      validatedCapitalImpact: Math.round(totalImpact),
      eventsAttributed: acc.events.length,
      expectedVsRealizedRatio,
      impactAccuracyScore: Math.round(impactAccuracyScore * 100) / 100,
      eventBreakdown: acc.events,
    };
  });

  const totalCapitalEvents = capitalEvents.reduce((s, e) => s + e.amount, 0);

  return {
    perProduct,
    totalAttributed: Math.round(totalAttributed),
    totalCapitalEvents,
    attributionCoverage: totalCapitalEvents > 0
      ? Math.round((totalAttributed / totalCapitalEvents) * 100) / 100
      : 0,
  };
}
