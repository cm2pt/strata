// ============================================================
// Strata — Portfolio Frontier (Pareto Efficiency Analysis)
//
// Computes the Pareto frontier on economic_signal_score vs cost,
// identifies each product's distance from the frontier, and
// quantifies total reallocation potential.
// ============================================================

import type { DataProduct } from "../types";
import type { EconomicSignalResult } from "./economic-signals";

// ---- Interfaces ----

export interface FrontierPoint {
  productId: string;
  productName: string;
  domain: string;
  /** X-axis: economic signal score (0-100) */
  economicSignalScore: number;
  /** Y-axis: monthly cost */
  monthlyCost: number;
  /** Whether this product is on the Pareto frontier */
  isOnFrontier: boolean;
  /** Euclidean distance to nearest frontier point (0 if on frontier) */
  inefficiencyGap: number;
  /** The frontier point this product should aspire to */
  nearestFrontierProductId: string | null;
  /** Cost reduction needed to reach frontier efficiency at same score */
  costReductionToFrontier: number;
}

export interface FrontierResult {
  /** All products plotted on the frontier chart */
  points: FrontierPoint[];
  /** Products on the Pareto frontier (efficient set) */
  frontierProducts: string[];
  /** Sum of inefficiency gaps across all below-frontier products */
  totalInefficiencyGap: number;
  /** Sum of cost reductions needed to move all products to frontier */
  reallocationPotential: number;
  /** Theoretical portfolio value if all products matched frontier efficiency */
  portfolioOptimizationPotential: number;
  /** Current portfolio efficiency score (0-100) */
  portfolioEfficiencyScore: number;
}

// ---- Pareto Frontier Computation ----

/**
 * Compute the Pareto frontier.
 *
 * A product is on the frontier if no other product has BOTH:
 * - higher economic_signal_score AND
 * - lower monthly_cost
 *
 * In other words, frontier products are the most "efficient" —
 * you can't find another product that delivers more economic
 * signal at a lower cost.
 */
function computeParetoFrontier(
  products: { productId: string; score: number; cost: number }[],
): Set<string> {
  const frontier = new Set<string>();

  for (const candidate of products) {
    let isDominated = false;

    for (const other of products) {
      if (other.productId === candidate.productId) continue;
      // `other` dominates `candidate` if it has higher score AND lower cost
      if (other.score >= candidate.score && other.cost <= candidate.cost) {
        // Strict domination: at least one dimension must be strictly better
        if (other.score > candidate.score || other.cost < candidate.cost) {
          isDominated = true;
          break;
        }
      }
    }

    if (!isDominated) {
      frontier.add(candidate.productId);
    }
  }

  return frontier;
}

/**
 * Find the nearest frontier point to a given below-frontier product.
 * "Nearest" means the frontier point that minimizes the cost the
 * product would need to reduce to match the frontier's efficiency
 * at a comparable or higher score.
 */
function findNearestFrontierPoint(
  score: number,
  cost: number,
  frontierPoints: { productId: string; score: number; cost: number }[],
): { productId: string; costReduction: number; distance: number } {
  let nearest = { productId: "", costReduction: Infinity, distance: Infinity };

  for (const fp of frontierPoints) {
    // Normalize score (0-100) and cost to comparable scales
    const scoreDiff = fp.score - score;
    const costDiff = cost - fp.cost;

    // Only consider frontier points with higher or equal score
    // (we want to move "toward" the frontier, not away)
    if (scoreDiff < -10) continue; // skip if frontier point scores much lower

    // Euclidean distance in normalized space
    const normalizedScoreDiff = scoreDiff / 100;
    const maxCost = Math.max(cost, fp.cost, 1);
    const normalizedCostDiff = costDiff / maxCost;
    const distance = Math.sqrt(normalizedScoreDiff ** 2 + normalizedCostDiff ** 2);

    // Cost reduction = how much cheaper the frontier point is (positive = savings)
    const costReduction = Math.max(0, cost - fp.cost);

    if (distance < nearest.distance) {
      nearest = { productId: fp.productId, costReduction, distance };
    }
  }

  return nearest;
}

// ---- Main Function ----

/**
 * Compute the Portfolio Frontier analysis.
 *
 * @param products - All data products
 * @param signalResults - Pre-computed ESE results
 */
export function computePortfolioFrontier(
  products: DataProduct[],
  signalResults: EconomicSignalResult[],
): FrontierResult {
  const signalMap = new Map(signalResults.map((r) => [r.productId, r]));

  // Active products only
  const active = products.filter((p) => p.lifecycleStage !== "retired");

  const productData = active.map((p) => ({
    productId: p.id,
    productName: p.name,
    domain: p.domain,
    score: signalMap.get(p.id)?.economicSignalScore ?? 0,
    cost: p.monthlyCost,
  }));

  // Compute Pareto frontier
  const frontierIds = computeParetoFrontier(productData);
  const frontierData = productData.filter((p) => frontierIds.has(p.productId));

  // Compute per-product metrics
  const points: FrontierPoint[] = productData.map((p) => {
    const isOnFrontier = frontierIds.has(p.productId);

    if (isOnFrontier) {
      return {
        productId: p.productId,
        productName: p.productName,
        domain: p.domain,
        economicSignalScore: p.score,
        monthlyCost: p.cost,
        isOnFrontier: true,
        inefficiencyGap: 0,
        nearestFrontierProductId: null,
        costReductionToFrontier: 0,
      };
    }

    const nearest = findNearestFrontierPoint(p.score, p.cost, frontierData);

    return {
      productId: p.productId,
      productName: p.productName,
      domain: p.domain,
      economicSignalScore: p.score,
      monthlyCost: p.cost,
      isOnFrontier: false,
      inefficiencyGap: Math.round(nearest.distance * 10000) / 10000,
      nearestFrontierProductId: nearest.productId || null,
      costReductionToFrontier: Math.round(nearest.costReduction),
    };
  });

  // Aggregate metrics
  const totalInefficiencyGap = points
    .filter((p) => !p.isOnFrontier)
    .reduce((s, p) => s + p.inefficiencyGap, 0);

  const reallocationPotential = points
    .filter((p) => !p.isOnFrontier)
    .reduce((s, p) => s + p.costReductionToFrontier, 0);

  // Portfolio optimization potential:
  // If all products operated at frontier efficiency (score/cost ratio),
  // what would be the theoretical portfolio value?
  const frontierEfficiencyRatio = frontierData.length > 0
    ? frontierData.reduce((s, p) => s + (p.cost > 0 ? p.score / p.cost : 0), 0) / frontierData.length
    : 0;
  const currentTotalCost = productData.reduce((s, p) => s + p.cost, 0);
  const currentTotalScore = productData.reduce((s, p) => s + p.score, 0);
  const theoreticalTotalScore = currentTotalCost * frontierEfficiencyRatio;
  const portfolioOptimizationPotential = Math.max(0, Math.round(theoreticalTotalScore - currentTotalScore));

  // Portfolio efficiency: how close the portfolio is to the frontier overall
  const portfolioEfficiencyScore = theoreticalTotalScore > 0
    ? Math.round((currentTotalScore / theoreticalTotalScore) * 100 * 100) / 100
    : 0;

  return {
    points,
    frontierProducts: [...frontierIds],
    totalInefficiencyGap: Math.round(totalInefficiencyGap * 10000) / 10000,
    reallocationPotential,
    portfolioOptimizationPotential,
    portfolioEfficiencyScore: Math.min(100, portfolioEfficiencyScore),
  };
}
