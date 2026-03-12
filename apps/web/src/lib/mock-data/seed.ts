// ============================================================
// Strata — Seed Data
// Realistic enterprise data that makes the product feel real
// ============================================================

import type {
  DataProduct,
  PortfolioSummary,
  Notification,
  CostTrendPoint,
  UsageTrendPoint,
  LifecycleTransition,
  Connector,
  Decision,
  DecisionComment,
  DecisionAction,
  DecisionEconomicEffect,
  ROIHistoryPoint,
  ValueDeclarationVersion,
  ExecutiveSummary,
  BenchmarkDataPoint,
  PolicyConfig,
  OrgInfo,
  DisplayConfig,
  CEIResponse,
  CapitalBehavior,
  PortfolioRebalance,
  BoardCapitalSummary,
  ImpactReport,
  CapitalProjectionResponse,
  ProjectionMonth,
} from "../types";

import {
  computeCompositeValue,
  computeProductROI,
  classifyROI,
  computePortfolioSummary,
  computeCapitalImpactSummary,
  computeSavingsSummary,
  computeBoardSummary,
  computeCEI,
  computeCapitalBehavior,
  computePortfolioRebalance,
  computeCapitalFreed,
  computeDecisionVelocity,
  countProductsWithValue,
  ROI_BANDS,
  type CapitalEvent as CanonicalCapitalEvent,
} from "@/lib/metrics/canonical";

import {
  anchorProducts,
  longTailProducts,
  scaleUpProducts,
  additionalDecisions,
  additionalCapitalEvents,
  extendedCostTrends,
  extendedUsageTrends,
} from "./seed-extended";

import { computeEconomicSignals } from "@/lib/engine/economic-signals";
import { computeValueInference } from "@/lib/engine/value-inference";

// ---- Helpers ----

/** Simple deterministic pseudo-random based on index */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

function costTrend(base: number, growth: number): CostTrendPoint[] {
  return months.map((m, i) => ({
    month: m,
    cost: Math.round(base * (1 + growth * i) * 100) / 100,
    value: Math.round(base * (1 + growth * i) * (2 + seededRandom(i)) * 100) / 100,
  }));
}

function usageTrend(base: number, growth: number): UsageTrendPoint[] {
  return months.map((m, i) => ({
    month: m,
    consumers: Math.round(base * (1 + growth * i)),
    queries: Math.round(base * (1 + growth * i) * 45),
  }));
}

