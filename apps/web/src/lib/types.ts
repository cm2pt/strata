// ============================================================
// Strata — Core Types
// Data Capital Management
// ============================================================

export type LifecycleStage = "draft" | "active" | "growth" | "mature" | "decline" | "retired";
export type Platform = "snowflake" | "databricks" | "s3" | "power_bi" | "bigquery";
export type ROIBand = "high" | "healthy" | "underperforming" | "critical";
export type ValueMethod = "revenue_attribution" | "cost_avoidance" | "efficiency_gain" | "compliance" | "strategic";
export type UserRole =
  | "cfo"
  | "executive_sponsor"
  | "fpa_analyst"
  | "cdo"
  | "product_owner"
  | "governance_steward"
  | "platform_admin"
  | "data_engineer"
  | "dataops_sre"
  | "head_of_ai"
  | "data_scientist"
  | "consumer"
  | "external_auditor"
  | "admin"
  | "integration_service";

// --- Auth / RBAC ---
export interface RoleMeta {
  roleId: string;
  displayName: string;
  description: string;
  defaultFocusRoute: string;
  navPriority: string[];
  permissions: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  title: string | null;
  role: UserRole;
  orgId: string | null;
  roleMeta: RoleMeta | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface DemoPersona {
  roleId: string;
  displayName: string;
  description: string;
  defaultFocusRoute: string;
  email: string | null;
  name: string | null;
}
export type PricingModel = "cost_plus" | "usage_based" | "tiered" | "flat" | "value_share";

// --- Decision Workflow Types ---
export type DecisionType = "retirement" | "cost_investigation" | "value_revalidation" | "low_roi_review" | "capital_reallocation" | "pricing_activation" | "ai_project_review" | "portfolio_change";
export type DecisionStatus = "under_review" | "approved" | "rejected" | "delayed";

// --- Benchmarking Types ---
export type BenchmarkIndustry = "retail" | "finance" | "saas" | "healthcare";

export interface DataProduct {
  id: string;
  name: string;
  domain: string;
  businessUnit: string;
  owner: Owner;
  platform: Platform;
  lifecycleStage: LifecycleStage;
  createdAt: string;
  updatedAt: string;

  // Economics
  monthlyCost: number;
  costBreakdown: CostBreakdown;
  declaredValue: number | null;
  usageImpliedValue: number;
  compositeValue: number;
  roi: number | null;
  roiBand: ROIBand | null;
  costTrend: number; // % change MoM
  costCoverage: number; // 0-1

  // Usage
  monthlyConsumers: number;
  totalQueries: number;
  consumerTeams: ConsumerTeam[];
  usageTrend: number; // % change MoM
  peakConsumers: number;

  // Quality
  freshnessHours: number;
  freshnessSLA: number;
  completeness: number;
  accuracy: number;
  trustScore: number;

  // Marketplace
  isPublished: boolean;
  isCertified: boolean;
  subscriptionCount: number;
  isSubscribed?: boolean;

  // Value
  valueDeclaration: ValueDeclaration | null;
  /** Engine-inferred value (computed at init from CIE Value Inference Engine) */
  inferredValue: InferredValueSummary | null;
  /** Which source drives the effective value shown on dashboards */
  valueSource: "declared" | "inferred" | "blended";

  // Dependencies
  downstreamProducts: number;
  downstreamModels: number;
  downstreamDashboards: number;

