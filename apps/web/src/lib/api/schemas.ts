/**
 * Strata -- API Response Validation Schemas
 *
 * Runtime Zod schemas that mirror the TypeScript types in @/lib/types.ts.
 * Used to validate API responses at runtime so backend contract changes
 * are caught early -- even before TypeScript can flag them.
 *
 * Design decisions:
 *   - `.passthrough()` on every object schema so new fields from the
 *     backend never break the frontend.
 *   - `validateResponse()` logs warnings in development but never
 *     throws in production, keeping the app resilient.
 */

import { z } from "zod";

// ============================================================
// Base / Reusable Primitives
// ============================================================

/** Accepts ISO datetime strings and plain date strings (e.g. "2025-03-15") */
const dateString = z.string();

/** Accepts UUIDs and short IDs like "dp-001" */
const entityId = z.string().min(1);

// ============================================================
// Enum Schemas
// ============================================================

export const LifecycleStageSchema = z.enum([
  "draft",
  "active",
  "growth",
  "mature",
  "decline",
  "retired",
]);

export const PlatformSchema = z.enum(["snowflake", "databricks", "s3", "power_bi", "bigquery"]);

export const ROIBandSchema = z.enum([
  "high",
  "healthy",
  "underperforming",
  "critical",
]);

export const ValueMethodSchema = z.enum([
  "revenue_attribution",
  "cost_avoidance",
  "efficiency_gain",
  "compliance",
  "strategic",
]);

export const DecisionTypeSchema = z.enum([
  "retirement",
  "cost_investigation",
  "value_revalidation",
  "low_roi_review",
  "capital_reallocation",
  "pricing_activation",
  "ai_project_review",
  "portfolio_change",
]);

export const DecisionStatusSchema = z.enum([
  "under_review",
  "approved",
  "rejected",
  "delayed",
]);

export const PricingModelSchema = z.enum([
  "cost_plus",
  "usage_based",
  "tiered",
  "flat",
  "value_share",
]);

export const PricingPolicyStatusSchema = z.enum([
  "draft",
  "active",
  "retired",
]);

export const ConnectorStatusSchema = z.enum([
  "connected",
  "syncing",
  "error",
  "disconnected",
]);

export const NotificationTypeSchema = z.enum([
  "cost_spike",
  "usage_drop",
  "value_expiring",
  "lifecycle_change",
  "retirement_candidate",
  "capital_freed",
  "pricing_activated",
  "ai_project_flagged",
]);

export const AIProjectRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const CandidateTypeSchema = z.enum([
  "semantic_product",
  "dbt_product",
  "usage_bundle",
  "certified_asset",
]);

export const CandidateStatusTypeSchema = z.enum([
  "new",
  "under_review",
  "promoted",
  "ignored",
]);

export const CapitalEventTypeSchema = z.enum([
  "retirement_freed",
  "cost_optimization",
  "reallocation",
  "pricing_revenue",
  "ai_spend_reduced",
]);

// ============================================================
// Sub-Object Schemas
// ============================================================

export const OwnerSchema = z
  .object({
    id: entityId,
    name: z.string(),
    title: z.string(),
    team: z.string(),
    avatar: z.string().optional(),
  })
  .passthrough();

export const CostBreakdownSchema = z
  .object({
    compute: z.number(),
    storage: z.number(),
    pipeline: z.number(),
    humanEstimate: z.number(),
  })
  .passthrough();

export const ConsumerTeamSchema = z
  .object({
    name: z.string(),
    consumers: z.number(),
    percentage: z.number(),
  })
  .passthrough();

export const ValueDeclarationSchema = z
  .object({
    declaredBy: z.string(),
    declaredByTitle: z.string(),
    method: ValueMethodSchema,
    value: z.number(),
    basis: z.string(),
    status: z.array(z.enum(["peer_reviewed", "cfo_acknowledged"])),
    declaredAt: dateString,
    nextReview: dateString,
    isExpiring: z.boolean(),
  })
  .passthrough();

export const InferredValueSummarySchema = z
  .object({
    annualBand: z.object({ low: z.number(), mid: z.number(), high: z.number() }),
    monthlyMid: z.number(),
    confidence: z.number(),
    blendedMonthly: z.number(),
  })
  .passthrough();

// ============================================================
// Data Product
// ============================================================