// ---- Data Products ----
// Products are defined without inferredValue/valueSource, then hydrated below
type RawProduct = Omit<DataProduct, "inferredValue" | "valueSource">;
const _rawProducts: RawProduct[] = [
  {
    id: "dp-001",
    name: "Customer 360",
    domain: "Customer Analytics",
    businessUnit: "Marketing",
    owner: { id: "u-1", name: "Maria Santos", title: "Sr. Data Product Manager", team: "Customer Analytics" },
    platform: "snowflake",
    lifecycleStage: "growth",
    createdAt: "2025-03-15",
    updatedAt: "2026-02-22T14:30:00Z",
    monthlyCost: 18400,
    costBreakdown: { compute: 8200, storage: 2100, pipeline: 3400, humanEstimate: 4700 },
    declaredValue: 62000,
    usageImpliedValue: 48000,
    compositeValue: computeCompositeValue(62000, 48000),
    roi: computeProductROI(computeCompositeValue(62000, 48000), 18400),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(62000, 48000), 18400)) ?? "critical",
    costTrend: 5,
    costCoverage: 0.92,
    monthlyConsumers: 340,
    totalQueries: 15300,
    consumerTeams: [
      { name: "Marketing Analytics", consumers: 89, percentage: 26 },
      { name: "Sales Ops", consumers: 72, percentage: 21 },
      { name: "Customer Success", consumers: 58, percentage: 17 },
      { name: "Data Science", consumers: 45, percentage: 13 },
      { name: "Product", consumers: 38, percentage: 11 },
      { name: "Finance", consumers: 22, percentage: 6 },
      { name: "Executive", consumers: 16, percentage: 5 },
    ],
    usageTrend: 12,
    peakConsumers: 340,
    freshnessHours: 2.3,
    freshnessSLA: 4,
    completeness: 0.992,
    accuracy: 0.978,
    trustScore: 0.97,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 12,
    valueDeclaration: {
      declaredBy: "Sarah Chen",
      declaredByTitle: "VP Marketing",
      method: "revenue_attribution",
      value: 62000,
      basis: "Drives segmentation for $740K/year campaign spend. Estimated 8% lift = $62K/month attributed value.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-12-10",
      nextReview: "2026-06-10",
      isExpiring: false,
    },
    downstreamProducts: 3,
    downstreamModels: 2,
    downstreamDashboards: 7,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-002",
    name: "Revenue Analytics Hub",
    domain: "Finance",
    businessUnit: "Finance",
    owner: { id: "u-2", name: "James Liu", title: "Finance Data Lead", team: "Revenue Analytics" },
    platform: "snowflake",
    lifecycleStage: "mature",
    createdAt: "2024-08-20",
    updatedAt: "2026-02-21T09:15:00Z",
    monthlyCost: 24200,
    costBreakdown: { compute: 12100, storage: 3200, pipeline: 4900, humanEstimate: 4000 },
    declaredValue: 95000,
    usageImpliedValue: 72000,
    compositeValue: computeCompositeValue(95000, 72000),
    roi: computeProductROI(computeCompositeValue(95000, 72000), 24200),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(95000, 72000), 24200)) ?? "critical",
    costTrend: 2,
    costCoverage: 0.95,
    monthlyConsumers: 180,
    totalQueries: 8100,
    consumerTeams: [
      { name: "Finance", consumers: 62, percentage: 34 },
      { name: "Executive", consumers: 44, percentage: 24 },
      { name: "Sales Ops", consumers: 38, percentage: 21 },
      { name: "Strategy", consumers: 36, percentage: 20 },
    ],
    usageTrend: 3,
    peakConsumers: 195,
    freshnessHours: 1.2,
    freshnessSLA: 2,
    completeness: 0.998,
    accuracy: 0.995,
    trustScore: 0.99,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 8,
    valueDeclaration: {
      declaredBy: "Michael Torres",
      declaredByTitle: "CFO",
      method: "revenue_attribution",
      value: 95000,
      basis: "Directly supports $12M quarterly revenue forecasting. Accuracy improvements worth $95K/month in reduced variance.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-09-15",
      nextReview: "2026-03-15",
      isExpiring: true,
    },
    downstreamProducts: 5,
    downstreamModels: 1,
    downstreamDashboards: 12,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-003",
    name: "Product Interaction Events",
    domain: "Product Analytics",
    businessUnit: "Product",
    owner: { id: "u-3", name: "Aisha Patel", title: "Product Analytics Manager", team: "Product Insights" },
    platform: "databricks",
    lifecycleStage: "growth",
    createdAt: "2025-06-01",
    updatedAt: "2026-02-22T16:45:00Z",
    monthlyCost: 14800,
    costBreakdown: { compute: 7200, storage: 1800, pipeline: 2800, humanEstimate: 3000 },
    declaredValue: 38000,
    usageImpliedValue: 32000,
    compositeValue: computeCompositeValue(38000, 32000),
    roi: computeProductROI(computeCompositeValue(38000, 32000), 14800),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(38000, 32000), 14800)) ?? "critical",
    costTrend: 8,
    costCoverage: 0.78,
    monthlyConsumers: 220,
    totalQueries: 9900,
    consumerTeams: [
      { name: "Product", consumers: 88, percentage: 40 },
      { name: "Data Science", consumers: 55, percentage: 25 },
      { name: "Engineering", consumers: 44, percentage: 20 },
      { name: "Marketing Analytics", consumers: 33, percentage: 15 },
    ],
    usageTrend: 18,
    peakConsumers: 220,
    freshnessHours: 0.5,
    freshnessSLA: 1,
    completeness: 0.985,
    accuracy: 0.96,
    trustScore: 0.95,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 7,
    valueDeclaration: {
      declaredBy: "David Kim",
      declaredByTitle: "VP Product",
      method: "efficiency_gain",
      value: 38000,
      basis: "Reduces experiment cycle time by 30%. Saves ~$38K/month in engineering and product time.",
      status: ["peer_reviewed"],
      declaredAt: "2025-11-20",
      nextReview: "2026-05-20",
      isExpiring: false,
    },
    downstreamProducts: 2,
    downstreamModels: 3,
    downstreamDashboards: 5,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-004",
    name: "Supply Chain Metrics",
    domain: "Operations",
    businessUnit: "Operations",
    owner: { id: "u-4", name: "Robert Chen", title: "Operations Data Lead", team: "Supply Chain Analytics" },
    platform: "s3",
    lifecycleStage: "mature",
    createdAt: "2024-04-10",
    updatedAt: "2026-02-20T11:00:00Z",
    monthlyCost: 11200,
    costBreakdown: { compute: 4800, storage: 2400, pipeline: 1800, humanEstimate: 2200 },
    declaredValue: 28000,
    usageImpliedValue: 18000,
    compositeValue: computeCompositeValue(28000, 18000),
    roi: computeProductROI(computeCompositeValue(28000, 18000), 11200),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(28000, 18000), 11200)) ?? "critical",
    costTrend: -1,
    costCoverage: 0.88,
    monthlyConsumers: 65,
    totalQueries: 2925,
    consumerTeams: [
      { name: "Operations", consumers: 32, percentage: 49 },
      { name: "Procurement", consumers: 18, percentage: 28 },
      { name: "Finance", consumers: 15, percentage: 23 },
    ],
    usageTrend: -5,
    peakConsumers: 82,
    freshnessHours: 6,
    freshnessSLA: 8,
    completeness: 0.97,
    accuracy: 0.94,
    trustScore: 0.93,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 5,
    valueDeclaration: {
      declaredBy: "Linda Park",
      declaredByTitle: "VP Operations",
      method: "cost_avoidance",
      value: 28000,
      basis: "Prevents ~$28K/month in supply chain disruption costs through early warning.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-09-15",
      nextReview: "2026-03-15",
      isExpiring: true,
    },
    downstreamProducts: 1,
    downstreamModels: 0,
    downstreamDashboards: 4,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-005",
    name: "Fraud Detection Feed",
    domain: "Risk & Compliance",
    businessUnit: "Risk",
    owner: { id: "u-5", name: "Elena Volkov", title: "Risk Analytics Lead", team: "Fraud Prevention" },
    platform: "databricks",
    lifecycleStage: "active",
    createdAt: "2025-09-01",
    updatedAt: "2026-02-22T18:00:00Z",
    monthlyCost: 34000,
    costBreakdown: { compute: 18000, storage: 4000, pipeline: 6000, humanEstimate: 6000 },
    declaredValue: 120000,
    usageImpliedValue: 85000,
    compositeValue: computeCompositeValue(120000, 85000),
    roi: computeProductROI(computeCompositeValue(120000, 85000), 34000),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(120000, 85000), 34000)) ?? "critical",
    costTrend: 55,
    costCoverage: 0.72,
    monthlyConsumers: 28,
    totalQueries: 42000,
    consumerTeams: [
      { name: "Fraud Prevention", consumers: 12, percentage: 43 },
      { name: "Risk Management", consumers: 8, percentage: 29 },
      { name: "Compliance", consumers: 5, percentage: 18 },
      { name: "Data Science", consumers: 3, percentage: 11 },
    ],
    usageTrend: 35,
    peakConsumers: 28,
    freshnessHours: 0.08,
    freshnessSLA: 0.17,
    completeness: 0.999,
    accuracy: 0.992,
    trustScore: 0.98,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 4,
    valueDeclaration: {
      declaredBy: "Tom Reed",
      declaredByTitle: "Chief Risk Officer",
      method: "cost_avoidance",
      value: 120000,
      basis: "Prevents est. $120K/month in fraudulent transactions. Based on Q3 detection rate of 94%.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-12-01",
      nextReview: "2026-06-01",
      isExpiring: false,
    },
    downstreamProducts: 0,
    downstreamModels: 2,
    downstreamDashboards: 3,
    isRetirementCandidate: false,
    hasCostSpike: true,
    hasUsageDecline: false,
  },
  {
    id: "dp-006",
    name: "Legacy Campaign DB",
    domain: "Marketing",
    businessUnit: "Marketing",
    owner: { id: "u-6", name: "Jennifer Wu", title: "Marketing Ops", team: "Campaign Management" },
    platform: "snowflake",
    lifecycleStage: "decline",
    createdAt: "2023-06-15",
    updatedAt: "2026-01-10T08:00:00Z",
    monthlyCost: 14200,
    costBreakdown: { compute: 6100, storage: 4200, pipeline: 2400, humanEstimate: 1500 },
    declaredValue: null,
    usageImpliedValue: 3200,
    compositeValue: computeCompositeValue(null, 3200),
    roi: computeProductROI(computeCompositeValue(null, 3200), 14200),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(null, 3200), 14200)) ?? "critical",
    costTrend: 0,
    costCoverage: 0.95,
    monthlyConsumers: 3,
    totalQueries: 45,
    consumerTeams: [
      { name: "Marketing Ops", consumers: 2, percentage: 67 },
      { name: "Analytics", consumers: 1, percentage: 33 },
    ],
    usageTrend: -78,
    peakConsumers: 89,
    freshnessHours: 24,
    freshnessSLA: 12,
    completeness: 0.88,
    accuracy: 0.82,
    trustScore: 0.72,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 0,
    valueDeclaration: null,
    downstreamProducts: 0,
    downstreamModels: 0,
    downstreamDashboards: 1,
    isRetirementCandidate: true,
    hasCostSpike: false,
    hasUsageDecline: true,
  },
  {
    id: "dp-007",
    name: "Old Product Catalog",
    domain: "Product",
    businessUnit: "Product",
    owner: { id: "u-7", name: "Kevin Zhang", title: "Product Data Engineer", team: "Product Platform" },
    platform: "power_bi",
    lifecycleStage: "decline",
    createdAt: "2023-09-01",
    updatedAt: "2025-12-15T10:30:00Z",
    monthlyCost: 8700,
    costBreakdown: { compute: 3200, storage: 3100, pipeline: 1200, humanEstimate: 1200 },
    declaredValue: null,
    usageImpliedValue: 2100,
    compositeValue: computeCompositeValue(null, 2100),
    roi: computeProductROI(computeCompositeValue(null, 2100), 8700),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(null, 2100), 8700)) ?? "critical",
    costTrend: -2,
    costCoverage: 0.91,
    monthlyConsumers: 7,
    totalQueries: 120,
    consumerTeams: [
      { name: "Product", consumers: 4, percentage: 57 },
      { name: "Engineering", consumers: 3, percentage: 43 },
    ],
    usageTrend: -62,
    peakConsumers: 124,
    freshnessHours: 48,
    freshnessSLA: 24,
    completeness: 0.91,
    accuracy: 0.85,
    trustScore: 0.74,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 0,
    valueDeclaration: null,
    downstreamProducts: 0,
    downstreamModels: 0,
    downstreamDashboards: 2,
    isRetirementCandidate: true,
    hasCostSpike: false,
    hasUsageDecline: true,
  },
  {
    id: "dp-008",
    name: "Employee Analytics",
    domain: "People",
    businessUnit: "HR",
    owner: { id: "u-8", name: "Patricia Moore", title: "People Analytics Lead", team: "People & Culture" },
    platform: "snowflake",
    lifecycleStage: "active",
    createdAt: "2025-07-01",
    updatedAt: "2026-02-22T12:00:00Z",
    monthlyCost: 6800,
    costBreakdown: { compute: 2800, storage: 1200, pipeline: 1300, humanEstimate: 1500 },
    declaredValue: 22000,
    usageImpliedValue: 14000,
    compositeValue: computeCompositeValue(22000, 14000),
    roi: computeProductROI(computeCompositeValue(22000, 14000), 6800),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(22000, 14000), 6800)) ?? "critical",
    costTrend: 3,
    costCoverage: 0.85,
    monthlyConsumers: 42,
    totalQueries: 1890,
    consumerTeams: [
      { name: "HR", consumers: 18, percentage: 43 },
      { name: "Executive", consumers: 12, percentage: 29 },
      { name: "Finance", consumers: 8, percentage: 19 },
      { name: "Legal", consumers: 4, percentage: 10 },
    ],
    usageTrend: 8,
    peakConsumers: 42,
    freshnessHours: 12,
    freshnessSLA: 24,
    completeness: 0.96,
    accuracy: 0.94,
    trustScore: 0.92,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 4,
    valueDeclaration: {
      declaredBy: "Nancy Evans",
      declaredByTitle: "CHRO",
      method: "efficiency_gain",
      value: 22000,
      basis: "Automates quarterly people reports, saving 120 analyst hours/quarter = ~$22K/month.",
      status: ["peer_reviewed"],
      declaredAt: "2025-10-15",
      nextReview: "2026-04-15",
      isExpiring: false,
    },
    downstreamProducts: 1,
    downstreamModels: 0,
    downstreamDashboards: 3,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-009",
    name: "Pricing Elasticity Model",
    domain: "Pricing",
    businessUnit: "Strategy",
    owner: { id: "u-9", name: "Alex Rivera", title: "Pricing Strategy Lead", team: "Revenue Strategy" },
    platform: "databricks",
    lifecycleStage: "growth",
    createdAt: "2025-10-01",
    updatedAt: "2026-02-21T15:30:00Z",
    monthlyCost: 9400,
    costBreakdown: { compute: 5200, storage: 800, pipeline: 1600, humanEstimate: 1800 },
    declaredValue: 45000,
    usageImpliedValue: 28000,
    compositeValue: computeCompositeValue(45000, 28000),
    roi: computeProductROI(computeCompositeValue(45000, 28000), 9400),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(45000, 28000), 9400)) ?? "critical",
    costTrend: 12,
    costCoverage: 0.68,
    monthlyConsumers: 18,
    totalQueries: 810,
    consumerTeams: [
      { name: "Strategy", consumers: 8, percentage: 44 },
      { name: "Sales Ops", consumers: 6, percentage: 33 },
      { name: "Finance", consumers: 4, percentage: 22 },
    ],
    usageTrend: 25,
    peakConsumers: 18,
    freshnessHours: 24,
    freshnessSLA: 48,
    completeness: 0.98,
    accuracy: 0.92,
    trustScore: 0.91,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 3,
    valueDeclaration: {
      declaredBy: "Rachel Kim",
      declaredByTitle: "VP Strategy",
      method: "revenue_attribution",
      value: 45000,
      basis: "Optimized pricing across 3 product lines yielding $45K/month incremental margin.",
      status: ["peer_reviewed"],
      declaredAt: "2026-01-10",
      nextReview: "2026-07-10",
      isExpiring: false,
    },
    downstreamProducts: 0,
    downstreamModels: 1,
    downstreamDashboards: 2,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-010",
    name: "Marketing Attribution",
    domain: "Marketing",
    businessUnit: "Marketing",
    owner: { id: "u-10", name: "Sophie Turner", title: "Marketing Analytics Manager", team: "Growth Marketing" },
    platform: "snowflake",
    lifecycleStage: "growth",
    createdAt: "2025-08-15",
    updatedAt: "2026-02-22T10:00:00Z",
    monthlyCost: 12600,
    costBreakdown: { compute: 5800, storage: 1600, pipeline: 2800, humanEstimate: 2400 },
    declaredValue: 52000,
    usageImpliedValue: 38000,
    compositeValue: computeCompositeValue(52000, 38000),
    roi: computeProductROI(computeCompositeValue(52000, 38000), 12600),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(52000, 38000), 12600)) ?? "critical",
    costTrend: 6,
    costCoverage: 0.89,
    monthlyConsumers: 95,
    totalQueries: 4275,
    consumerTeams: [
      { name: "Growth Marketing", consumers: 42, percentage: 44 },
      { name: "Marketing Ops", consumers: 28, percentage: 29 },
      { name: "Finance", consumers: 15, percentage: 16 },
      { name: "Executive", consumers: 10, percentage: 11 },
    ],
    usageTrend: 22,
    peakConsumers: 95,
    freshnessHours: 4,
    freshnessSLA: 6,
    completeness: 0.97,
    accuracy: 0.93,
    trustScore: 0.94,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 6,
    valueDeclaration: {
      declaredBy: "Sarah Chen",
      declaredByTitle: "VP Marketing",
      method: "revenue_attribution",
      value: 52000,
      basis: "Enables $52K/month in marketing spend optimization through multi-touch attribution.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-11-01",
      nextReview: "2026-05-01",
      isExpiring: false,
    },
    downstreamProducts: 2,
    downstreamModels: 1,
    downstreamDashboards: 4,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-011",
    name: "Test Env Dataset",
    domain: "Engineering",
    businessUnit: "Engineering",
    owner: { id: "u-11", name: "Mike Johnson", title: "Data Engineer", team: "Platform" },
    platform: "snowflake",
    lifecycleStage: "decline",
    createdAt: "2024-11-01",
    updatedAt: "2025-11-01T08:00:00Z",
    monthlyCost: 6100,
    costBreakdown: { compute: 1200, storage: 3800, pipeline: 600, humanEstimate: 500 },
    declaredValue: null,
    usageImpliedValue: 0,
    compositeValue: computeCompositeValue(null, 0),
    roi: computeProductROI(computeCompositeValue(null, 0), 6100),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(null, 0), 6100)),
    costTrend: 0,
    costCoverage: 0.98,
    monthlyConsumers: 0,
    totalQueries: 0,
    consumerTeams: [],
    usageTrend: -100,
    peakConsumers: 45,
    freshnessHours: 720,
    freshnessSLA: 24,
    completeness: 0.65,
    accuracy: 0.6,
    trustScore: 0.45,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 0,
    valueDeclaration: null,
    downstreamProducts: 0,
    downstreamModels: 0,
    downstreamDashboards: 0,
    isRetirementCandidate: true,
    hasCostSpike: false,
    hasUsageDecline: true,
  },
  {
    id: "dp-012",
    name: "Inventory Forecast",
    domain: "Operations",
    businessUnit: "Operations",
    owner: { id: "u-12", name: "Karen White", title: "Supply Chain Analyst", team: "Inventory Management" },
    platform: "s3",
    lifecycleStage: "active",
    createdAt: "2025-11-01",
    updatedAt: "2026-02-22T08:30:00Z",
    monthlyCost: 7800,
    costBreakdown: { compute: 4200, storage: 900, pipeline: 1200, humanEstimate: 1500 },
    declaredValue: 18000,
    usageImpliedValue: 12000,
    compositeValue: computeCompositeValue(18000, 12000),
    roi: computeProductROI(computeCompositeValue(18000, 12000), 7800),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(18000, 12000), 7800)) ?? "critical",
    costTrend: 4,
    costCoverage: 0.65,
    monthlyConsumers: 24,
    totalQueries: 1080,
    consumerTeams: [
      { name: "Operations", consumers: 14, percentage: 58 },
      { name: "Procurement", consumers: 6, percentage: 25 },
      { name: "Finance", consumers: 4, percentage: 17 },
    ],
    usageTrend: 15,
    peakConsumers: 24,
    freshnessHours: 4,
    freshnessSLA: 8,
    completeness: 0.95,
    accuracy: 0.91,
    trustScore: 0.9,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 3,
    valueDeclaration: {
      declaredBy: "Linda Park",
      declaredByTitle: "VP Operations",
      method: "cost_avoidance",
      value: 18000,
      basis: "Reduces inventory holding costs by $18K/month through demand forecasting accuracy.",
      status: ["peer_reviewed"],
      declaredAt: "2026-01-15",
      nextReview: "2026-07-15",
      isExpiring: false,
    },
    downstreamProducts: 1,
    downstreamModels: 1,
    downstreamDashboards: 2,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  {
    id: "dp-013",
    name: "Churn Predictor Features",
    domain: "Customer Analytics",
    businessUnit: "Marketing",
    owner: { id: "u-13", name: "Jun Park", title: "ML Engineer", team: "Data Science" },
    platform: "databricks",
    lifecycleStage: "draft",
    createdAt: "2025-12-10",
    updatedAt: "2026-02-20T14:00:00Z",
    monthlyCost: 3200,
    costBreakdown: { compute: 1800, storage: 400, pipeline: 500, humanEstimate: 500 },
    declaredValue: null,
    usageImpliedValue: 0,
    compositeValue: computeCompositeValue(null, 0),
    roi: computeProductROI(computeCompositeValue(null, 0), 3200),
    roiBand: classifyROI(computeProductROI(computeCompositeValue(null, 0), 3200)),
    costTrend: 0,
    costCoverage: 0.6,
    monthlyConsumers: 0,
    totalQueries: 0,
    consumerTeams: [],
    usageTrend: 0,
    peakConsumers: 0,
    freshnessHours: 12,
    freshnessSLA: 24,
    completeness: 0.9,
    accuracy: 0.88,
    trustScore: 0.8,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 0,
    valueDeclaration: null,
    downstreamProducts: 0,
    downstreamModels: 0,
    downstreamDashboards: 0,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
  },
  // --- Extended Products: Anchor Narratives + Long Tail ---
  ...anchorProducts,
  ...longTailProducts,
  // --- Scale-Up: ~160 generated products for enterprise-scale demo ---
  ...scaleUpProducts,
];