  // Flags
  isRetirementCandidate: boolean;
  hasCostSpike: boolean;
  hasUsageDecline: boolean;
}

export interface Owner {
  id: string;
  name: string;
  title: string;
  team: string;
  avatar?: string;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  pipeline: number;
  humanEstimate: number;
}

export interface ConsumerTeam {
  name: string;
  consumers: number;
  percentage: number;
}

export interface InferredValueSummary {
  /** Annual value band from CIE Value Inference Engine */
  annualBand: { low: number; mid: number; high: number };
  /** Monthly mid-point */
  monthlyMid: number;
  /** Confidence in the inference (0-1) */
  confidence: number;
  /** Blended monthly value (inference weighted by confidence + declared if present) */
  blendedMonthly: number;
}

export interface ValueDeclaration {
  declaredBy: string;
  declaredByTitle: string;
  method: ValueMethod;
  value: number;
  basis: string;
  status: ("peer_reviewed" | "cfo_acknowledged")[];
  declaredAt: string;
  nextReview: string;
  isExpiring: boolean;
}

export interface CostTrendPoint {
  month: string;
  cost: number;
  value: number;
}

export interface UsageTrendPoint {
  month: string;
  consumers: number;
  queries: number;
}

export interface LifecycleTransition {
  from: LifecycleStage;
  to: LifecycleStage;
  count: number;
}

export interface PricingScenario {
  id: string;
  name: string;
  model: PricingModel;
  params: Record<string, number>;
  results: ScenarioResult | null;
}

export interface ScenarioResult {
  totalRevenue: number;
  totalCost: number;
  netPosition: number;
  teamImpacts: TeamImpact[];
  behavioralPrediction: string;
}

export interface TeamImpact {
  team: string;
  usage: number;
  charge: number;
  budgetStatus: "within" | "over" | "under";
  overBy?: number;
}

export interface Notification {
  id: string;
  type: "cost_spike" | "usage_drop" | "value_expiring" | "lifecycle_change" | "retirement_candidate" | "capital_freed" | "pricing_activated" | "ai_project_flagged";
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  timestamp: string;
  isRead: boolean;
}

export interface PortfolioSummary {
  totalProducts: number;
  totalCost: number;
  averageROI: number;
  roiTrend: number;
  totalConsumers: number;
  consumersTrend: number;
  activeSubscriptions: number;
  retirementCandidates: number;
  estimatedSavings: number;
  costCoverage: number;
  productsWithValue: number;
  newProductsThisQuarter: number;
}

export interface Connector {
  id: string;
  platform: Platform;
  name: string;
  status: "connected" | "syncing" | "error" | "disconnected";
  lastSync: string | null;
  productsFound: number;
  costCoverage: number;
  usageCoverage: number;
}

// ============================================================
// Decision Workflow System
// ============================================================

export interface Decision {
  id: string;
  type: DecisionType;
  status: DecisionStatus;
  productId: string;
  productName: string;
  title: string;
  description: string;
  /** Who initiated the review */
  initiatedBy: string;
  /** Who owns the decision outcome */
  assignedTo: string;
  assignedToTitle: string;
  /** Financial impact fields */
  estimatedImpact: number;
  /** Positive = savings/gains, negative = increased cost */
  actualImpact: number | null;
  impactBasis: string;
  /** Lifecycle timestamps */
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** Optional notes from reviewer */
  resolution: string | null;
  /** Capital impact fields */
  capitalFreed: number;
  projectedSavingsMonthly: number;
  projectedSavingsAnnual: number;
  delayReason: string | null;
  delayedUntil: string | null;
  /** Impact verification */
  impactValidationStatus?: "pending" | "validating" | "confirmed" | "underperforming";
}

// ============================================================
// Capital Impact Types
// ============================================================

export type CapitalEventType = "retirement_freed" | "cost_optimization" | "reallocation" | "pricing_revenue" | "ai_spend_reduced";

export interface CapitalEvent {
  id: string;
  decisionId: string;
  productId: string | null;
  eventType: CapitalEventType;
  amount: number;
  description: string;
  effectiveDate: string;
  createdAt: string;
}

export interface CapitalFreedMonth {
  month: string;
  amount: number;
  cumulative: number;
}

export interface CapitalByType {
  type: CapitalEventType;
  amount: number;
}

export interface SavingsSummary {
  totalCapitalFreedMonthly: number;
  totalCapitalFreedAnnual: number;
  capitalFreedByMonth: CapitalFreedMonth[];
  pendingRetirements: number;
  pendingEstimatedSavings: number;
  approvedRetirements: number;
  decisionsThisQuarter: number;
}

export interface CapitalImpactSummary {
  totalCapitalFreed: number;
  totalCapitalFreedAnnual: number;
  budgetReallocated: number;
  aiSpendReduced: number;
  portfolioRoiDelta: number;
  portfolioRoiCurrent: number;
  portfolioRoiPrevious: number;
  decisionsExecuted: number;
  decisionsUnderReview: number;
  activePricingPolicies: number;
  pricingRevenueTotal: number;
  capitalFreedByMonth: CapitalFreedMonth[];
  capitalByType: CapitalByType[];
  recentEvents: CapitalEvent[];
}

export type PricingPolicyStatus = "draft" | "active" | "retired";

export interface PricingPolicy {
  id: string;
  productId: string;
  productName: string;
  version: number;
  model: PricingModel;
  params: string;
  status: PricingPolicyStatus;
  activatedAt: string | null;
  activatedBy: string | null;
  projectedRevenue: number;
  actualRevenue: number | null;
  preActivationUsage: number;
  postActivationUsage: number | null;
}

export type AIProjectRiskLevel = "low" | "medium" | "high" | "critical";

export interface AIProjectScorecard {
  id: string;
  productId: string;
  productName: string;
  costScore: number;
  valueScore: number;
  confidenceScore: number;
  roiScore: number;
  dependencyRiskScore: number;
  compositeScore: number;
  riskLevel: AIProjectRiskLevel;
  monthlyCost: number;
  monthlyValue: number;
  roi: number | null;
  flaggedForReview: boolean;
  decisionId: string | null;
  reviewedAt: string | null;
}

// ============================================================
// ROI History — Never overwrite, always append
// ============================================================

export interface ROIHistoryPoint {
  month: string;
  roi: number | null;
  cost: number;
  compositeValue: number;
}

// ============================================================
// Value Declaration Versioning
// ============================================================

export interface ValueDeclarationVersion {
  version: number;
  declaredBy: string;
  declaredByTitle: string;
  method: ValueMethod;
  value: number;
  basis: string;
  declaredAt: string;
  /** What changed from previous version */
  changeNote: string | null;
}

// ============================================================
// Executive Intelligence
// ============================================================

export interface ExecutiveInsight {
  id: string;
  type: "insight" | "risk" | "opportunity";
  title: string;
  description: string;
  /** Which products does this relate to? */
  productIds: string[];
  /** Dollar impact (positive or negative) */
  financialImpact: number | null;
}

export interface ExecutiveSummary {
  generatedAt: string;
  confidenceLevel: number; // 0-1 based on cost + value coverage
  confidenceBasis: string;
  insights: ExecutiveInsight[];
  doNothingProjection: DoNothingProjection;
}

export interface DoNothingProjection {
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  currentROI: number;
  projectedROI: number;
  projectedWastedSpend: number;
  projectedValueAtRisk: number;
  months: number;
  assumptions: string[];
}

// ============================================================
// Capital Allocation
// ============================================================

export interface AllocationSlice {
  name: string;
  cost: number;
  value: number;
  roi: number | null;
  productCount: number;
}

export interface ReallocationScenario {
  fromQuartile: string;
  toQuartile: string;
  amountMoved: number;
  currentPortfolioROI: number;
  projectedPortfolioROI: number;
  roiDelta: number;
}

// ============================================================
// Benchmarking
// ============================================================

export interface BenchmarkDataPoint {
  industry: BenchmarkIndustry;
  label: string;
  medianROI: number;
  medianCostPerConsumer: number;
  medianPortfolioROI: number;
  /** Percentile ranges for context */
  p25ROI: number;
  p75ROI: number;
  sampleSize: number;
}

// ============================================================
// Policy Configuration — Switching cost anchor
// ============================================================

export interface PolicyConfig {
  id: string;
  name: string;
  description: string;
  category: "valuation" | "lifecycle" | "cost" | "governance" | "pricing";
  currentValue: string;
  defaultValue: string;
  updatedAt: string;
  updatedBy: string;
}

// --- Organization Info ---

export interface OrgInfo {
  name: string;
  slug: string;
  industry: string | null;
  teamCount: number;
  userCount: number;
  roleCount: number;
  valueWeights: string;
}

// --- Discovery / Candidates ---

export type CandidateType = "semantic_product" | "dbt_product" | "usage_bundle" | "certified_asset";
export type CandidateStatusType = "new" | "under_review" | "promoted" | "ignored";

export interface CandidateSourceAsset {
  id: string;
  externalId: string;
  assetName: string;
  assetType: string | null;
  platform: string | null;
  qualifiedName: string | null;
  displayName: string | null;
  ownerHint: string | null;
  tags: string[];
  role: string | null;
  inclusionReason: string | null;
}

export interface CandidateListItem {
  id: string;
  candidateType: CandidateType;
  nameSuggested: string;
  domainSuggested: string | null;
  ownerSuggested: string | null;
  confidenceScore: number;
  status: CandidateStatusType;
  monthlyCostEstimate: number;
  monthlyConsumers: number;
  sourceCount: number;
  createdAt: string;
}

export interface CandidateDetail extends CandidateListItem {
  confidenceBreakdown: Record<string, number>;
  evidence: Record<string, unknown>;
  consumerTeams: { team: string; consumers: number }[];
  costCoveragePct: number;
  members: CandidateSourceAsset[];
  promotedProductId: string | null;
  ignoredReason: string | null;
  updatedAt: string;
}

export interface IngestResult {
  assetsDiscovered: number;
  edgesCreated: number;
  usageEvents: number;
  costEvents: number;
  candidatesGenerated: number;
  message: string;
}

// ============================================================
// Display Configuration — Centralized UI thresholds
// ============================================================

export interface ROIBandsConfig {
  high: number;
  healthy: number;
}

export interface TrustScoreBandsConfig {
  high: number;
  medium: number;
}

export interface ConfidenceScoreBandsConfig {
  green: number;
  blue: number;
  amber: number;
}

export interface AIRiskScoreBandsConfig {
  low: number;
  medium: number;
  high: number;
}

export interface PricingSimulationDefaultsConfig {
  markup: number;
  baseFee: number;
  perQuery: number;
  freeTier: number;
  adoptionSlider: number;
}

export interface TeamBudgetThresholdConfig {
  amount: number;
}

export interface DisplayConfig {
  roiBands: ROIBandsConfig;
  trustScoreBands: TrustScoreBandsConfig;
  confidenceScoreBands: ConfidenceScoreBandsConfig;
  aiRiskScoreBands: AIRiskScoreBandsConfig;
  pricingSimulationDefaults: PricingSimulationDefaultsConfig;
  teamBudgetThreshold: TeamBudgetThresholdConfig;
}

// ============================================================
// Capital Efficiency Index (Enhanced)
// ============================================================

export interface CEIComponent {
  score: number;
  max: number;
  detail: string;
}

export interface CEIResponse {
  score: number;
  components: Record<string, CEIComponent>;
  trend: { month: string; average_roi: number; capital_freed_cumulative: number }[];
  benchmark_comparison: { industry: string; label: string; median_portfolio_roi: number }[];
}

// ============================================================
// Capital Behavior Metrics
// ============================================================

export interface CapitalBehavior {
  avgDecisionVelocityDays: number;
  valueDeclarationCoveragePct: number;
  reviewOverduePct: number;
  enforcementTriggerRate: number;
  impactConfirmationRate: number;
  governanceHealthScore: number;
}

// ============================================================
// Connector Depth & Transparency
// ============================================================

export type SyncStatus = "success" | "partial" | "failed";
export type AutomationLevel = "fully_automated" | "semi_automated" | "manual";

export interface SyncLogEntry {
  id: string;
  connectorId: string;
  syncStartedAt: string;
  syncEndedAt: string | null;
  status: SyncStatus;
  objectsDiscovered: number;
  objectsUpdated: number;
  objectsDeleted: number;
  usageEventsFetched: number;
  costEventsFetched: number;
  durationSeconds: number;
  errors: Record<string, unknown>[] | null;
  diffSummary: { added: string[]; removed: string[]; changed: string[] } | null;
}

export interface SyncLogList {
  items: SyncLogEntry[];
  total: number;
}

export interface ExtractionCapability {
  capabilityCategory: string;
  capabilityName: string;
  isAvailable: boolean;
  requiresElevatedAccess: boolean;
  extractionMethod: string;
  refreshFrequency: string;
}

export interface ExtractionMatrixResponse {
  connectorId: string;
  connectorName: string;
  platform: string;
  capabilities: ExtractionCapability[];
}

export interface ConnectorDepthSummary {
  connectorId: string;
  connectorName: string;
  platform: string;
  totalCapabilities: number;
  availableCapabilities: number;
  coveragePct: number;
  lastSyncAt: string | null;
  syncStatus: string;
  objectsManaged: number;
  automationCoverage: number;
}

export interface ConnectorDepthOverview {
  connectors: ConnectorDepthSummary[];
  portfolioAutomationCoverage: number;
  totalFieldsTracked: number;
  fullyAutomatedPct: number;
  semiAutomatedPct: number;
  manualPct: number;
}

export interface FieldProvenance {
  fieldName: string;
  sourcePlatform: string;
  extractionMethod: string;
  automationLevel: AutomationLevel;
  confidence: number;
  lastObservedAt: string;
  observationCount: number;
}

export interface AssetProvenance {
  productId: string;
  productName: string;
  fields: FieldProvenance[];
  automationCoverage: number;
}

export interface AutomationSummary {
  fullyAutomated: number;
  semiAutomated: number;
  manual: number;
  total: number;
  coveragePct: number;
}

// ============================================================
// Lineage Center
// ============================================================

export type LineageNodeType =
  | "source_system" | "database" | "schema" | "table" | "view" | "column"
  | "etl_job" | "dbt_model" | "notebook" | "dataset" | "data_product"
  | "dashboard" | "report" | "metric" | "ml_model" | "api_endpoint" | "application";

export type LineageEdgeType =
  | "physical_lineage" | "logical_lineage" | "transformation" | "aggregation"
  | "derivation" | "exposure" | "consumption" | "copy" | "dependency";

export type LineageProvenance = "automated" | "inferred" | "manual";

export interface LineageNodeResponse {
  id: string;
  nodeType: LineageNodeType;
  name: string;
  qualifiedName: string;
  platform: string;
  domain: string | null;
  ownerUserId: string | null;
  tags: string[];
  provenance: LineageProvenance;
  confidence: number;
  dataProductId: string | null;
  sourceAssetId: string | null;
  metadata: Record<string, unknown>;
  lastSyncedAt: string | null;
  createdAt: string | null;
}

export interface LineageNodeSearchResponse {
  items: LineageNodeResponse[];
  total: number;
}

export interface LineageEdgeResponse {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: LineageEdgeType;
  platform: string | null;
  provenance: LineageProvenance;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}

export interface LineageGraphNode {
  id: string;
  nodeType: LineageNodeType;
  name: string;
  qualifiedName: string;
  platform: string;
  domain: string | null;
  dataProductId: string | null;
}

export interface LineageGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: LineageEdgeType;
  provenance: LineageProvenance;
  confidence: number;
}

