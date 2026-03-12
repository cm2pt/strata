// ============================================================
// Strata — Economic Signal Engine (ESE)
//
// Computes a per-product economic_signal_score (0-100) by
// aggregating cost, usage, structural, decision, and stability
// signals from existing data product fields.
//
// All weights are configurable via ESE_WEIGHTS. Scores are
// deterministic: same inputs → same outputs.
// ============================================================

import type { DataProduct, Decision, CapitalEvent, LifecycleStage } from "../types";

// ---- Signal Interfaces ----

export interface CostSignals {
  infraCostMonthly: number;
  storageCostRatio: number;        // storage / total cost (0-1)
  computeVolatility: number;       // |costTrend| — higher = more volatile
  costGrowthVelocity: number;      // costTrend itself — positive = growing
  costConcentrationInDomain: number; // product cost / domain total cost (0-1)
}

export interface UsageSignals {
  uniqueConsumers: number;
  executiveConsumerWeight: number;   // 0-1: fraction of consumers in executive teams
  crossDomainDensity: number;        // 0-1: fraction of consumer teams from distinct domains
  usageFrequencyTrend: number;       // usageTrend % — positive = growing
  dependencyCentrality: number;      // proxy: downstream products + models + dashboards
  downstreamDashboardCount: number;
}

export interface StructuralSignals {
  downstreamReach: number;           // total downstream: products + models + dashboards
  blastRadiusEstimate: number;       // downstream consumers × downstream products
  upstreamSystemCount: number;       // 1 (from connector) — expandable with lineage
}

export interface DecisionSignals {
  linkedDecisionsCount: number;
  capitalEventsInfluenced: number;
  timeToDecisionDays: number;        // avg resolution time (0 = no resolved decisions)
}

export interface StabilitySignals {
  lifecycleStageScore: number;       // ordinal: draft=1, active=3, growth=4, mature=5, decline=2, retired=0
  freshnessScore: number;            // 0-1: how well product meets SLA (1 = perfect)
  churnVolatility: number;           // |usageTrend| as proxy for consumer churn
}

export interface EconomicSignalResult {
  productId: string;

  // Individual signal groups
  costSignals: CostSignals;
  usageSignals: UsageSignals;
  structuralSignals: StructuralSignals;
  decisionSignals: DecisionSignals;
  stabilitySignals: StabilitySignals;

  // Composite scores
  costScore: number;                 // 0-100 sub-score
  usageScore: number;                // 0-100 sub-score
  structuralScore: number;           // 0-100 sub-score
  decisionScore: number;             // 0-100 sub-score
  stabilityScore: number;            // 0-100 sub-score

  // Final
  economicSignalScore: number;       // 0-100
  economicEfficiencyRatio: number;   // score / normalized cost
}

// ---- Configurable Weights ----

export const ESE_WEIGHTS = {
  // Category weights (must sum to 1.0)
  cost: 0.25,
  usage: 0.30,
  structural: 0.15,
  decision: 0.10,
  stability: 0.20,

  // Cost sub-weights
  cost_infra: 0.10,         // low cost = good (inverse)
  cost_storage_ratio: 0.15, // low storage % = more compute-heavy = better for analytics
  cost_volatility: 0.30,    // low volatility = stable = good (inverse)
  cost_growth_velocity: 0.25, // low/negative growth = cheaper trend = good (inverse)
  cost_concentration: 0.20, // low concentration = distributed = good (inverse)

  // Usage sub-weights
  usage_consumers: 0.25,
  usage_executive: 0.20,
  usage_cross_domain: 0.15,
  usage_trend: 0.20,
  usage_centrality: 0.15,
  usage_dashboards: 0.05,

  // Structural sub-weights
  structural_reach: 0.40,
  structural_blast_radius: 0.40,
  structural_upstream: 0.20,

  // Decision sub-weights
  decision_linked: 0.30,
  decision_capital_events: 0.40,
  decision_time: 0.30,    // faster = better (inverse)

  // Stability sub-weights
  stability_lifecycle: 0.40,
  stability_freshness: 0.35,
  stability_churn: 0.25,  // low churn = stable = good (inverse)
} as const;