// Hydrate inference fields via CIE Value Inference Engine
// (engine imports are at file-level below)
function hydrateInference(raw: RawProduct[], decs: Decision[]): DataProduct[] {
  // We need full DataProduct[] for the engine, so temporarily cast
  const tempProducts = raw.map((p) => ({
    ...p,
    inferredValue: null as DataProduct["inferredValue"],
    valueSource: (p.declaredValue !== null ? "declared" : "inferred") as DataProduct["valueSource"],
  }));

  // Run engine chain: signals → inference
  const signals = computeEconomicSignals(tempProducts, decs, []);
  const inference = computeValueInference(tempProducts, decs, signals);
  const inferenceMap = new Map(inference.perProduct.map((iv) => [iv.productId, iv]));

  return tempProducts.map((p) => {
    const iv = inferenceMap.get(p.id);
    if (!iv) return p;

    const inferredValue: DataProduct["inferredValue"] = {
      annualBand: iv.inferredAnnualValueBand,
      monthlyMid: Math.round(iv.inferredAnnualValueBand.mid / 12),
      confidence: iv.inferenceConfidenceScore,
      blendedMonthly: iv.blendedMonthlyValue,
    };

    const valueSource: DataProduct["valueSource"] =
      p.declaredValue !== null ? "blended" : "inferred";

    return { ...p, inferredValue, valueSource };
  });
}

export const dataProducts: DataProduct[] = hydrateInference(_rawProducts, [] as Decision[]);

// ---- Portfolio Summary ----
export const portfolioSummary: PortfolioSummary = {
  ...computePortfolioSummary(dataProducts),
  // Narrative overrides (historical comparisons, not derivable from current snapshot)
  roiTrend: 0.3,
  consumersTrend: 12,
  newProductsThisQuarter: 4,
};

// ---- Cost Trends (portfolio level) ----
export const portfolioCostTrend: CostTrendPoint[] = [
  { month: "Sep", cost: 382000, value: 1060000 },
  { month: "Oct", cost: 395000, value: 1100000 },
  { month: "Nov", cost: 408000, value: 1145000 },
  { month: "Dec", cost: 420000, value: 1185000 },
  { month: "Jan", cost: 432000, value: 1230000 },
  { month: "Feb", cost: portfolioSummary.totalCost, value: Math.round(portfolioSummary.averageROI * portfolioSummary.totalCost) },
];

// ---- Product-level trends ----
export const productCostTrends: Record<string, CostTrendPoint[]> = {
  "dp-001": costTrend(16000, 0.025),
  "dp-002": costTrend(23000, 0.008),
  "dp-005": costTrend(22000, 0.08),
  ...extendedCostTrends,
};

export const productUsageTrends: Record<string, UsageTrendPoint[]> = {
  "dp-001": usageTrend(280, 0.035),
  "dp-002": usageTrend(170, 0.01),
  "dp-006": [
    { month: "Sep", consumers: 52, queries: 2340 },
    { month: "Oct", consumers: 38, queries: 1710 },
    { month: "Nov", consumers: 24, queries: 1080 },
    { month: "Dec", consumers: 12, queries: 540 },
    { month: "Jan", consumers: 5, queries: 120 },
    { month: "Feb", consumers: 3, queries: 45 },
  ],
  ...extendedUsageTrends,
};

// ---- Lifecycle Transitions (derived from current product stages) ----
export const lifecycleTransitions: LifecycleTransition[] = (() => {
  const stages: Record<string, number> = {};
  for (const p of dataProducts) {
    stages[p.lifecycleStage] = (stages[p.lifecycleStage] ?? 0) + 1;
  }
  const active = stages["active"] ?? 0;
  const growth = stages["growth"] ?? 0;
  const mature = stages["mature"] ?? 0;
  const decline = stages["decline"] ?? 0;
  const retired = stages["retired"] ?? 0;
  // Products at later stages must have transitioned through earlier ones
  return [
    { from: "draft", to: "active", count: active + growth + mature + decline + retired },
    { from: "active", to: "growth", count: growth + mature + decline + retired },
    { from: "growth", to: "mature", count: mature + decline + retired },
    { from: "mature", to: "decline", count: decline + retired },
    { from: "decline", to: "retired", count: retired },
  ];
})();

// ---- Notifications ----
export const notifications: Notification[] = [
  {
    id: "n-1",
    type: "cost_spike",
    title: "Cost spike detected",
    description: "Fraud Detection Feed cost increased 55% MoM (+$12K)",
    productId: "dp-005",
    productName: "Fraud Detection Feed",
    timestamp: "2026-02-22T18:00:00Z",
    isRead: false,
  },
  {
    id: "n-2",
    type: "retirement_candidate",
    title: "Retirement recommended",
    description: "Legacy Campaign DB has 3 consumers (was 89). Saving: $14.2K/mo",
    productId: "dp-006",
    productName: "Legacy Campaign DB",
    timestamp: "2026-02-21T09:00:00Z",
    isRead: false,
  },
  {
    id: "n-3",
    type: "value_expiring",
    title: "Value declaration expiring",
    description: "Revenue Analytics Hub declaration expires Mar 15. Revalidation needed.",
    productId: "dp-002",
    productName: "Revenue Analytics Hub",
    timestamp: "2026-02-20T10:00:00Z",
    isRead: false,
  },
  {
    id: "n-4",
    type: "usage_drop",
    title: "Usage declining",
    description: "Old Product Catalog usage dropped 62% from peak",
    productId: "dp-007",
    productName: "Old Product Catalog",
    timestamp: "2026-02-19T14:00:00Z",
    isRead: true,
  },
  {
    id: "n-5",
    type: "lifecycle_change",
    title: "Stage transition",
    description: "Marketing Attribution moved to Growth stage",
    productId: "dp-010",
    productName: "Marketing Attribution",
    timestamp: "2026-02-18T11:00:00Z",
    isRead: true,
  },
];

// ---- Connectors ----
// Canonical connector definitions — all platforms represented.
// IDs use `conn-{platform_abbrev}-{instance}` scheme, cross-referenced by connector-depth-seed.ts and lineage-seed.ts.
export const connectors: Connector[] = [
  {
    id: "conn-snow-1",
    platform: "snowflake",
    name: "Snowflake PROD",
    status: "connected",
    lastSync: "2026-02-22T20:00:00Z",
    productsFound: dataProducts.filter((p) => p.platform === "snowflake").length,
    costCoverage: 0.92,
    usageCoverage: 0.95,
  },
  {
    id: "conn-snow-2",
    platform: "snowflake",
    name: "Snowflake Dev",
    status: "connected",
    lastSync: "2026-02-22T18:00:00Z",
    productsFound: 0, // Dev instance — staging/sandbox objects, no production products
    costCoverage: 0.85,
    usageCoverage: 0.78,
  },
  {
    id: "conn-dbx-1",
    platform: "databricks",
    name: "Databricks Unity",
    status: "connected",
    lastSync: "2026-02-22T19:30:00Z",
    productsFound: dataProducts.filter((p) => p.platform === "databricks").length,
    costCoverage: 0.68,
    usageCoverage: 0.88,
  },
  {
    id: "conn-s3-1",
    platform: "s3",
    name: "S3 Data Lake",
    status: "connected",
    lastSync: "2026-02-22T17:00:00Z",
    productsFound: dataProducts.filter((p) => p.platform === "s3").length,
    costCoverage: 0.55,
    usageCoverage: 0.72,
  },
  {
    id: "conn-pbi-1",
    platform: "power_bi",
    name: "Power BI Workspace",
    status: "connected",
    lastSync: "2026-02-22T16:00:00Z",
    productsFound: dataProducts.filter((p) => p.platform === "power_bi").length,
    costCoverage: 0.42,
    usageCoverage: 0.81,
  },
  {
    id: "conn-bq-1",
    platform: "bigquery",
    name: "BigQuery Analytics",
    status: "connected",
    lastSync: "2026-02-22T15:00:00Z",
    productsFound: dataProducts.filter((p) => p.platform === "bigquery").length,
    costCoverage: 0.78,
    usageCoverage: 0.90,
  },
];

// ============================================================
// DECISION WORKFLOW SYSTEM — Economic Decision Log
// Chronological record of portfolio decisions with $ outcomes
// ============================================================