export interface LineageGraphResponse {
  rootNodeId: string;
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  depth: number;
  direction: "upstream" | "downstream" | "both";
}

export interface LineageNodeDetail {
  node: LineageNodeResponse;
  upstreamCount: number;
  downstreamCount: number;
  upstreamEdges: LineageEdgeResponse[];
  downstreamEdges: LineageEdgeResponse[];
}

// ============================================================
// Portfolio Rebalance
// ============================================================

export interface RebalanceProduct {
  id: string;
  name: string;
  monthlyCost: number;
  trailingRoi: number;
}

export interface QuartileData {
  products: RebalanceProduct[];
  totalCost: number;
  totalValue: number;
  blendedRoi: number;
  count: number;
}

export interface PortfolioRebalance {
  currentBlendedRoi: number;
  projectedBlendedRoi: number;
  efficiencyDelta: number;
  rebalancePct: number;
  movableAmountMonthly: number;
  totalProducts: number;
  totalMonthlyCost: number;
  totalMonthlyValue: number;
  capitalConcentrationIndex: number;
  bottomQuartile: QuartileData;
  topQuartile: QuartileData;
  recommendedDivest: RebalanceProduct[];
  recommendedInvest: RebalanceProduct[];
}

// ============================================================
// Board Capital Summary
// ============================================================