export const DataProductSchema = z
  .object({
    id: entityId,
    name: z.string(),
    domain: z.string(),
    businessUnit: z.string(),
    owner: OwnerSchema,
    platform: PlatformSchema,
    lifecycleStage: LifecycleStageSchema,
    createdAt: dateString,
    updatedAt: dateString,

    // Economics
    monthlyCost: z.number(),
    costBreakdown: CostBreakdownSchema,
    declaredValue: z.number().nullable(),
    usageImpliedValue: z.number(),
    compositeValue: z.number(),
    roi: z.number().nullable(),
    roiBand: ROIBandSchema.nullable(),
    costTrend: z.number(),
    costCoverage: z.number(),

    // Usage
    monthlyConsumers: z.number(),
    totalQueries: z.number(),
    consumerTeams: z.array(ConsumerTeamSchema),
    usageTrend: z.number(),
    peakConsumers: z.number(),

    // Quality
    freshnessHours: z.number(),
    freshnessSLA: z.number(),
    completeness: z.number(),
    accuracy: z.number(),
    trustScore: z.number(),

    // Marketplace
    isPublished: z.boolean(),
    isCertified: z.boolean(),
    subscriptionCount: z.number(),
    isSubscribed: z.boolean().optional(),

    // Value
    valueDeclaration: ValueDeclarationSchema.nullable(),
    inferredValue: InferredValueSummarySchema.nullable(),
    valueSource: z.enum(["declared", "inferred", "blended"]),

    // Dependencies
    downstreamProducts: z.number(),
    downstreamModels: z.number(),
    downstreamDashboards: z.number(),

    // Flags
    isRetirementCandidate: z.boolean(),
    hasCostSpike: z.boolean(),
    hasUsageDecline: z.boolean(),
  })
  .passthrough();

// ============================================================
// Trend & History Points
// ============================================================

export const CostTrendPointSchema = z
  .object({
    month: z.string(),
    cost: z.number(),
    value: z.number(),
  })
  .passthrough();

export const UsageTrendPointSchema = z
  .object({
    month: z.string(),
    consumers: z.number(),
    queries: z.number(),
  })
  .passthrough();

export const ROIHistoryPointSchema = z
  .object({
    month: z.string(),
    roi: z.number().nullable(),
    cost: z.number(),
    compositeValue: z.number(),
  })
  .passthrough();

export const LifecycleTransitionSchema = z
  .object({
    from: LifecycleStageSchema,
    to: LifecycleStageSchema,
    count: z.number(),
  })
  .passthrough();

// ============================================================
// Portfolio
// ============================================================

export const PortfolioSummarySchema = z
  .object({
    totalProducts: z.number(),
    totalCost: z.number(),
    averageROI: z.number(),
    roiTrend: z.number(),
    totalConsumers: z.number(),
    consumersTrend: z.number(),
    activeSubscriptions: z.number(),
    retirementCandidates: z.number(),
    estimatedSavings: z.number(),
    costCoverage: z.number(),
    productsWithValue: z.number(),
    newProductsThisQuarter: z.number(),
  })
  .passthrough();

// ============================================================
// Executive Summary
// ============================================================

export const ExecutiveInsightSchema = z
  .object({
    id: entityId,
    type: z.enum(["insight", "risk", "opportunity"]),
    title: z.string(),
    description: z.string(),
    productIds: z.array(z.string()),
    financialImpact: z.number().nullable(),
  })
  .passthrough();

export const DoNothingProjectionSchema = z
  .object({
    currentMonthlyCost: z.number(),
    projectedMonthlyCost: z.number(),
    currentROI: z.number(),
    projectedROI: z.number(),
    projectedWastedSpend: z.number(),
    projectedValueAtRisk: z.number(),
    months: z.number(),
    assumptions: z.array(z.string()),
  })
  .passthrough();

export const ExecutiveSummarySchema = z
  .object({
    generatedAt: dateString,
    confidenceLevel: z.number(),
    confidenceBasis: z.string(),
    insights: z.array(ExecutiveInsightSchema),
    doNothingProjection: DoNothingProjectionSchema,
  })
  .passthrough();

// ============================================================
// Decisions
// ============================================================