export const decisions: Decision[] = [
  {
    id: "dec-001",
    type: "retirement",
    status: "approved",
    productId: "dp-011",
    productName: "Test Env Dataset",
    title: "Retire Test Env Dataset — zero consumers for 90+ days",
    description: "Product has had 0 consumers since Nov 2025. Storage costs $3.8K/mo with no value. All downstream dashboards migrated.",
    initiatedBy: "Strata",
    assignedTo: "Mike Johnson",
    assignedToTitle: "Data Engineer",
    estimatedImpact: 6100,
    actualImpact: 6100,
    impactBasis: "Full monthly cost eliminated. No consumers affected.",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-01-28T14:00:00Z",
    resolvedAt: "2026-01-28T14:00:00Z",
    resolution: "Approved. Data archived to cold storage. Compute and pipeline shut down. Savings realized from Feb 1.",
    capitalFreed: 6100,
    projectedSavingsMonthly: 6100,
    projectedSavingsAnnual: 73200,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "confirmed",
  },
  {
    id: "dec-002",
    type: "cost_investigation",
    status: "approved",
    productId: "dp-005",
    productName: "Fraud Detection Feed",
    title: "Investigate 55% cost spike in Fraud Detection Feed",
    description: "MoM cost increase from $22K to $34K. Driven by compute scaling for new real-time fraud patterns. High ROI (3.2x) but cost trajectory unsustainable.",
    initiatedBy: "Strata",
    assignedTo: "Elena Volkov",
    assignedToTitle: "Risk Analytics Lead",
    estimatedImpact: -8000,
    actualImpact: -5200,
    impactBasis: "Optimized query patterns reduced compute by $5.2K/mo while maintaining detection rate. Remaining increase justified by new fraud vectors.",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-18T16:00:00Z",
    resolvedAt: "2026-02-18T16:00:00Z",
    resolution: "Compute optimizations applied. Remaining $6.8K increase approved as justified by 3 new fraud pattern detections worth ~$40K/mo in prevented losses.",
    capitalFreed: 5200,
    projectedSavingsMonthly: 5200,
    projectedSavingsAnnual: 62400,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "validating",
  },
  {
    id: "dec-003",
    type: "retirement",
    status: "under_review",
    productId: "dp-006",
    productName: "Legacy Campaign DB",
    title: "Retire Legacy Campaign DB — 97% usage decline from peak",
    description: "3 remaining consumers (down from 89). No declared value. $14.2K/mo cost with 0.07x ROI. Marketing team confirms migration to Marketing Attribution complete.",
    initiatedBy: "Strata",
    assignedTo: "Jennifer Wu",
    assignedToTitle: "Marketing Ops",
    estimatedImpact: 14200,
    actualImpact: null,
    impactBasis: "Full monthly cost elimination. 3 remaining consumers to be migrated to Marketing Attribution (dp-010).",
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-02-20T11:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 14200,
    projectedSavingsAnnual: 170400,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-004",
    type: "retirement",
    status: "under_review",
    productId: "dp-007",
    productName: "Old Product Catalog",
    title: "Retire Old Product Catalog — replaced by Product Interaction Events",
    description: "7 consumers remaining (down from 124). Usage declined 62% from peak. No declared value. Product team confirms Product Interaction Events (dp-003) is the successor.",
    initiatedBy: "Strata",
    assignedTo: "Kevin Zhang",
    assignedToTitle: "Product Data Engineer",
    estimatedImpact: 8700,
    actualImpact: null,
    impactBasis: "Full monthly cost elimination. 7 consumers to migrate to Product Interaction Events.",
    createdAt: "2026-02-12T09:00:00Z",
    updatedAt: "2026-02-19T15:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 8700,
    projectedSavingsAnnual: 104400,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-005",
    type: "value_revalidation",
    status: "under_review",
    productId: "dp-002",
    productName: "Revenue Analytics Hub",
    title: "Revalidate Revenue Analytics Hub value declaration — expiring Mar 15",
    description: "Current $95K/mo declared value expires in 3 weeks. CFO-acknowledged. 180 consumers, 3.6x ROI. Revalidation critical for board reporting accuracy.",
    initiatedBy: "Strata",
    assignedTo: "James Liu",
    assignedToTitle: "Finance Data Lead",
    estimatedImpact: 0,
    actualImpact: null,
    impactBasis: "No direct cost impact. Failure to revalidate reduces portfolio confidence score and removes $95K/mo from declared value totals.",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-22T09:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 0,
    projectedSavingsAnnual: 0,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-006",
    type: "low_roi_review",
    status: "rejected",
    productId: "dp-004",
    productName: "Supply Chain Metrics",
    title: "Review declining usage of Supply Chain Metrics",
    description: "Usage down 5% MoM. 65 consumers (peak 82). ROI still healthy at 2.2x but trajectory concerning. Operations team asked to confirm continued strategic value.",
    initiatedBy: "Strata",
    assignedTo: "Robert Chen",
    assignedToTitle: "Operations Data Lead",
    estimatedImpact: 0,
    actualImpact: 0,
    impactBasis: "No cost action. Seasonal procurement cycle explains usage dip. Q2 forecast shows recovery to 78 consumers.",
    createdAt: "2026-01-20T09:00:00Z",
    updatedAt: "2026-02-05T14:00:00Z",
    resolvedAt: "2026-02-05T14:00:00Z",
    resolution: "Rejected — usage decline is seasonal. Procurement cycle normalizes in March. No action needed. Will re-evaluate if Q2 usage stays below 60.",
    capitalFreed: 0,
    projectedSavingsMonthly: 0,
    projectedSavingsAnnual: 0,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-007",
    type: "cost_investigation",
    status: "approved",
    productId: "dp-003",
    productName: "Product Interaction Events",
    title: "Investigate 8% MoM cost increase in Product Interaction Events",
    description: "Cost grew from $13.7K to $14.8K. Driven by 18% usage growth and new event types. Growth-stage product with strong adoption trajectory.",
    initiatedBy: "Strata",
    assignedTo: "Aisha Patel",
    assignedToTitle: "Product Analytics Manager",
    estimatedImpact: -1100,
    actualImpact: -800,
    impactBasis: "Switched to reserved compute instances. $800/mo savings. Remaining growth-driven cost increase accepted.",
    createdAt: "2026-01-25T09:00:00Z",
    updatedAt: "2026-02-10T11:00:00Z",
    resolvedAt: "2026-02-10T11:00:00Z",
    resolution: "Approved. Reserved instance migration saved $800/mo. Remaining cost growth proportional to 18% usage increase — healthy growth trajectory.",
    capitalFreed: 800,
    projectedSavingsMonthly: 800,
    projectedSavingsAnnual: 9600,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "confirmed",
  },
  {
    id: "dec-008",
    type: "retirement",
    status: "approved",
    productId: "dp-legacy-1",
    productName: "Legacy CRM Extract",
    title: "Retire Legacy CRM Extract — migrated to Customer 360",
    description: "Fully migrated to Customer 360 in Q3 2025. Zero consumers since October. $9.8K/mo wasted spend.",
    initiatedBy: "Maria Santos",
    assignedTo: "Maria Santos",
    assignedToTitle: "Sr. Data Product Manager",
    estimatedImpact: 9800,
    actualImpact: 9800,
    impactBasis: "Full cost elimination. All consumers successfully migrated to Customer 360.",
    createdAt: "2025-10-15T09:00:00Z",
    updatedAt: "2025-11-01T14:00:00Z",
    resolvedAt: "2025-11-01T14:00:00Z",
    resolution: "Approved and executed. Data archived. Compute terminated. $9.8K/mo savings realized from Nov 1.",
    capitalFreed: 9800,
    projectedSavingsMonthly: 9800,
    projectedSavingsAnnual: 117600,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "confirmed",
  },
  {
    id: "dec-009",
    type: "capital_reallocation",
    status: "under_review",
    productId: "dp-006",
    productName: "Legacy Campaign DB",
    title: "Reallocate $22.9K/mo from bottom-quartile products to growth cohort",
    description: "Bottom quartile (Legacy Campaign DB + Old Product Catalog) consumes $22.9K/mo at 0.07x blended ROI. Redirecting to Customer 360 and Marketing Attribution (4.5x blended ROI) would improve portfolio-weighted ROI by +0.3x over the next quarter.",
    initiatedBy: "Strata",
    assignedTo: "David Park",
    assignedToTitle: "CFO",
    estimatedImpact: 22900,
    actualImpact: null,
    impactBasis: "Reallocation from 0.07x ROI products to 4.5x ROI growth cohort. Net portfolio ROI improvement of +0.3x projected.",
    createdAt: "2026-02-18T09:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 22900,
    projectedSavingsAnnual: 274800,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-010",
    type: "pricing_activation",
    status: "under_review",
    productId: "dp-001",
    productName: "Customer 360",
    title: "Activate usage-based pricing for Customer 360 — recover $12K/mo",
    description: "Draft pricing policy ready: $500 base + $1.25/query with 500-query free tier. 340 active consumers across 7 teams. Projected internal recovery of $12K/mo, offsetting 65% of the product's $18.4K/mo cost.",
    initiatedBy: "Strata",
    assignedTo: "Sarah Kim",
    assignedToTitle: "CDO",
    estimatedImpact: 12000,
    actualImpact: null,
    impactBasis: "Usage-based internal chargeback. Projected $12K/mo recovery based on current query volumes and team budgets.",
    createdAt: "2026-02-20T09:00:00Z",
    updatedAt: "2026-02-23T14:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 12000,
    projectedSavingsAnnual: 144000,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-011",
    type: "ai_project_review",
    status: "under_review",
    productId: "dp-013",
    productName: "Churn Predictor Features",
    title: "Review Churn Predictor Features — no declared value, $3.2K/mo spend",
    description: "Draft-stage AI feature set with no value declaration and no production consumers. $3.2K/mo in compute costs with no measurable return. Data Science team has not provided a business case or expected ROI timeline.",
    initiatedBy: "Strata",
    assignedTo: "Lisa Chen",
    assignedToTitle: "Head of AI",
    estimatedImpact: 3200,
    actualImpact: null,
    impactBasis: "Full cost avoidance if project is killed. Alternative: require value declaration within 30 days or auto-sunset.",
    createdAt: "2026-02-08T09:00:00Z",
    updatedAt: "2026-02-22T16:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 3200,
    projectedSavingsAnnual: 38400,
    delayReason: null,
    delayedUntil: null,
  },
  // --- Extended Decisions ---
  ...additionalDecisions,
];

// ============================================================
// Decision Detail Sub-Resources
// ============================================================

export const decisionImpactReports: Record<string, ImpactReport> = {
  "dec-001": {
    decisionId: "dec-001",
    productName: "Test Env Dataset",
    projectedSavingsMonthly: 6100,
    actualSavingsMeasured: 6100,
    varianceFromProjection: 0,
    confidenceScore: 95,
    validationStatus: "confirmed",
    windowComplete: true,
    costTrend: [
      { month: "2025-10", cost: 6100 },
      { month: "2025-11", cost: 6100 },
      { month: "2025-12", cost: 6100 },
      { month: "2026-01", cost: 6100 },
      { month: "2026-02", cost: 0 },
      { month: "2026-03", cost: 0 },
    ],
    narrativeSummary: "Retirement of Test Env Dataset fully confirmed. All $6,100/mo in projected savings realized from February 2026. Compute and pipeline terminated; data archived to cold storage. Zero consumer impact — no downstream breakage detected in 60-day validation window.",
  },
  "dec-002": {
    decisionId: "dec-002",
    productName: "Fraud Detection Feed",
    projectedSavingsMonthly: 8000,
    actualSavingsMeasured: 5200,
    varianceFromProjection: -0.35,
    confidenceScore: 72,
    validationStatus: "validating",
    windowComplete: false,
    costTrend: [
      { month: "2025-11", cost: 22000 },
      { month: "2025-12", cost: 28000 },
      { month: "2026-01", cost: 34000 },
      { month: "2026-02", cost: 28800 },
      { month: "2026-03", cost: 28800 },
    ],
    narrativeSummary: "Cost optimization in progress. Query pattern changes reduced compute from $34K to $28.8K/mo ($5.2K savings). 35% below $8K projection — remaining gap attributed to new fraud detection vectors requiring sustained compute. Validation window closes March 18.",
  },
  "dec-007": {
    decisionId: "dec-007",
    productName: "Product Interaction Events",
    projectedSavingsMonthly: 1100,
    actualSavingsMeasured: 800,
    varianceFromProjection: -0.27,
    confidenceScore: 88,
    validationStatus: "confirmed",
    windowComplete: true,
    costTrend: [
      { month: "2025-11", cost: 13700 },
      { month: "2025-12", cost: 14200 },
      { month: "2026-01", cost: 14800 },
      { month: "2026-02", cost: 14000 },
      { month: "2026-03", cost: 14000 },
    ],
    narrativeSummary: "Reserved instance migration confirmed $800/mo savings (73% of projection). Remaining $300/mo gap is proportional to usage growth — accepted as healthy scaling cost. Product ROI remains strong at 4.1x.",
  },
  "dec-008": {
    decisionId: "dec-008",
    productName: "Legacy CRM Extract",
    projectedSavingsMonthly: 9800,
    actualSavingsMeasured: 9800,
    varianceFromProjection: 0,
    confidenceScore: 98,
    validationStatus: "confirmed",
    windowComplete: true,
    costTrend: [
      { month: "2025-08", cost: 9800 },
      { month: "2025-09", cost: 9800 },
      { month: "2025-10", cost: 9800 },
      { month: "2025-11", cost: 0 },
      { month: "2025-12", cost: 0 },
      { month: "2026-01", cost: 0 },
    ],
    narrativeSummary: "Full retirement confirmed. All $9,800/mo savings realized since November 2025. Consumer migration to Customer 360 completed with zero incidents. Historical data archived per retention policy.",
  },
};

export const decisionComments: Record<string, DecisionComment[]> = {
  "dec-001": [
    {
      id: "cmt-001",
      decisionId: "dec-001",
      userId: "u-cdo",
      userName: "Sarah Kim",
      comment: "Confirmed with platform team — no active pipelines depend on this dataset. Safe to proceed with retirement.",
      createdAt: "2026-01-20T11:30:00Z",
    },
    {
      id: "cmt-002",
      decisionId: "dec-001",
      userId: "u-eng",
      userName: "Mike Johnson",
      comment: "Data archived to S3 Glacier. Compute instances terminated. Pipeline schedules disabled.",
      createdAt: "2026-01-25T16:00:00Z",
    },
    {
      id: "cmt-003",
      decisionId: "dec-001",
      userId: "u-cfo",
      userName: "David Park",
      comment: "Approved. $6.1K/mo savings confirmed in February billing. Adding to board capital summary.",
      createdAt: "2026-01-28T14:00:00Z",
    },
  ],
  "dec-002": [
    {
      id: "cmt-004",
      decisionId: "dec-002",
      userId: "u-risk",
      userName: "Elena Volkov",
      comment: "Initial analysis: 60% of cost spike comes from 3 new real-time fraud pattern queries. These detected $42K in fraudulent transactions last month.",
      createdAt: "2026-02-05T09:00:00Z",
    },
    {
      id: "cmt-005",
      decisionId: "dec-002",
      userId: "u-eng2",
      userName: "Tom Rivera",
      comment: "Rewrote the top 5 expensive queries. Benchmark shows 35% compute reduction without affecting detection latency.",
      createdAt: "2026-02-12T14:30:00Z",
    },
    {
      id: "cmt-006",
      decisionId: "dec-002",
      userId: "u-cfo",
      userName: "David Park",
      comment: "Approved the optimization. Net $5.2K/mo savings while preserving fraud detection capability. Good trade-off.",
      createdAt: "2026-02-18T16:00:00Z",
    },
  ],
  "dec-003": [
    {
      id: "cmt-007",
      decisionId: "dec-003",
      userId: "u-mkt",
      userName: "Jennifer Wu",
      comment: "Migration tracker shows 86 of 89 original consumers moved to Marketing Attribution. 3 remaining use a legacy API endpoint — working on migration path.",
      createdAt: "2026-02-15T10:00:00Z",
    },
  ],
};