export interface CapitalAction {
  decisionId: string;
  productName: string;
  decisionType: string;
  capitalFreed: number;
  status: string;
  resolvedAt: string | null;
}

export interface BoardCapitalSummary {
  totalCapitalFreed: number;
  totalCapitalFreedAnnual: number;
  confirmedSavings: number;
  projectedSavings: number;
  underperformingDecisions: number;
  portfolioRoiCurrent: number;
  portfolioRoiDelta: number;
  capitalEfficiencyScore: number;
  topCapitalActions: CapitalAction[];
}

// ============================================================
// Impact Report
// ============================================================

export interface ImpactReport {
  decisionId: string;
  productName: string;
  projectedSavingsMonthly: number;
  actualSavingsMeasured: number;
  varianceFromProjection: number;
  confidenceScore: number;
  validationStatus: string;
  windowComplete: boolean;
  costTrend: { month: string; cost: number }[];
  narrativeSummary: string;
}

// ============================================================
// Decision Detail Sub-Resources
// ============================================================

export interface DecisionComment {
  id: string;
  decisionId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export interface DecisionAction {
  id: string;
  decisionId: string;
  userId: string;
  actionType: "created" | "approved" | "rejected" | "delayed" | "commented";
  payload: string | null;
  createdAt: string;
}

export interface DecisionEconomicEffect {
  id: string;
  decisionId: string;
  effectType: "capital_freed" | "cost_saved" | "revenue_gained";
  amountUsdMonthly: number;
  amountUsdAnnual: number;
  confidence: number;
  calcExplainer: string | null;
  createdAt: string;
}

// ============================================================
// Capital Projection — 36-Month Forward Simulation
// ============================================================

export interface ProjectionMonth {
  month: number;
  projectedCost: number;
  projectedValue: number;
  projectedRoi: number;
  projectedCei: number;
  capitalLiability: number;
  aiSpend: number;
  retirementBacklog: number;
  governanceScore: number;
  capitalFreedCumulative: number;
  missedCapitalFreed: number;
}

export interface ProjectionScenario {
  label: string;
  months: ProjectionMonth[];
}

export interface DriftDelta {
  roiDrift12m: number;
  roiDrift24m: number;
  roiDrift36m: number;
  costDrift12m: number;
  liability12m: number;
  liability24m: number;
  liability36m: number;
}

export interface LiabilityEstimate {
  totalPassiveLiability36m: number;
  totalGovernanceGap36m: number;
  capitalFreedActive36m: number;
  aiExposurePassive36m: number;
}

export interface CurrentSnapshot {
  totalCost: number;
  totalValue: number;
  averageRoi: number;
  aiSpend: number;
  declineCost: number;
  decisionVelocityDays: number;
  valueCoveragePct: number;
  enforcementRate: number;
  retirementBacklog: number;
  ceiScore: number;
}

export interface CapitalProjectionResponse {
  scenarios: {
    passive: ProjectionScenario;
    governance: ProjectionScenario;
    active: ProjectionScenario;
  };
  driftDelta: DriftDelta;
  liabilityEstimate: LiabilityEstimate;
  currentSnapshot: CurrentSnapshot;
}

// ============================================================
// Capital Model — Computed dashboard metrics
// ============================================================

export type CapitalActionType = "retire" | "reallocate" | "price" | "review_ai";

export interface CapitalActionCard {
  id: string;
  type: CapitalActionType;
  title: string;
  description: string;
  capitalImpactMonthly: number;
  confidence: number; // 0-1
  requiredApprover: string;
  approverTitle: string;
  relatedProductIds: string[];
  relatedDecisionIds: string[];
  reviewHref: string;
  status: "actionable" | "in_progress" | "blocked";
}

export interface DecisionQueueRow {
  decisionId: string;
  type: DecisionType;
  productName: string;
  capitalImpactMonthly: number;
  confidence: number; // 0-1
  owner: string;
  ownerTitle: string;
  approver: string;
  slaDays: number;
  slaStatus: "on_track" | "at_risk" | "overdue";
  status: DecisionStatus;
}

export interface CapitalFlowDataPoint {
  month: string;
  totalSpend: number;
  misallocated: number;
  freed: number;
  recovered: number;
}

export interface CapitalModel {
  // Header metrics
  monthlyCapitalSpend: number;
  capitalMisallocated: number;
  capitalFreedLast90d: number;
  capitalFreedRunRate: number;
  capitalFreedOneTime: number;
  decisionLatencyMedianDays: number;

  // Board snapshot
  boardSnapshotCostDelta: number;
  boardSnapshotRoiDelta: number;
  boardSnapshotMonths: number;

  // Capital actions (3-5)
  capitalActions: CapitalActionCard[];

  // Capital at risk vs freed
  capitalAtRisk: number;
  capitalFreedConfirmed: number;

  // Inaction cost
  inactionProjectedSpend: number;
  inactionProjectedLiability: number;
  inactionPrimaryDriver: string;
  inactionPrimaryDriverValue: string;

  // Capital flow chart data
  capitalFlowData: CapitalFlowDataPoint[];

  // Decision queue
  decisionQueue: DecisionQueueRow[];

  // Coverage & auditability
  costCoverage: number;
  valueCoverage: string; // e.g. "10/13 declared"
  valueDeclarationCoverage: number; // 0-1
  confidenceLevel: number; // 0-1
  confidenceBasis: string;
  decisionProvenance: number; // 0-1, % of decisions with owner + evidence
}