export const DecisionSchema = z
  .object({
    id: entityId,
    type: DecisionTypeSchema,
    status: DecisionStatusSchema,
    productId: entityId,
    productName: z.string(),
    title: z.string(),
    description: z.string(),
    initiatedBy: z.string(),
    assignedTo: z.string(),
    assignedToTitle: z.string(),
    estimatedImpact: z.number(),
    actualImpact: z.number().nullable(),
    impactBasis: z.string(),
    createdAt: dateString,
    updatedAt: dateString,
    resolvedAt: dateString.nullable(),
    resolution: z.string().nullable(),
    capitalFreed: z.number(),
    projectedSavingsMonthly: z.number(),
    projectedSavingsAnnual: z.number(),
    delayReason: z.string().nullable(),
    delayedUntil: dateString.nullable(),
    impactValidationStatus: z
      .enum(["pending", "validating", "confirmed", "underperforming"])
      .optional(),
  })
  .passthrough();

export const DecisionCommentSchema = z
  .object({
    id: entityId,
    decisionId: entityId,
    userId: entityId,
    userName: z.string(),
    comment: z.string(),
    createdAt: dateString,
  })
  .passthrough();

export const DecisionActionSchema = z
  .object({
    id: entityId,
    decisionId: entityId,
    userId: entityId,
    actionType: z.enum([
      "created",
      "approved",
      "rejected",
      "delayed",
      "commented",
    ]),
    payload: z.string().nullable(),
    createdAt: dateString,
  })
  .passthrough();

export const DecisionEconomicEffectSchema = z
  .object({
    id: entityId,
    decisionId: entityId,
    effectType: z.enum(["capital_freed", "cost_saved", "revenue_gained"]),
    amountUsdMonthly: z.number(),
    amountUsdAnnual: z.number(),
    confidence: z.number(),
    calcExplainer: z.string().nullable(),
    createdAt: dateString,
  })
  .passthrough();

// ============================================================
// Impact Report
// ============================================================

export const ImpactReportSchema = z
  .object({
    decisionId: entityId,
    productName: z.string(),
    projectedSavingsMonthly: z.number(),
    actualSavingsMeasured: z.number(),
    varianceFromProjection: z.number(),
    confidenceScore: z.number(),
    validationStatus: z.string(),
    windowComplete: z.boolean(),
    costTrend: z.array(
      z.object({ month: z.string(), cost: z.number() }).passthrough(),
    ),
    narrativeSummary: z.string(),
  })
  .passthrough();

// ============================================================
// Connectors
// ============================================================

export const ConnectorSchema = z
  .object({
    id: entityId,
    platform: PlatformSchema,
    name: z.string(),
    status: ConnectorStatusSchema,
    lastSync: dateString.nullable(),
    productsFound: z.number(),
    costCoverage: z.number(),
    usageCoverage: z.number(),
  })
  .passthrough();

// ============================================================
// Notifications
// ============================================================

export const NotificationSchema = z
  .object({
    id: entityId,
    type: NotificationTypeSchema,
    title: z.string(),
    description: z.string(),
    productId: z.string().optional(),
    productName: z.string().optional(),
    timestamp: dateString,
    isRead: z.boolean(),
  })
  .passthrough();

// ============================================================
// Benchmarks
// ============================================================

export const BenchmarkDataPointSchema = z
  .object({
    industry: z.enum(["retail", "finance", "saas", "healthcare"]),
    label: z.string(),
    medianROI: z.number(),
    medianCostPerConsumer: z.number(),
    medianPortfolioROI: z.number(),
    p25ROI: z.number(),
    p75ROI: z.number(),
    sampleSize: z.number(),
  })
  .passthrough();

// ============================================================
// Capital Impact
// ============================================================

export const CapitalFreedMonthSchema = z
  .object({
    month: z.string(),
    amount: z.number(),
    cumulative: z.number(),
  })
  .passthrough();

export const CapitalByTypeSchema = z
  .object({
    type: CapitalEventTypeSchema,
    amount: z.number(),
  })
  .passthrough();

export const CapitalEventSchema = z
  .object({
    id: entityId,
    decisionId: entityId,
    productId: z.string().nullable(),
    eventType: CapitalEventTypeSchema,
    amount: z.number(),
    description: z.string(),
    effectiveDate: dateString,
    createdAt: dateString,
  })
  .passthrough();

export const SavingsSummarySchema = z
  .object({
    totalCapitalFreedMonthly: z.number(),
    totalCapitalFreedAnnual: z.number(),
    capitalFreedByMonth: z.array(CapitalFreedMonthSchema),
    pendingRetirements: z.number(),
    pendingEstimatedSavings: z.number(),
    approvedRetirements: z.number(),
    decisionsThisQuarter: z.number(),
  })
  .passthrough();