export const decisionActions: Record<string, DecisionAction[]> = {
  "dec-001": [
    { id: "act-001", decisionId: "dec-001", userId: "u-system", actionType: "created", payload: null, createdAt: "2026-01-15T09:00:00Z" },
    { id: "act-002", decisionId: "dec-001", userId: "u-cdo", actionType: "commented", payload: null, createdAt: "2026-01-20T11:30:00Z" },
    { id: "act-003", decisionId: "dec-001", userId: "u-eng", actionType: "commented", payload: null, createdAt: "2026-01-25T16:00:00Z" },
    { id: "act-004", decisionId: "dec-001", userId: "u-cfo", actionType: "approved", payload: null, createdAt: "2026-01-28T14:00:00Z" },
  ],
  "dec-002": [
    { id: "act-005", decisionId: "dec-002", userId: "u-system", actionType: "created", payload: null, createdAt: "2026-02-01T10:00:00Z" },
    { id: "act-006", decisionId: "dec-002", userId: "u-risk", actionType: "commented", payload: null, createdAt: "2026-02-05T09:00:00Z" },
    { id: "act-007", decisionId: "dec-002", userId: "u-eng2", actionType: "commented", payload: null, createdAt: "2026-02-12T14:30:00Z" },
    { id: "act-008", decisionId: "dec-002", userId: "u-cfo", actionType: "approved", payload: null, createdAt: "2026-02-18T16:00:00Z" },
  ],
  "dec-003": [
    { id: "act-009", decisionId: "dec-003", userId: "u-system", actionType: "created", payload: null, createdAt: "2026-02-10T09:00:00Z" },
    { id: "act-010", decisionId: "dec-003", userId: "u-mkt", actionType: "commented", payload: null, createdAt: "2026-02-15T10:00:00Z" },
  ],
};

export const decisionEconomicEffects: Record<string, DecisionEconomicEffect[]> = {
  "dec-001": [
    {
      id: "eff-001",
      decisionId: "dec-001",
      effectType: "capital_freed",
      amountUsdMonthly: 3800,
      amountUsdAnnual: 45600,
      confidence: 1.0,
      calcExplainer: "Compute and storage costs eliminated upon retirement. Verified against February billing.",
      createdAt: "2026-01-28T14:00:00Z",
    },
    {
      id: "eff-002",
      decisionId: "dec-001",
      effectType: "cost_saved",
      amountUsdMonthly: 2300,
      amountUsdAnnual: 27600,
      confidence: 0.95,
      calcExplainer: "Pipeline and human maintenance costs saved. Pipeline schedule disabled; team reassigned to Customer 360.",
      createdAt: "2026-01-28T14:00:00Z",
    },
  ],
  "dec-002": [
    {
      id: "eff-003",
      decisionId: "dec-002",
      effectType: "cost_saved",
      amountUsdMonthly: 5200,
      amountUsdAnnual: 62400,
      confidence: 0.85,
      calcExplainer: "Query optimization reduced compute by $5.2K/mo. Remaining cost increase justified by new fraud patterns.",
      createdAt: "2026-02-18T16:00:00Z",
    },
  ],
  "dec-007": [
    {
      id: "eff-004",
      decisionId: "dec-007",
      effectType: "cost_saved",
      amountUsdMonthly: 800,
      amountUsdAnnual: 9600,
      confidence: 0.92,
      calcExplainer: "Reserved compute instance migration. $800/mo savings confirmed over 2 billing cycles.",
      createdAt: "2026-02-10T11:00:00Z",
    },
  ],
  "dec-008": [
    {
      id: "eff-005",
      decisionId: "dec-008",
      effectType: "capital_freed",
      amountUsdMonthly: 9800,
      amountUsdAnnual: 117600,
      confidence: 1.0,
      calcExplainer: "Full cost elimination. All compute, storage, and pipeline costs terminated upon retirement.",
      createdAt: "2025-11-01T14:00:00Z",
    },
  ],
};

// ============================================================
// ROI HISTORY — Never overwrite, always append
// Monthly snapshots of portfolio-level ROI over time
// ============================================================

export const portfolioROIHistory: ROIHistoryPoint[] = [
  { month: "Sep", roi: 2.4, cost: 148000, compositeValue: 355200 },
  { month: "Oct", roi: 2.5, cost: 152000, compositeValue: 380000 },
  { month: "Nov", roi: 2.6, cost: 158000, compositeValue: 410800 },
  { month: "Dec", roi: 2.7, cost: 162000, compositeValue: 437400 },
  { month: "Jan", roi: 2.7, cost: 167000, compositeValue: 450900 },
  { month: "Feb", roi: 2.8, cost: 171400, compositeValue: 479920 },
];

// Per-product ROI history (key products only)
export const productROIHistory: Record<string, ROIHistoryPoint[]> = {
  "dp-001": [
    { month: "Sep", roi: 2.9, cost: 16000, compositeValue: 46400 },
    { month: "Oct", roi: 3.0, cost: 16400, compositeValue: 49200 },
    { month: "Nov", roi: 3.1, cost: 16800, compositeValue: 52080 },
    { month: "Dec", roi: 3.2, cost: 17200, compositeValue: 55040 },
    { month: "Jan", roi: 3.3, cost: 17800, compositeValue: 58740 },
    { month: "Feb", roi: 3.4, cost: 18400, compositeValue: 57800 },
  ],
  "dp-002": [
    { month: "Sep", roi: 3.3, cost: 23000, compositeValue: 75900 },
    { month: "Oct", roi: 3.4, cost: 23200, compositeValue: 78880 },
    { month: "Nov", roi: 3.5, cost: 23400, compositeValue: 81900 },
    { month: "Dec", roi: 3.5, cost: 23600, compositeValue: 82600 },
    { month: "Jan", roi: 3.6, cost: 23900, compositeValue: 86040 },
    { month: "Feb", roi: 3.6, cost: 24200, compositeValue: 88100 },
  ],
  "dp-006": [
    { month: "Sep", roi: 0.4, cost: 14200, compositeValue: 5680 },
    { month: "Oct", roi: 0.3, cost: 14200, compositeValue: 4260 },
    { month: "Nov", roi: 0.2, cost: 14200, compositeValue: 2840 },
    { month: "Dec", roi: 0.1, cost: 14200, compositeValue: 1420 },
    { month: "Jan", roi: 0.08, cost: 14200, compositeValue: 1136 },
    { month: "Feb", roi: 0.07, cost: 14200, compositeValue: 960 },
  ],
};

// ============================================================
// VALUE DECLARATION VERSION HISTORY
// ============================================================

export const valueDeclarationHistory: Record<string, ValueDeclarationVersion[]> = {
  "dp-001": [
    {
      version: 1,
      declaredBy: "Sarah Chen",
      declaredByTitle: "VP Marketing",
      method: "revenue_attribution",
      value: 45000,
      basis: "Initial estimate based on campaign ROI lift from segmentation.",
      declaredAt: "2025-06-01",
      changeNote: null,
    },
    {
      version: 2,
      declaredBy: "Sarah Chen",
      declaredByTitle: "VP Marketing",
      method: "revenue_attribution",
      value: 62000,
      basis: "Drives segmentation for $740K/year campaign spend. Estimated 8% lift = $62K/month attributed value.",
      declaredAt: "2025-12-10",
      changeNote: "Updated based on Q3/Q4 actual campaign performance. Value increased 38% reflecting proven attribution.",
    },
  ],
  "dp-002": [
    {
      version: 1,
      declaredBy: "Michael Torres",
      declaredByTitle: "CFO",
      method: "revenue_attribution",
      value: 80000,
      basis: "Supports $10M quarterly forecasting. Estimated $80K/mo in variance reduction.",
      declaredAt: "2025-03-15",
      changeNote: null,
    },
    {
      version: 2,
      declaredBy: "Michael Torres",
      declaredByTitle: "CFO",
      method: "revenue_attribution",
      value: 95000,
      basis: "Directly supports $12M quarterly revenue forecasting. Accuracy improvements worth $95K/month in reduced variance.",
      declaredAt: "2025-09-15",
      changeNote: "Revenue forecasting scope expanded to $12M quarterly. Variance reduction proved out at $95K/mo.",
    },
  ],
  "dp-005": [
    {
      version: 1,
      declaredBy: "Tom Reed",
      declaredByTitle: "Chief Risk Officer",
      method: "cost_avoidance",
      value: 120000,
      basis: "Prevents est. $120K/month in fraudulent transactions. Based on Q3 detection rate of 94%.",
      declaredAt: "2025-12-01",
      changeNote: null,
    },
  ],
};

// ============================================================
// EXECUTIVE INTELLIGENCE — AI-generated advisory layer
// ============================================================

export const executiveSummary: ExecutiveSummary = {
  generatedAt: "2026-02-23T08:00:00Z",
  confidenceLevel: 0.79,
  confidenceBasis: (() => {
    const active = dataProducts.filter((p) => p.lifecycleStage !== "retired");
    const avgCoverage = Math.round(active.reduce((s, p) => s + p.costCoverage, 0) / active.length * 100);
    const withValue = countProductsWithValue(dataProducts);
    const total = active.length;
    const expiring = dataProducts.filter((p) => p.valueDeclaration?.isExpiring).length;
    return `${avgCoverage}% cost coverage across connectors. ${Math.round((withValue / total) * 100)}% of products (${withValue}/${total}) have declared value. ${expiring} value declarations expiring within 30 days.`;
  })(),
  insights: [
    {
      id: "ei-1",
      type: "insight",
      title: "Portfolio ROI improved 17% over 6 months",
      description: "Weighted portfolio ROI grew from 2.4x to 2.8x since September. Primary drivers: Customer 360 (+17% value), Marketing Attribution adoption (+22% consumers), and Legacy CRM Extract retirement ($9.8K/mo savings realized).",
      productIds: ["dp-001", "dp-010"],
      financialImpact: 24720,
    },
    {
      id: "ei-2",
      type: "insight",
      title: "Growth-stage products account for 32% of spend but 48% of value",
      description: "Customer 360, Product Interaction Events, Pricing Elasticity, and Marketing Attribution collectively cost $55.2K/mo and generate $152K/mo composite value (2.75x blended ROI). Investment in this cohort has the highest marginal return.",
      productIds: ["dp-001", "dp-003", "dp-009", "dp-010"],
      financialImpact: null,
    },
    {
      id: "ei-3",
      type: "insight",
      title: "$29K/mo in spend supports products with <0.1x ROI",
      description: "Legacy Campaign DB ($14.2K), Old Product Catalog ($8.7K), and Test Env Dataset ($6.1K) collectively consume $29K/month with near-zero return. Two are under retirement review. Test Env already approved for decommission.",
      productIds: ["dp-006", "dp-007", "dp-011"],
      financialImpact: 29000,
    },
    {
      id: "ei-4",
      type: "risk",
      title: "Revenue Analytics Hub value declaration expires in 20 days",
      description: "This $95K/mo declared value — the largest in the portfolio — must be revalidated by March 15. If it lapses, portfolio confidence drops to 68% and reported ROI falls from 2.8x to 2.1x. CFO sign-off required.",
      productIds: ["dp-002"],
      financialImpact: -95000,
    },
    {
      id: "ei-5",
      type: "opportunity",
      title: "Reallocating decline-stage spend could add 0.4x to portfolio ROI",
      description: "Moving $22.9K/mo from the bottom ROI quartile (Legacy Campaign, Old Product Catalog) to scale Customer 360 and Marketing Attribution would increase portfolio-weighted ROI from 2.8x to an estimated 3.2x over the next quarter.",
      productIds: ["dp-006", "dp-007", "dp-001", "dp-010"],
      financialImpact: 22900,
    },
  ],
  doNothingProjection: (() => {
    const currentCost = portfolioSummary.totalCost;
    const currentROI = portfolioSummary.averageROI;
    const wastedMonthly = dataProducts
      .filter((p) => p.roi !== null && p.roi < 0.5 && p.lifecycleStage !== "retired")
      .reduce((s, p) => s + p.monthlyCost, 0);
    const valueAtRisk = dataProducts
      .filter((p) => p.valueDeclaration?.isExpiring)
      .reduce((s, p) => s + (p.declaredValue ?? 0), 0);
    return {
      currentMonthlyCost: currentCost,
      projectedMonthlyCost: Math.round(currentCost * 1.1),
      currentROI,
      projectedROI: Math.round((currentROI - 0.5) * 10) / 10,
      projectedWastedSpend: wastedMonthly * 6,
      projectedValueAtRisk: valueAtRisk,
      months: 6,
      assumptions: [
        "Decline-stage products continue at current cost with no retirement",
        "Cost-spike products grow +8% MoM without optimization intervention",
        "Expiring value declarations lapse — declared value drops from totals",
        "Growth-stage products limited by current compute allocation — constrained consumer growth",
        "No new value declarations filed for products lacking them",
      ],
    };
  })(),
};