// ---- Lifecycle Stage Scoring ----

const LIFECYCLE_SCORE: Record<LifecycleStage, number> = {
  draft: 1,
  active: 3,
  growth: 4,
  mature: 5,
  decline: 2,
  retired: 0,
};

// ---- Executive Team Detection ----

const EXECUTIVE_KEYWORDS = [
  "executive", "c-suite", "leadership", "board", "cfo", "ceo", "coo", "cto", "cdo", "cio",
  "vp ", "vice president", "svp", "evp", "chief",
];

function isExecutiveTeam(teamName: string): boolean {
  const lower = teamName.toLowerCase();
  return EXECUTIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---- Normalization Utilities ----

/** Normalize a value to 0-100 using min-max across a set of values */
function minMaxNorm(value: number, min: number, max: number): number {
  if (max === min) return 50; // all equal → mid-score
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/** Inverse min-max: lower value → higher score */
function inverseMinMaxNorm(value: number, min: number, max: number): number {
  return 100 - minMaxNorm(value, min, max);
}

/** Clamp 0-100 */
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

// ---- Signal Computation ----

function computeCostSignals(
  product: DataProduct,
  domainCosts: Map<string, number>,
): CostSignals {
  const domainTotal = domainCosts.get(product.domain) ?? product.monthlyCost;
  return {
    infraCostMonthly: product.monthlyCost,
    storageCostRatio: product.monthlyCost > 0
      ? product.costBreakdown.storage / product.monthlyCost
      : 0,
    computeVolatility: Math.abs(product.costTrend),
    costGrowthVelocity: product.costTrend,
    costConcentrationInDomain: domainTotal > 0
      ? product.monthlyCost / domainTotal
      : 0,
  };
}

function computeUsageSignals(product: DataProduct): UsageSignals {
  const totalConsumers = product.consumerTeams.reduce((s, t) => s + t.consumers, 0);
  const execConsumers = product.consumerTeams
    .filter((t) => isExecutiveTeam(t.name))
    .reduce((s, t) => s + t.consumers, 0);

  // Cross-domain density: approximate from team name diversity
  // (in production, we'd match team→domain; here we use team count as proxy)
  const teamCount = product.consumerTeams.length;

  return {
    uniqueConsumers: product.monthlyConsumers,
    executiveConsumerWeight: totalConsumers > 0 ? execConsumers / totalConsumers : 0,
    crossDomainDensity: Math.min(1, teamCount / 5), // normalize: 5+ teams = max diversity
    usageFrequencyTrend: product.usageTrend,
    dependencyCentrality: product.downstreamProducts + product.downstreamModels + product.downstreamDashboards,
    downstreamDashboardCount: product.downstreamDashboards,
  };
}

function computeStructuralSignals(product: DataProduct): StructuralSignals {
  const downstreamReach = product.downstreamProducts + product.downstreamModels + product.downstreamDashboards;
  return {
    downstreamReach,
    blastRadiusEstimate: product.monthlyConsumers * Math.max(1, product.downstreamProducts),
    upstreamSystemCount: 1, // Each product traces to 1 source connector; expandable with lineage
  };
}

function computeDecisionSignals(
  product: DataProduct,
  decisions: Decision[],
  capitalEvents: CapitalEvent[],
): DecisionSignals {
  const linked = decisions.filter((d) => d.productId === product.id);
  const resolved = linked.filter((d) => d.status === "approved" || d.status === "rejected");

  let avgDays = 0;
  if (resolved.length > 0) {
    const totalDays = resolved.reduce((sum, d) => {
      const start = new Date(d.createdAt).getTime();
      const end = d.resolvedAt ? new Date(d.resolvedAt).getTime() : Date.now();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDays = totalDays / resolved.length;
  }

  return {
    linkedDecisionsCount: linked.length,
    capitalEventsInfluenced: capitalEvents.filter((ce) => ce.productId === product.id).length,
    timeToDecisionDays: Math.round(avgDays * 10) / 10,
  };
}

function computeStabilitySignals(product: DataProduct): StabilitySignals {
  return {
    lifecycleStageScore: LIFECYCLE_SCORE[product.lifecycleStage] ?? 0,
    freshnessScore: product.freshnessSLA > 0
      ? Math.max(0, Math.min(1, 1 - (product.freshnessHours / product.freshnessSLA - 1)))
      : 0.5,
    churnVolatility: Math.abs(product.usageTrend),
  };
}

// ---- Scoring Functions ----

interface NormBounds {
  min: number;
  max: number;
}

function buildNormBounds(values: number[]): NormBounds {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function scoreCostSignals(signals: CostSignals, bounds: {
  infra: NormBounds;
  storageRatio: NormBounds;
  volatility: NormBounds;
  growthVel: NormBounds;
  concentration: NormBounds;
}): number {
  const w = ESE_WEIGHTS;
  // For cost signals: lower is generally better (inverse normalization)
  const infraScore = inverseMinMaxNorm(signals.infraCostMonthly, bounds.infra.min, bounds.infra.max);
  const storageScore = inverseMinMaxNorm(signals.storageCostRatio, bounds.storageRatio.min, bounds.storageRatio.max);
  const volatilityScore = inverseMinMaxNorm(signals.computeVolatility, bounds.volatility.min, bounds.volatility.max);
  const growthScore = inverseMinMaxNorm(signals.costGrowthVelocity, bounds.growthVel.min, bounds.growthVel.max);
  const concentrationScore = inverseMinMaxNorm(signals.costConcentrationInDomain, bounds.concentration.min, bounds.concentration.max);

  return clamp100(
    infraScore * w.cost_infra +
    storageScore * w.cost_storage_ratio +
    volatilityScore * w.cost_volatility +
    growthScore * w.cost_growth_velocity +
    concentrationScore * w.cost_concentration,
  );
}

function scoreUsageSignals(signals: UsageSignals, bounds: {
  consumers: NormBounds;
  executive: NormBounds;
  crossDomain: NormBounds;
  trend: NormBounds;
  centrality: NormBounds;
  dashboards: NormBounds;
}): number {
  const w = ESE_WEIGHTS;
  // For usage signals: higher is generally better
  const consumersScore = minMaxNorm(signals.uniqueConsumers, bounds.consumers.min, bounds.consumers.max);
  const execScore = minMaxNorm(signals.executiveConsumerWeight, bounds.executive.min, bounds.executive.max);
  const crossDomainScore = minMaxNorm(signals.crossDomainDensity, bounds.crossDomain.min, bounds.crossDomain.max);
  const trendScore = minMaxNorm(signals.usageFrequencyTrend, bounds.trend.min, bounds.trend.max);
  const centralityScore = minMaxNorm(signals.dependencyCentrality, bounds.centrality.min, bounds.centrality.max);
  const dashboardScore = minMaxNorm(signals.downstreamDashboardCount, bounds.dashboards.min, bounds.dashboards.max);

  return clamp100(
    consumersScore * w.usage_consumers +
    execScore * w.usage_executive +
    crossDomainScore * w.usage_cross_domain +
    trendScore * w.usage_trend +
    centralityScore * w.usage_centrality +
    dashboardScore * w.usage_dashboards,
  );
}

function scoreStructuralSignals(signals: StructuralSignals, bounds: {
  reach: NormBounds;
  blast: NormBounds;
  upstream: NormBounds;
}): number {
  const w = ESE_WEIGHTS;
  const reachScore = minMaxNorm(signals.downstreamReach, bounds.reach.min, bounds.reach.max);
  const blastScore = minMaxNorm(signals.blastRadiusEstimate, bounds.blast.min, bounds.blast.max);
  const upstreamScore = minMaxNorm(signals.upstreamSystemCount, bounds.upstream.min, bounds.upstream.max);

  return clamp100(
    reachScore * w.structural_reach +
    blastScore * w.structural_blast_radius +
    upstreamScore * w.structural_upstream,
  );
}

function scoreDecisionSignals(signals: DecisionSignals, bounds: {
  linked: NormBounds;
  capitalEvents: NormBounds;
  time: NormBounds;
}): number {
  const w = ESE_WEIGHTS;
  const linkedScore = minMaxNorm(signals.linkedDecisionsCount, bounds.linked.min, bounds.linked.max);
  const eventsScore = minMaxNorm(signals.capitalEventsInfluenced, bounds.capitalEvents.min, bounds.capitalEvents.max);
  // Faster decisions = better (inverse)
  const timeScore = inverseMinMaxNorm(signals.timeToDecisionDays, bounds.time.min, bounds.time.max);

  return clamp100(
    linkedScore * w.decision_linked +
    eventsScore * w.decision_capital_events +
    timeScore * w.decision_time,
  );
}

function scoreStabilitySignals(signals: StabilitySignals, bounds: {
  lifecycle: NormBounds;
  freshness: NormBounds;
  churn: NormBounds;
}): number {
  const w = ESE_WEIGHTS;
  const lifecycleScore = minMaxNorm(signals.lifecycleStageScore, bounds.lifecycle.min, bounds.lifecycle.max);
  const freshnessScore = minMaxNorm(signals.freshnessScore, bounds.freshness.min, bounds.freshness.max);
  // Low churn = stable = good (inverse)
  const churnScore = inverseMinMaxNorm(signals.churnVolatility, bounds.churn.min, bounds.churn.max);

  return clamp100(
    lifecycleScore * w.stability_lifecycle +
    freshnessScore * w.stability_freshness +
    churnScore * w.stability_churn,
  );
}

// ---- Main Engine Function ----

/**
 * Compute economic signal scores for all products.
 *
 * Uses min-max normalization across the portfolio so scores are relative
 * to the current product set. This means adding/removing products will
 * shift all scores — which is the correct behavior for portfolio-relative
 * economic assessment.
 */
export function computeEconomicSignals(
  products: DataProduct[],
  decisions: Decision[],
  capitalEvents: CapitalEvent[],
): EconomicSignalResult[] {
  if (products.length === 0) return [];

  // Pre-compute domain cost totals
  const domainCosts = new Map<string, number>();
  for (const p of products) {
    domainCosts.set(p.domain, (domainCosts.get(p.domain) ?? 0) + p.monthlyCost);
  }

  // Compute raw signals for all products
  const rawSignals = products.map((p) => ({
    product: p,
    cost: computeCostSignals(p, domainCosts),
    usage: computeUsageSignals(p),
    structural: computeStructuralSignals(p),
    decision: computeDecisionSignals(p, decisions, capitalEvents),
    stability: computeStabilitySignals(p),
  }));

  // Build normalization bounds from the full portfolio
  const costBounds = {
    infra: buildNormBounds(rawSignals.map((r) => r.cost.infraCostMonthly)),
    storageRatio: buildNormBounds(rawSignals.map((r) => r.cost.storageCostRatio)),
    volatility: buildNormBounds(rawSignals.map((r) => r.cost.computeVolatility)),
    growthVel: buildNormBounds(rawSignals.map((r) => r.cost.costGrowthVelocity)),
    concentration: buildNormBounds(rawSignals.map((r) => r.cost.costConcentrationInDomain)),
  };

  const usageBounds = {
    consumers: buildNormBounds(rawSignals.map((r) => r.usage.uniqueConsumers)),
    executive: buildNormBounds(rawSignals.map((r) => r.usage.executiveConsumerWeight)),
    crossDomain: buildNormBounds(rawSignals.map((r) => r.usage.crossDomainDensity)),
    trend: buildNormBounds(rawSignals.map((r) => r.usage.usageFrequencyTrend)),
    centrality: buildNormBounds(rawSignals.map((r) => r.usage.dependencyCentrality)),
    dashboards: buildNormBounds(rawSignals.map((r) => r.usage.downstreamDashboardCount)),
  };

  const structuralBounds = {
    reach: buildNormBounds(rawSignals.map((r) => r.structural.downstreamReach)),
    blast: buildNormBounds(rawSignals.map((r) => r.structural.blastRadiusEstimate)),
    upstream: buildNormBounds(rawSignals.map((r) => r.structural.upstreamSystemCount)),
  };

  const decisionBounds = {
    linked: buildNormBounds(rawSignals.map((r) => r.decision.linkedDecisionsCount)),
    capitalEvents: buildNormBounds(rawSignals.map((r) => r.decision.capitalEventsInfluenced)),
    time: buildNormBounds(rawSignals.map((r) => r.decision.timeToDecisionDays)),
  };

  const stabilityBounds = {
    lifecycle: buildNormBounds(rawSignals.map((r) => r.stability.lifecycleStageScore)),
    freshness: buildNormBounds(rawSignals.map((r) => r.stability.freshnessScore)),
    churn: buildNormBounds(rawSignals.map((r) => r.stability.churnVolatility)),
  };

  // Compute normalized cost for efficiency ratio
  const maxCost = Math.max(...products.map((p) => p.monthlyCost), 1);

  // Score each product
  return rawSignals.map((r) => {
    const costScore = scoreCostSignals(r.cost, costBounds);
    const usageScore = scoreUsageSignals(r.usage, usageBounds);
    const structuralScore = scoreStructuralSignals(r.structural, structuralBounds);
    const decisionScore = scoreDecisionSignals(r.decision, decisionBounds);
    const stabilityScore = scoreStabilitySignals(r.stability, stabilityBounds);

    const w = ESE_WEIGHTS;
    const economicSignalScore = clamp100(
      costScore * w.cost +
      usageScore * w.usage +
      structuralScore * w.structural +
      decisionScore * w.decision +
      stabilityScore * w.stability,
    );

    const normalizedCost = r.product.monthlyCost / maxCost; // 0-1
    const economicEfficiencyRatio = normalizedCost > 0.01
      ? Math.round((economicSignalScore / (normalizedCost * 100)) * 100) / 100
      : economicSignalScore; // near-zero cost = efficiency = score itself

    return {
      productId: r.product.id,
      costSignals: r.cost,
      usageSignals: r.usage,
      structuralSignals: r.structural,
      decisionSignals: r.decision,
      stabilitySignals: r.stability,
      costScore,
      usageScore,
      structuralScore,
      decisionScore,
      stabilityScore,
      economicSignalScore,
      economicEfficiencyRatio,
    };
  });
}

// ---- Convenience Lookups ----

/** Build a Map<productId, EconomicSignalResult> for quick per-product access */
export function buildSignalIndex(
  results: EconomicSignalResult[],
): Map<string, EconomicSignalResult> {
  return new Map(results.map((r) => [r.productId, r]));
}

/** Portfolio-level summary statistics */
export interface PortfolioSignalSummary {
  averageScore: number;
  medianScore: number;
  topQuartileThreshold: number;
  bottomQuartileThreshold: number;
  highestScore: { productId: string; score: number };
  lowestScore: { productId: string; score: number };
}

export function computePortfolioSignalSummary(
  results: EconomicSignalResult[],
): PortfolioSignalSummary {
  if (results.length === 0) {
    return {
      averageScore: 0,
      medianScore: 0,
      topQuartileThreshold: 0,
      bottomQuartileThreshold: 0,
      highestScore: { productId: "", score: 0 },
      lowestScore: { productId: "", score: 0 },
    };
  }

  const sorted = [...results].sort((a, b) => a.economicSignalScore - b.economicSignalScore);
  const scores = sorted.map((r) => r.economicSignalScore);
  const sum = scores.reduce((s, v) => s + v, 0);

  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const medianIndex = Math.floor(scores.length * 0.5);

  return {
    averageScore: Math.round((sum / scores.length) * 100) / 100,
    medianScore: scores[medianIndex],
    topQuartileThreshold: scores[q3Index],
    bottomQuartileThreshold: scores[q1Index],
    highestScore: { productId: sorted[sorted.length - 1].productId, score: sorted[sorted.length - 1].economicSignalScore },
    lowestScore: { productId: sorted[0].productId, score: sorted[0].economicSignalScore },
  };
}