export const CapitalImpactSummarySchema = z
  .object({
    totalCapitalFreed: z.number(),
    totalCapitalFreedAnnual: z.number(),
    budgetReallocated: z.number(),
    aiSpendReduced: z.number(),
    portfolioRoiDelta: z.number(),
    portfolioRoiCurrent: z.number(),
    portfolioRoiPrevious: z.number(),
    decisionsExecuted: z.number(),
    decisionsUnderReview: z.number(),
    activePricingPolicies: z.number(),
    pricingRevenueTotal: z.number(),
    capitalFreedByMonth: z.array(CapitalFreedMonthSchema),
    capitalByType: z.array(CapitalByTypeSchema),
    recentEvents: z.array(CapitalEventSchema),
  })
  .passthrough();

// ============================================================
// Pricing Policies
// ============================================================

export const PricingPolicySchema = z
  .object({
    id: entityId,
    productId: entityId,
    productName: z.string(),
    version: z.number(),
    model: PricingModelSchema,
    params: z.string(),
    status: PricingPolicyStatusSchema,
    activatedAt: dateString.nullable(),
    activatedBy: z.string().nullable(),
    projectedRevenue: z.number(),
    actualRevenue: z.number().nullable(),
    preActivationUsage: z.number(),
    postActivationUsage: z.number().nullable(),
  })
  .passthrough();

// ============================================================
// AI Scorecards
// ============================================================

export const AIProjectScorecardSchema = z
  .object({
    id: entityId,
    productId: entityId,
    productName: z.string(),
    costScore: z.number(),
    valueScore: z.number(),
    confidenceScore: z.number(),
    roiScore: z.number(),
    dependencyRiskScore: z.number(),
    compositeScore: z.number(),
    riskLevel: AIProjectRiskLevelSchema,
    monthlyCost: z.number(),
    monthlyValue: z.number(),
    roi: z.number().nullable(),
    flaggedForReview: z.boolean(),
    decisionId: z.string().nullable(),
    reviewedAt: dateString.nullable(),
  })
  .passthrough();

// ============================================================
// Candidates
// ============================================================

export const CandidateSourceAssetSchema = z
  .object({
    id: entityId,
    externalId: z.string(),
    assetName: z.string(),
    assetType: z.string().nullable(),
    platform: z.string().nullable(),
    qualifiedName: z.string().nullable(),
    displayName: z.string().nullable(),
    ownerHint: z.string().nullable(),
    tags: z.array(z.string()),
    role: z.string().nullable(),
    inclusionReason: z.string().nullable(),
  })
  .passthrough();

export const CandidateListItemSchema = z
  .object({
    id: entityId,
    candidateType: CandidateTypeSchema,
    nameSuggested: z.string(),
    domainSuggested: z.string().nullable(),
    ownerSuggested: z.string().nullable(),
    confidenceScore: z.number(),
    status: CandidateStatusTypeSchema,
    monthlyCostEstimate: z.number(),
    monthlyConsumers: z.number(),
    sourceCount: z.number(),
    createdAt: dateString,
  })
  .passthrough();

export const CandidateDetailSchema = CandidateListItemSchema.extend({
  confidenceBreakdown: z.record(z.string(), z.number()),
  evidence: z.record(z.string(), z.unknown()),
  consumerTeams: z.array(
    z.object({ team: z.string(), consumers: z.number() }).passthrough(),
  ),
  costCoveragePct: z.number(),
  members: z.array(CandidateSourceAssetSchema),
  promotedProductId: z.string().nullable(),
  ignoredReason: z.string().nullable(),
  updatedAt: dateString,
}).passthrough();

// ============================================================
// Organization Info
// ============================================================

export const OrgInfoSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    industry: z.string().nullable(),
    teamCount: z.number(),
    userCount: z.number(),
    roleCount: z.number(),
    valueWeights: z.string(),
  })
  .passthrough();

// ============================================================
// Display Configuration
// ============================================================

export const DisplayConfigSchema = z
  .object({
    roiBands: z
      .object({ high: z.number(), healthy: z.number() })
      .passthrough(),
    trustScoreBands: z
      .object({ high: z.number(), medium: z.number() })
      .passthrough(),
    confidenceScoreBands: z
      .object({ green: z.number(), blue: z.number(), amber: z.number() })
      .passthrough(),
    aiRiskScoreBands: z
      .object({ low: z.number(), medium: z.number(), high: z.number() })
      .passthrough(),
    pricingSimulationDefaults: z
      .object({
        markup: z.number(),
        baseFee: z.number(),
        perQuery: z.number(),
        freeTier: z.number(),
        adoptionSlider: z.number(),
      })
      .passthrough(),
    teamBudgetThreshold: z
      .object({ amount: z.number() })
      .passthrough(),
  })
  .passthrough();