// ============================================================
// INDUSTRY BENCHMARKS (Beta) — Future moat architecture
// Mocked now, designed for cross-company anonymized data
// ============================================================

export const benchmarkData: BenchmarkDataPoint[] = [
  {
    industry: "retail",
    label: "Retail & E-Commerce",
    medianROI: 2.1,
    medianCostPerConsumer: 82,
    medianPortfolioROI: 1.8,
    p25ROI: 1.2,
    p75ROI: 3.4,
    sampleSize: 142,
  },
  {
    industry: "finance",
    label: "Financial Services",
    medianROI: 3.2,
    medianCostPerConsumer: 145,
    medianPortfolioROI: 2.6,
    p25ROI: 1.8,
    p75ROI: 4.8,
    sampleSize: 198,
  },
  {
    industry: "saas",
    label: "SaaS & Technology",
    medianROI: 2.8,
    medianCostPerConsumer: 64,
    medianPortfolioROI: 2.2,
    p25ROI: 1.5,
    p75ROI: 4.1,
    sampleSize: 256,
  },
  {
    industry: "healthcare",
    label: "Healthcare & Life Sciences",
    medianROI: 1.9,
    medianCostPerConsumer: 210,
    medianPortfolioROI: 1.5,
    p25ROI: 0.8,
    p75ROI: 3.0,
    sampleSize: 87,
  },
];

// ============================================================
// POLICY CONFIGURATION — Organizational rules that create lock-in
// ============================================================

export const policyConfigs: PolicyConfig[] = [
  {
    id: "pol-001",
    name: "ROI Composite Weight — Declared Value",
    description: "Weight given to declared (human-asserted) value in the composite value formula",
    category: "valuation",
    currentValue: "70%",
    defaultValue: "70%",
    updatedAt: "2025-09-15",
    updatedBy: "Michael Torres",
  },
  {
    id: "pol-002",
    name: "ROI Composite Weight — Usage-Implied Value",
    description: "Weight given to usage-implied (system-calculated) value in the composite value formula",
    category: "valuation",
    currentValue: "30%",
    defaultValue: "30%",
    updatedAt: "2025-09-15",
    updatedBy: "Michael Torres",
  },
  {
    id: "pol-003",
    name: "Retirement Trigger — Usage Threshold",
    description: "Products are flagged for retirement when usage drops below this % of peak for 90+ days",
    category: "lifecycle",
    currentValue: "20%",
    defaultValue: "20%",
    updatedAt: "2025-06-01",
    updatedBy: "System Default",
  },
  {
    id: "pol-004",
    name: "Cost Spike Alert Threshold",
    description: "MoM cost increase percentage that triggers a cost investigation workflow",
    category: "cost",
    currentValue: "30%",
    defaultValue: "30%",
    updatedAt: "2025-06-01",
    updatedBy: "System Default",
  },
  {
    id: "pol-005",
    name: "Value Declaration Review Cycle",
    description: "Maximum days before a value declaration must be revalidated",
    category: "governance",
    currentValue: "180 days",
    defaultValue: "180 days",
    updatedAt: "2025-09-15",
    updatedBy: "Michael Torres",
  },
  {
    id: "pol-006",
    name: "Minimum Cost Coverage for Confidence",
    description: "Minimum % of costs that must be tracked by connectors for high-confidence reporting",
    category: "cost",
    currentValue: "85%",
    defaultValue: "80%",
    updatedAt: "2026-01-10",
    updatedBy: "Michael Torres",
  },
  {
    id: "pol-007",
    name: "Low ROI Review Trigger",
    description: "Products with ROI below this threshold for 2+ months trigger a review workflow",
    category: "valuation",
    currentValue: "1.0x",
    defaultValue: "1.0x",
    updatedAt: "2025-06-01",
    updatedBy: "System Default",
  },
];

// ============================================================
// CAPITAL IMPACT — Aggregated financial effects
// All summary values computed from canonical formulas.
// See: /docs/DATA_COHERENCE_CONTRACT.md
// ============================================================

import type { SavingsSummary, CapitalImpactSummary, PricingPolicy, AIProjectScorecard } from "../types";

// Raw capital events — individual amounts and references are ground truth
const _recentEvents: CapitalImpactSummary["recentEvents"] = [
  {
    id: "ce-001",
    decisionId: "dec-001",
    productId: "dp-011",
    eventType: "retirement_freed",
    amount: 6100,
    description: "Retired Test Env Dataset: $6,100/mo compute and storage eliminated",
    effectiveDate: "2026-01-28",
    createdAt: "2026-01-28T14:00:00Z",
  },
  {
    id: "ce-002",
    decisionId: "dec-002",
    productId: "dp-005",
    eventType: "cost_optimization",
    amount: 5200,
    description: "Optimized Fraud Detection Feed queries: $5,200/mo compute savings",
    effectiveDate: "2026-02-18",
    createdAt: "2026-02-18T16:00:00Z",
  },
  {
    id: "ce-003",
    decisionId: "dec-007",
    productId: "dp-003",
    eventType: "cost_optimization",
    amount: 800,
    description: "Reserved compute for Product Interaction Events: $800/mo savings",
    effectiveDate: "2026-02-10",
    createdAt: "2026-02-10T11:00:00Z",
  },
  {
    id: "ce-004",
    decisionId: "dec-008",
    productId: "dp-legacy-1",
    eventType: "retirement_freed",
    amount: 9800,
    description: "Retired Legacy CRM Extract: $9,800/mo freed after migration to Customer 360",
    effectiveDate: "2025-11-01",
    createdAt: "2025-11-01T14:00:00Z",
  },
  {
    id: "ce-007",
    decisionId: "dec-005",
    productId: "dp-002",
    eventType: "reallocation",
    amount: 42000,
    description: "Reallocated legacy warehouse budget to Revenue Analytics Hub scaling: $42,000/mo redirected to high-ROI investment",
    effectiveDate: "2026-01-15",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "ce-008",
    decisionId: "dec-009",
    productId: "dp-013",
    eventType: "ai_spend_reduced",
    amount: 18200,
    description: "Terminated underperforming Churn Predictor GPU cluster after AI Scorecard review: $18,200/mo eliminated",
    effectiveDate: "2026-02-01",
    createdAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "ce-009",
    decisionId: "dec-003",
    productId: "dp-001",
    eventType: "pricing_revenue",
    amount: 8400,
    description: "Customer 360 usage-based pricing activated: $8,400/mo internal cost recovery from 340 consumers",
    effectiveDate: "2026-02-25",
    createdAt: "2026-02-25T09:00:00Z",
  },
  // --- Extended Capital Events ---
  ...additionalCapitalEvents,
];

// Timeline data — derived from capital events (grouped by month, cumulative)
const _capitalFreedByMonth: CapitalImpactSummary["capitalFreedByMonth"] = (() => {
  const byMonth = new Map<string, number>();
  for (const e of _recentEvents) {
    const month = e.effectiveDate.slice(0, 7); // "2026-02-18" → "2026-02"
    byMonth.set(month, (byMonth.get(month) ?? 0) + e.amount);
  }
  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return sorted.map(([month, amount]) => {
    cumulative += amount;
    return { month, amount, cumulative };
  });
})();

// Build canonical CapitalEvents with validation status from decisions
export const capitalEvents: CanonicalCapitalEvent[] = _recentEvents.map((e) => ({
  ...e,
  validationStatus:
    decisions.find((d) => d.id === e.decisionId)?.impactValidationStatus ??
    undefined,
}));

// Compute CEI for use across surfaces (board, capital efficiency)
const _ceiResult = computeCEI({
  products: dataProducts,
  decisions,
  capitalEvents: capitalEvents,
  impactVariances: [0.85], // Average observed projection variance
});

// ---- Savings Summary (canonical) ----
const _savingsBase = computeSavingsSummary(decisions, capitalEvents);

export const savingsSummary: SavingsSummary = {
  ..._savingsBase,
  capitalFreedByMonth: _capitalFreedByMonth,
};

// ---- Capital Impact Summary (canonical) ----
const _capitalImpactBase = computeCapitalImpactSummary(
  dataProducts,
  capitalEvents,
  decisions,
);

export const pricingPolicies: PricingPolicy[] = [
  {
    id: "pp-001",
    productId: "dp-001",
    productName: "Customer 360",
    version: 1,
    model: "usage_based",
    params: '{"baseFee": 500, "perQuery": 1.25, "freeTier": 500}',
    status: "active",
    activatedAt: "2026-02-25T09:00:00Z",
    activatedBy: "Priya Patel",
    projectedRevenue: 12000,
    actualRevenue: 8400,
    preActivationUsage: 340,
    postActivationUsage: 328,
  },
  {
    id: "pp-002",
    productId: "dp-002",
    productName: "Revenue Analytics Hub",
    version: 1,
    model: "tiered",
    params: '{"baseFee": 800, "perSeat": 45, "tiers": [{"min": 1, "max": 50, "rate": 45}, {"min": 51, "max": 200, "rate": 35}]}',
    status: "draft",
    activatedAt: null,
    activatedBy: null,
    projectedRevenue: 9800,
    actualRevenue: null,
    preActivationUsage: 180,
    postActivationUsage: null,
  },
];

const _activePolicies = pricingPolicies.filter((p) => p.status === "active");
export const capitalImpactSummary: CapitalImpactSummary = {
  ..._capitalImpactBase,
  capitalFreedByMonth: _capitalFreedByMonth,
  recentEvents: _recentEvents,
  activePricingPolicies: _activePolicies.length,
  pricingRevenueTotal: _activePolicies.reduce((s, p) => s + (p.actualRevenue ?? p.projectedRevenue ?? 0), 0),
};

// --- Discovery / Candidates ---
import type { CandidateListItem, CandidateDetail } from "@/lib/types";

export const candidatesList: CandidateListItem[] = [
  {
    id: "cand-001",
    candidateType: "semantic_product",
    nameSuggested: "Customer Propensity Model",
    domainSuggested: "Data Science",
    ownerSuggested: "data-science@acme.com",
    confidenceScore: 92,
    status: "new",
    monthlyCostEstimate: 4800,
    monthlyConsumers: 12,
    sourceCount: 7,
    createdAt: "2026-02-22T22:00:00Z",
  },
  {
    id: "cand-002",
    candidateType: "dbt_product",
    nameSuggested: "Revenue Reporting",
    domainSuggested: "Finance",
    ownerSuggested: "finance@acme.com",
    confidenceScore: 75,
    status: "new",
    monthlyCostEstimate: 140.84,
    monthlyConsumers: 4,
    sourceCount: 4,
    createdAt: "2026-02-22T22:00:00Z",
  },
  {
    id: "cand-003",
    candidateType: "semantic_product",
    nameSuggested: "Marketing Performance",
    domainSuggested: "Marketing",
    ownerSuggested: "marketing@acme.com",
    confidenceScore: 55,
    status: "new",
    monthlyCostEstimate: 3200,
    monthlyConsumers: 15,
    sourceCount: 3,
    createdAt: "2026-02-22T22:00:00Z",
  },
  {
    id: "cand-004",
    candidateType: "semantic_product",
    nameSuggested: "Legacy CRM Report",
    domainSuggested: "General",
    ownerSuggested: null,
    confidenceScore: 25,
    status: "new",
    monthlyCostEstimate: 13.60,
    monthlyConsumers: 1,
    sourceCount: 3,
    createdAt: "2026-02-22T22:00:00Z",
  },
  {
    id: "cand-005",
    candidateType: "certified_asset",
    nameSuggested: "Revenue Daily",
    domainSuggested: "Finance",
    ownerSuggested: "finance@acme.com",
    confidenceScore: 50,
    status: "new",
    monthlyCostEstimate: 1800,
    monthlyConsumers: 8,
    sourceCount: 1,
    createdAt: "2026-02-22T22:00:00Z",
  },
];

export const candidateDetails: Record<string, CandidateDetail> = {
  "cand-001": {
    id: "cand-001",
    candidateType: "semantic_product",
    nameSuggested: "Customer Propensity Model",
    domainSuggested: "Data Science",
    ownerSuggested: "data-science@acme.com",
    confidenceScore: 92,
    confidenceBreakdown: { dbt_exposure: 40, databricks_notebook: 30, usage: 15, certified: 12, low_cost_coverage: -5 },
    evidence: {
      dbt_exposure: "dbt-exposure-propensity_model",
      databricks_notebook: "nb-propensity-scoring",
      warehouse_tables: ["sf-tbl-propensity-features", "sf-tbl-propensity-scores", "sf-tbl-customer-segments"],
    },
    status: "new",
    monthlyCostEstimate: 4800,
    monthlyConsumers: 12,
    consumerTeams: [
      { team: "Data Science", consumers: 4 },
      { team: "Marketing Analytics", consumers: 3 },
      { team: "Sales Ops", consumers: 3 },
      { team: "Customer Success", consumers: 2 },
    ],
    costCoveragePct: 0.85,
    sourceCount: 7,
    members: [
      { id: "sa-1", externalId: "nb-propensity-scoring", assetName: "Propensity Scoring Pipeline", assetType: "notebook", platform: "databricks", qualifiedName: "databricks://ml-workspace/propensity-scoring", displayName: "Propensity Scoring Pipeline", ownerHint: "data-science@acme.com", tags: ["ml", "production", "customer"], role: "primary", inclusionReason: "ML training pipeline" },
      { id: "sa-2", externalId: "dbt-exposure-propensity_model", assetName: "propensity_model", assetType: "dbt_exposure", platform: "dbt", qualifiedName: "dbt://exposures/propensity_model", displayName: "Customer Propensity Model", ownerHint: "data-science@acme.com", tags: ["ml", "customer", "certified"], role: "primary", inclusionReason: "exposure declaration" },
      { id: "sa-3", externalId: "sf-tbl-propensity-features", assetName: "propensity_features", assetType: "table", platform: "snowflake", qualifiedName: "PROD_WAREHOUSE.ML.PROPENSITY_FEATURES", displayName: "Propensity Features", ownerHint: "data-science@acme.com", tags: ["ml", "feature-store"], role: "primary", inclusionReason: "feature table" },
      { id: "sa-4", externalId: "sf-tbl-propensity-scores", assetName: "propensity_scores", assetType: "table", platform: "snowflake", qualifiedName: "PROD_WAREHOUSE.ML.PROPENSITY_SCORES", displayName: "Propensity Scores", ownerHint: "data-science@acme.com", tags: ["ml", "production"], role: "derived", inclusionReason: "model output" },
      { id: "sa-5", externalId: "sf-tbl-customer-segments", assetName: "customer_segments", assetType: "table", platform: "snowflake", qualifiedName: "PROD_WAREHOUSE.ML.CUSTOMER_SEGMENTS", displayName: "Customer Segments", ownerHint: "data-science@acme.com", tags: ["ml", "customer"], role: "derived", inclusionReason: "segmentation output" },
    ],
    promotedProductId: null,
    ignoredReason: null,
    createdAt: "2026-02-22T22:00:00Z",
    updatedAt: "2026-02-22T22:00:00Z",
  },
  "cand-004": {
    id: "cand-004",
    candidateType: "semantic_product",
    nameSuggested: "Legacy CRM Report",
    domainSuggested: "General",
    ownerSuggested: null,
    confidenceScore: 25,
    confidenceBreakdown: { powerbi_dataset: 45, no_owner: -20 },
    evidence: {
      powerbi_dataset: "pbi-ds-legacy-crm",
    },
    status: "new",
    monthlyCostEstimate: 13.6,
    monthlyConsumers: 1,
    consumerTeams: [
      { team: "Unknown", consumers: 1 },
    ],
    costCoveragePct: 0.4,
    sourceCount: 3,
    members: [
      { id: "sa-10", externalId: "pbi-ds-legacy-crm", assetName: "Legacy CRM Extract", assetType: "dataset", platform: "powerbi", qualifiedName: null, displayName: "Legacy CRM Extract", ownerHint: null, tags: ["legacy"], role: "consumption", inclusionReason: "Power BI consumption layer" },
      { id: "sa-11", externalId: "sf-tbl-legacy-crm-extract", assetName: "legacy_crm_extract", assetType: "table", platform: "snowflake", qualifiedName: "PROD_WAREHOUSE.RAW.LEGACY_CRM_EXTRACT", displayName: "Legacy CRM Extract", ownerHint: null, tags: ["legacy", "deprecated"], role: "primary", inclusionReason: "warehouse table" },
      { id: "sa-12", externalId: "sf-tbl-crm-contacts", assetName: "crm_contacts", assetType: "table", platform: "snowflake", qualifiedName: "PROD_WAREHOUSE.RAW.CRM_CONTACTS", displayName: "CRM Contacts", ownerHint: null, tags: ["legacy", "pii"], role: "primary", inclusionReason: "warehouse table" },
    ],
    promotedProductId: null,
    ignoredReason: null,
    createdAt: "2026-02-22T22:00:00Z",
    updatedAt: "2026-02-22T22:00:00Z",
  },
};

// Helper to pull financial data from products (ensures scorecard stays in sync)
function _productFinancials(productId: string): { monthlyCost: number; monthlyValue: number; roi: number | null } {
  const p = dataProducts.find((dp) => dp.id === productId);
  if (!p) return { monthlyCost: 0, monthlyValue: 0, roi: null };
  return { monthlyCost: p.monthlyCost, monthlyValue: p.compositeValue, roi: p.roi };
}

// AI Scorecard — only genuinely AI/ML products
// Risk distribution: 1 critical, 1 high, 2 medium, 3 low — tells a governance story
export const aiScorecards: AIProjectScorecard[] = [
  // Critical: Churn Predictor — burning GPU budget, zero documented business value, no clear owner
  { id: "sc-001", productId: "dp-013", productName: "Churn Predictor Features", costScore: 18, valueScore: 5, confidenceScore: 12, roiScore: 0, dependencyRiskScore: 92, compositeScore: 18.7, riskLevel: "critical", ..._productFinancials("dp-013"), flaggedForReview: true, decisionId: null, reviewedAt: null },
  // High: Social Media Sentiment Feed — GPU-heavy NLP, unproven ROI, scaling costs
  { id: "sc-002", productId: "dp-029", productName: "Social Media Sentiment Feed", costScore: 38, valueScore: 30, confidenceScore: 35, roiScore: 22, dependencyRiskScore: 78, compositeScore: 35.2, riskLevel: "high", ..._productFinancials("dp-029"), flaggedForReview: true, decisionId: null, reviewedAt: null },
  // Medium: AI Feature Store — good infrastructure but cost trend concerning
  { id: "sc-003", productId: "dp-014", productName: "AI Feature Store", costScore: 55, valueScore: 62, confidenceScore: 58, roiScore: 52, dependencyRiskScore: 65, compositeScore: 57.4, riskLevel: "medium", ..._productFinancials("dp-014"), flaggedForReview: false, decisionId: null, reviewedAt: null },
  // Medium: Customer Lifetime Value Model — valuable but needs validation
  { id: "sc-004", productId: "dp-031", productName: "Customer Lifetime Value Model", costScore: 60, valueScore: 72, confidenceScore: 55, roiScore: 65, dependencyRiskScore: 70, compositeScore: 63.8, riskLevel: "medium", ..._productFinancials("dp-031"), flaggedForReview: false, decisionId: null, reviewedAt: null },
  // Low: Fraud Detection Feed — high-value ML with proven business impact
  { id: "sc-005", productId: "dp-005", productName: "Fraud Detection Feed", costScore: 72, valueScore: 95, confidenceScore: 88, roiScore: 82, dependencyRiskScore: 45, compositeScore: 79.2, riskLevel: "low", ..._productFinancials("dp-005"), flaggedForReview: false, decisionId: null, reviewedAt: null },
  // Low: Pricing Elasticity Model — strong ROI, well-governed
  { id: "sc-006", productId: "dp-009", productName: "Pricing Elasticity Model", costScore: 78, valueScore: 82, confidenceScore: 75, roiScore: 85, dependencyRiskScore: 40, compositeScore: 76.5, riskLevel: "low", ..._productFinancials("dp-009"), flaggedForReview: false, decisionId: null, reviewedAt: null },
  // Low: Inventory Forecast — operational ML with stable costs
  { id: "sc-007", productId: "dp-012", productName: "Inventory Forecast", costScore: 80, valueScore: 68, confidenceScore: 72, roiScore: 70, dependencyRiskScore: 55, compositeScore: 70.9, riskLevel: "low", ..._productFinancials("dp-012"), flaggedForReview: false, decisionId: null, reviewedAt: null },
];

export const orgInfo: OrgInfo = {
  name: "Acme Corp",
  slug: "acme",
  industry: "saas",
  teamCount: 12,
  userCount: 48,
  roleCount: 5,
  valueWeights: "70/30 declared/usage",
};

// ---- Display Configuration (centralized UI thresholds) ----

export const displayConfig: DisplayConfig = {
  roiBands: { high: ROI_BANDS.high, healthy: ROI_BANDS.healthy },
  trustScoreBands: { high: 0.9, medium: 0.7 },
  confidenceScoreBands: { green: 80, blue: 60, amber: 40 },
  aiRiskScoreBands: { low: 70, medium: 50, high: 30 },
  pricingSimulationDefaults: {
    markup: 25,
    baseFee: 500,
    perQuery: 1.25,
    freeTier: 500,
    adoptionSlider: 12,
  },
  teamBudgetThreshold: { amount: 4500 },
};

// ---- Capital Efficiency Index ----

export const capitalEfficiency: CEIResponse = {
  score: _ceiResult.score,
  components: _ceiResult.components,
  // Narrative trend — historical CEI progression
  trend: [
    { month: "2025-09-01", average_roi: 2.1, capital_freed_cumulative: 0 },
    { month: "2025-10-01", average_roi: 2.15, capital_freed_cumulative: 0 },
    { month: "2025-11-01", average_roi: 2.2, capital_freed_cumulative: 9800 },
    { month: "2025-12-01", average_roi: 2.25, capital_freed_cumulative: 9800 },
    { month: "2026-01-01", average_roi: 2.3, capital_freed_cumulative: 15900 },
    { month: "2026-02-01", average_roi: 2.35, capital_freed_cumulative: 21900 },
  ],
  benchmark_comparison: [
    { industry: "retail", label: "Retail", median_portfolio_roi: 1.8 },
    { industry: "finance", label: "Financial Services", median_portfolio_roi: 2.1 },
    { industry: "saas", label: "SaaS", median_portfolio_roi: 2.5 },
    { industry: "healthcare", label: "Healthcare", median_portfolio_roi: 1.5 },
  ],
};

// ---- Capital Behavior ----

export const capitalBehavior: CapitalBehavior = computeCapitalBehavior(
  dataProducts,
  decisions,
);

// ---- Portfolio Rebalance ----

export const portfolioRebalance: PortfolioRebalance = computePortfolioRebalance(
  dataProducts,
);