// ============================================================
// Capital Efficiency Index (CEI)
// ============================================================

export const CEIComponentSchema = z
  .object({
    score: z.number(),
    max: z.number(),
    detail: z.string(),
  })
  .passthrough();

export const CEIResponseSchema = z
  .object({
    score: z.number(),
    components: z.record(z.string(), CEIComponentSchema),
    trend: z.array(
      z
        .object({
          month: z.string(),
          average_roi: z.number(),
          capital_freed_cumulative: z.number(),
        })
        .passthrough(),
    ),
    benchmark_comparison: z.array(
      z
        .object({
          industry: z.string(),
          label: z.string(),
          median_portfolio_roi: z.number(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

// ============================================================
// Capital Behavior
// ============================================================

export const CapitalBehaviorSchema = z
  .object({
    avgDecisionVelocityDays: z.number(),
    valueDeclarationCoveragePct: z.number(),
    reviewOverduePct: z.number(),
    enforcementTriggerRate: z.number(),
    impactConfirmationRate: z.number(),
    governanceHealthScore: z.number(),
  })
  .passthrough();

// ============================================================
// Portfolio Rebalance
// ============================================================

export const RebalanceProductSchema = z
  .object({
    id: entityId,
    name: z.string(),
    monthlyCost: z.number(),
    trailingRoi: z.number(),
  })
  .passthrough();

export const QuartileDataSchema = z
  .object({
    products: z.array(RebalanceProductSchema),
    totalCost: z.number(),
    totalValue: z.number(),
    blendedRoi: z.number(),
    count: z.number(),
  })
  .passthrough();

export const PortfolioRebalanceSchema = z
  .object({
    currentBlendedRoi: z.number(),
    projectedBlendedRoi: z.number(),
    efficiencyDelta: z.number(),
    rebalancePct: z.number(),
    movableAmountMonthly: z.number(),
    totalProducts: z.number(),
    totalMonthlyCost: z.number(),
    totalMonthlyValue: z.number(),
    capitalConcentrationIndex: z.number(),
    bottomQuartile: QuartileDataSchema,
    topQuartile: QuartileDataSchema,
    recommendedDivest: z.array(RebalanceProductSchema),
    recommendedInvest: z.array(RebalanceProductSchema),
  })
  .passthrough();

// ============================================================
// Board Capital Summary
// ============================================================

export const CapitalActionSummarySchema = z
  .object({
    decisionId: entityId,
    productName: z.string(),
    decisionType: z.string(),
    capitalFreed: z.number(),
    status: z.string(),
    resolvedAt: dateString.nullable(),
  })
  .passthrough();

export const BoardCapitalSummarySchema = z
  .object({
    totalCapitalFreed: z.number(),
    totalCapitalFreedAnnual: z.number(),
    confirmedSavings: z.number(),
    projectedSavings: z.number(),
    underperformingDecisions: z.number(),
    portfolioRoiCurrent: z.number(),
    portfolioRoiDelta: z.number(),
    capitalEfficiencyScore: z.number(),
    topCapitalActions: z.array(CapitalActionSummarySchema),
  })
  .passthrough();

// ============================================================
// Capital Projection
// ============================================================

export const ProjectionMonthSchema = z
  .object({
    month: z.number(),
    projectedCost: z.number(),
    projectedValue: z.number(),
    projectedRoi: z.number(),
    projectedCei: z.number(),
    capitalLiability: z.number(),
    aiSpend: z.number(),
    retirementBacklog: z.number(),
    governanceScore: z.number(),
    capitalFreedCumulative: z.number(),
    missedCapitalFreed: z.number(),
  })
  .passthrough();

export const ProjectionScenarioSchema = z
  .object({
    label: z.string(),
    months: z.array(ProjectionMonthSchema),
  })
  .passthrough();

export const DriftDeltaSchema = z
  .object({
    roiDrift12m: z.number(),
    roiDrift24m: z.number(),
    roiDrift36m: z.number(),
    costDrift12m: z.number(),
    liability12m: z.number(),
    liability24m: z.number(),
    liability36m: z.number(),
  })
  .passthrough();

export const LiabilityEstimateSchema = z
  .object({
    totalPassiveLiability36m: z.number(),
    totalGovernanceGap36m: z.number(),
    capitalFreedActive36m: z.number(),
    aiExposurePassive36m: z.number(),
  })
  .passthrough();

export const CurrentSnapshotSchema = z
  .object({
    totalCost: z.number(),
    totalValue: z.number(),
    averageRoi: z.number(),
    aiSpend: z.number(),
    declineCost: z.number(),
    decisionVelocityDays: z.number(),
    valueCoveragePct: z.number(),
    enforcementRate: z.number(),
    retirementBacklog: z.number(),
    ceiScore: z.number(),
  })
  .passthrough();

export const CapitalProjectionResponseSchema = z
  .object({
    scenarios: z
      .object({
        passive: ProjectionScenarioSchema,
        governance: ProjectionScenarioSchema,
        active: ProjectionScenarioSchema,
      })
      .passthrough(),
    driftDelta: DriftDeltaSchema,
    liabilityEstimate: LiabilityEstimateSchema,
    currentSnapshot: CurrentSnapshotSchema,
  })
  .passthrough();

// ============================================================
// Auth
// ============================================================

export const RoleMetaSchema = z
  .object({
    roleId: z.string(),
    displayName: z.string(),
    description: z.string(),
    defaultFocusRoute: z.string(),
    navPriority: z.array(z.string()),
    permissions: z.array(z.string()),
  })
  .passthrough();

export const AuthUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    title: z.string().nullable(),
    role: z.string(),
    orgId: z.string().nullable(),
    roleMeta: RoleMetaSchema.nullable(),
  })
  .passthrough();

export const AuthResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    user: AuthUserSchema,
  })
  .passthrough();

export const DemoPersonaSchema = z
  .object({
    roleId: z.string(),
    displayName: z.string(),
    description: z.string(),
    defaultFocusRoute: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  })
  .passthrough();

// ============================================================
// Paginated List Response Wrapper
// ============================================================

/**
 * Creates a schema for paginated list responses.
 *
 * Usage:
 *   const ProductListSchema = listSchema(DataProductSchema);
 */
export function listSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      items: z.array(itemSchema),
      total: z.number().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    })
    .passthrough();
}