// ---- Board Capital Summary ----

export const boardCapitalSummary: BoardCapitalSummary = {
  ...computeBoardSummary(dataProducts, capitalEvents, _ceiResult.score),
  // Narrative override for ROI delta (historical comparison)
  portfolioRoiDelta: 0.15,
  topCapitalActions: capitalEvents
    .map((e) => {
      const dec = decisions.find((d) => d.id === e.decisionId);
      return {
        decisionId: e.decisionId,
        productName: dec?.productName ?? "Unknown",
        decisionType: dec?.type ?? "cost_investigation",
        capitalFreed: e.amount,
        status: (e.validationStatus === "confirmed" ? "confirmed" : "validating") as string,
        resolvedAt: dec?.resolvedAt ?? e.effectiveDate + "T00:00:00Z",
      };
    })
    .sort((a, b) => b.capitalFreed - a.capitalFreed),
};

// ---- Capital Projection (36-month forward simulation) ----

const PROJECTION_BASE = (() => {
  const active = dataProducts.filter((p) => p.lifecycleStage !== "retired");
  const totalCostMonthly = active.reduce((s, p) => s + p.monthlyCost, 0);
  const totalValueMonthly = active.reduce((s, p) => s + p.compositeValue, 0);
  const declineProducts = active.filter((p) => p.lifecycleStage === "decline");
  const declineCostMonthly = declineProducts.reduce((s, p) => s + p.monthlyCost, 0);
  const aiProducts = active.filter((p) =>
    p.name.toLowerCase().includes("ai") || p.name.toLowerCase().includes("ml") || p.name.toLowerCase().includes("feature store"),
  );
  const aiSpendMonthly = aiProducts.reduce((s, p) => s + p.monthlyCost, 0);
  const flaggedScorecards = aiScorecards.filter((s) => s.flaggedForReview);
  const aiFlaggedCostMonthly = flaggedScorecards.reduce((s, sc) => s + sc.monthlyCost, 0);
  const retirementCandidates = active.filter((p) => p.isRetirementCandidate);

  return {
    totalCost: totalCostMonthly * 12,
    totalValue: totalValueMonthly * 12,
    averageRoi: totalCostMonthly > 0 ? Math.round((totalValueMonthly / totalCostMonthly) * 100) / 100 : 0,
    aiSpend: aiSpendMonthly * 12,
    declineCost: declineCostMonthly * 12,
    nonDeclineCost: (totalCostMonthly - declineCostMonthly) * 12,
    avgDeclineCost: declineProducts.length > 0 ? Math.round((declineCostMonthly / declineProducts.length) * 12) : 84_000,
    aiFlaggedCost: aiFlaggedCostMonthly * 12,
    retirementBacklog: retirementCandidates.length,
    ceiScore: _ceiResult.score,
    pricingRevenue: pricingPolicies.reduce((s, pp) => s + (pp.projectedRevenue ?? 0), 0),
    capitalFreedCumulative: computeCapitalFreed(capitalEvents),
    decisionVelocityDays: computeDecisionVelocity(decisions),
    valueCoveragePct: Math.round((countProductsWithValue(dataProducts) / active.length) * 100),
    enforcementRate: 18, // Policy enforcement — no source data yet, keep as config
  };
})();

function buildPassiveMonths(): ProjectionMonth[] {
  const b = PROJECTION_BASE;
  const months: ProjectionMonth[] = [];
  let ai = b.aiSpend;
  let declineC = b.declineCost;
  let nonDeclineC = b.nonDeclineCost;
  let backlog = b.retirementBacklog;
  let cei = b.ceiScore;
  let freed = b.capitalFreedCumulative;
  let govScore = 62;

  for (let m = 1; m <= 36; m++) {
    ai *= 1.08;
    declineC *= 0.98;
    nonDeclineC *= 1.015;
    if (m % 3 === 0) backlog += 2;
    cei = Math.max(0, cei - 0.5);
    govScore = Math.max(0, govScore - 0.4);

    const cost = nonDeclineC + declineC + ai;
    const value = b.totalValue * (1 - 0.005 * m / 36) - b.declineCost * 0.3 * 0.01 * m;
    const roi = cost > 0 ? value / cost : 0;

    months.push({
      month: m,
      projectedCost: Math.round(cost),
      projectedValue: Math.round(Math.max(value, 0)),
      projectedRoi: parseFloat(roi.toFixed(4)),
      projectedCei: parseFloat(cei.toFixed(1)),
      capitalLiability: 0,
      aiSpend: Math.round(ai),
      retirementBacklog: backlog,
      governanceScore: parseFloat(govScore.toFixed(1)),
      capitalFreedCumulative: Math.round(freed),
      missedCapitalFreed: 0,
    });
  }
  return months;
}

function buildGovernanceMonths(): ProjectionMonth[] {
  const b = PROJECTION_BASE;
  const months: ProjectionMonth[] = [];
  let ai = b.aiSpend;
  let declineC = b.declineCost;
  let nonDeclineC = b.nonDeclineCost;
  let backlog = b.retirementBacklog;
  let cei = b.ceiScore;
  let freed = b.capitalFreedCumulative;
  let govScore = 62;
  const velFactor = Math.min(1, 14 / b.decisionVelocityDays);
  let flaggedCost = b.declineCost * 0.3;

  for (let m = 1; m <= 36; m++) {
    ai *= 1.08;
    const retiredThisMonth = velFactor * Math.max(backlog, 0) * 0.15;
    const retireSavings = retiredThisMonth * b.avgDeclineCost;
    declineC = Math.max(0, declineC * 0.98 - retireSavings);
    const optSavings = flaggedCost * 0.05;
    flaggedCost = Math.max(0, flaggedCost - optSavings);
    nonDeclineC = nonDeclineC * 1.015 - optSavings * 0.5;
    if (m % 3 === 0) backlog = Math.max(0, backlog + 2 - Math.floor(retiredThisMonth * 3));
    cei = Math.max(0, cei - 0.25);
    govScore = Math.max(0, Math.min(100, govScore - 0.15));
    freed += retireSavings + optSavings;

    const cost = nonDeclineC + declineC + ai;
    const value = b.totalValue * (1 - 0.002 * m / 36);
    const roi = cost > 0 ? value / cost : 0;

    months.push({
      month: m,
      projectedCost: Math.round(cost),
      projectedValue: Math.round(Math.max(value, 0)),
      projectedRoi: parseFloat(roi.toFixed(4)),
      projectedCei: parseFloat(cei.toFixed(1)),
      capitalLiability: 0,
      aiSpend: Math.round(ai),
      retirementBacklog: backlog,
      governanceScore: parseFloat(govScore.toFixed(1)),
      capitalFreedCumulative: Math.round(freed),
      missedCapitalFreed: 0,
    });
  }
  return months;
}

function buildActiveMonths(): ProjectionMonth[] {
  const b = PROJECTION_BASE;
  const months: ProjectionMonth[] = [];
  let ai = b.aiSpend;
  let declineC = b.declineCost;
  let nonDeclineC = b.nonDeclineCost;
  let backlog = b.retirementBacklog;
  let cei = b.ceiScore;
  let freed = b.capitalFreedCumulative;
  let govScore = 62;
  let vel = b.decisionVelocityDays;
  let flaggedCost = b.declineCost * 0.3;
  let pricingRev = b.pricingRevenue;
  let value = b.totalValue;
  let reallocBenefit = b.declineCost * 0.05;
  const aiKillPerMonth = b.aiFlaggedCost / 3;

  for (let m = 1; m <= 36; m++) {
    vel = Math.max(14, vel - 1);
    const velFactor = Math.min(1, 14 / vel);

    if (m <= 3 && aiKillPerMonth > 0) {
      ai = Math.max(0, ai - aiKillPerMonth);
      freed += aiKillPerMonth;
    }
    ai *= 1.04; // Growth halved under active management

    const retiredThisMonth = velFactor * Math.max(backlog, 0) * 0.25;
    const retireSavings = retiredThisMonth * b.avgDeclineCost;
    declineC = Math.max(0, declineC * 0.98 - retireSavings);
    const optSavings = flaggedCost * 0.05 * 1.5;
    flaggedCost = Math.max(0, flaggedCost - optSavings);
    nonDeclineC = nonDeclineC * (1 + 0.015 * 0.7) - optSavings * 0.5;
    pricingRev *= 1.03;
    value += reallocBenefit * 0.3;
    reallocBenefit *= 0.98;

    if (m % 3 === 0) backlog = Math.max(0, backlog - Math.floor(retiredThisMonth * 3));
    cei = Math.min(95, cei + 0.8);
    govScore = Math.min(95, govScore + 0.3);
    freed += retireSavings + optSavings + pricingRev;

    const cost = nonDeclineC + declineC + ai;
    const projValue = value * (1 + 0.001 * m / 36);
    const roi = cost > 0 ? projValue / cost : 0;

    months.push({
      month: m,
      projectedCost: Math.round(cost),
      projectedValue: Math.round(Math.max(projValue, 0)),
      projectedRoi: parseFloat(roi.toFixed(4)),
      projectedCei: parseFloat(cei.toFixed(1)),
      capitalLiability: 0,
      aiSpend: Math.round(ai),
      retirementBacklog: backlog,
      governanceScore: parseFloat(govScore.toFixed(1)),
      capitalFreedCumulative: Math.round(freed),
      missedCapitalFreed: 0,
    });
  }
  return months;
}

function buildCapitalProjection(): CapitalProjectionResponse {
  const passive = buildPassiveMonths();
  const governance = buildGovernanceMonths();
  const active = buildActiveMonths();

  // Compute derived: capital_liability and missed_capital_freed
  let cumLiabilityP = 0;
  let cumLiabilityG = 0;
  for (let i = 0; i < 36; i++) {
    cumLiabilityP += passive[i].projectedCost - active[i].projectedCost;
    cumLiabilityG += governance[i].projectedCost - active[i].projectedCost;
    passive[i].capitalLiability = Math.round(cumLiabilityP);
    governance[i].capitalLiability = Math.round(cumLiabilityG);
    passive[i].missedCapitalFreed = Math.round(active[i].capitalFreedCumulative - passive[i].capitalFreedCumulative);
    governance[i].missedCapitalFreed = Math.round(active[i].capitalFreedCumulative - governance[i].capitalFreedCumulative);
  }

  const p12 = passive[11], a12 = active[11];
  const p24 = passive[23], a24 = active[23];
  const p36 = passive[35], a36 = active[35];

  return {
    scenarios: {
      passive: { label: "Passive Mode", months: passive },
      governance: { label: "Governance Mode", months: governance },
      active: { label: "Active Capital Mode", months: active },
    },
    driftDelta: {
      roiDrift12m: parseFloat((p12.projectedRoi - a12.projectedRoi).toFixed(4)),
      roiDrift24m: parseFloat((p24.projectedRoi - a24.projectedRoi).toFixed(4)),
      roiDrift36m: parseFloat((p36.projectedRoi - a36.projectedRoi).toFixed(4)),
      costDrift12m: Math.round(p12.projectedCost - a12.projectedCost),
      liability12m: p12.capitalLiability,
      liability24m: p24.capitalLiability,
      liability36m: p36.capitalLiability,
    },
    liabilityEstimate: {
      totalPassiveLiability36m: p36.capitalLiability,
      totalGovernanceGap36m: governance[35].capitalLiability,
      capitalFreedActive36m: a36.capitalFreedCumulative,
      aiExposurePassive36m: Math.round(p36.aiSpend * 36),
    },
    currentSnapshot: {
      totalCost: PROJECTION_BASE.totalCost,
      totalValue: PROJECTION_BASE.totalValue,
      averageRoi: PROJECTION_BASE.averageRoi,
      aiSpend: PROJECTION_BASE.aiSpend,
      declineCost: PROJECTION_BASE.declineCost,
      decisionVelocityDays: PROJECTION_BASE.decisionVelocityDays,
      valueCoveragePct: PROJECTION_BASE.valueCoveragePct,
      enforcementRate: PROJECTION_BASE.enforcementRate,
      retirementBacklog: PROJECTION_BASE.retirementBacklog,
      ceiScore: PROJECTION_BASE.ceiScore,
    },
  };
}

export const capitalProjection: CapitalProjectionResponse = buildCapitalProjection();