/** Typed alias for the data-products list endpoint */
export const DataProductListSchema = listSchema(DataProductSchema);

// ============================================================
// Asset Metrics (combined endpoint)
// ============================================================

export const AssetMetricsSchema = z
  .object({
    costTrend: z.array(CostTrendPointSchema),
    usageTrend: z.array(UsageTrendPointSchema),
    roiHistory: z.array(ROIHistoryPointSchema),
  })
  .passthrough();

// ============================================================
// Pricing Simulation
// ============================================================

export const TeamImpactSchema = z
  .object({
    team: z.string(),
    usage: z.number(),
    charge: z.number(),
    budgetStatus: z.enum(["within", "over", "under"]),
    overBy: z.number().optional(),
  })
  .passthrough();

export const ScenarioResultSchema = z
  .object({
    totalRevenue: z.number(),
    totalCost: z.number(),
    netPosition: z.number(),
    teamImpacts: z.array(TeamImpactSchema),
    behavioralPrediction: z.string(),
  })
  .passthrough();

// ============================================================
// Ingest Result
// ============================================================

export const IngestResultSchema = z
  .object({
    assetsDiscovered: z.number(),
    edgesCreated: z.number(),
    usageEvents: z.number(),
    costEvents: z.number(),
    candidatesGenerated: z.number(),
    message: z.string(),
  })
  .passthrough();

// ============================================================
// Validation Helper
// ============================================================

/**
 * Validates an API response against a Zod schema.
 *
 * - In **development**, logs a console warning with details about
 *   mismatched fields so engineers notice contract drift immediately.
 * - In **production**, returns the data as-is to avoid breaking the
 *   app -- the TypeScript types are still enforced at build time.
 *
 * @param schema  - The Zod schema to validate against
 * @param data    - The raw response data from the API
 * @param endpoint - The API path (for logging context)
 * @returns The validated (or raw) data, typed as T
 */
export function validateResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  endpoint: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[API Schema] Validation warning for ${endpoint}:`,
        result.error.issues,
      );
    }
    // Return data as-is in production to avoid breaking the app
    return data as T;
  }
  return result.data;
}
