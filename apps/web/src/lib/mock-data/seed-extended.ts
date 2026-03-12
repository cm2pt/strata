// ============================================================
// Strata — Extended Seed Data
// Anchor narratives + long-tail generator for enterprise-scale demo
// ============================================================

import type {
  DataProduct,
  Decision,
  CostTrendPoint,
  UsageTrendPoint,
  Owner,
  Platform,
  LifecycleStage,
  ValueDeclaration,
  ConsumerTeam,
} from "../types";

import {
  computeCompositeValue,
  computeProductROI,
  classifyROI as canonicalClassifyROI,
} from "@/lib/metrics/canonical";

// ---- Helpers ----

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function splitCost(total: number, seed: number) {
  const c = Math.round(total * (0.30 + seededRandom(seed) * 0.25));
  const s = Math.round(total * (0.10 + seededRandom(seed + 1) * 0.15));
  const p = Math.round(total * (0.15 + seededRandom(seed + 2) * 0.15));
  return { compute: c, storage: s, pipeline: p, humanEstimate: total - c - s - p };
}

const TEAMS = [
  "Marketing Analytics", "Sales Ops", "Customer Success", "Data Science",
  "Product", "Finance", "Engineering", "Leadership", "Operations",
  "Legal", "HR Analytics", "Risk & Compliance", "Supply Chain",
  "Partnerships", "Growth", "Support Analytics", "Platform Engineering",
  "Revenue Ops", "Business Intelligence", "Strategy",
];

function makeTeams(total: number, seed: number, count = 4): ConsumerTeam[] {
  const n = Math.min(count, TEAMS.length);
  const start = Math.floor(seededRandom(seed * 7) * (TEAMS.length - n));
  const teams: ConsumerTeam[] = [];
  let left = total;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const c = isLast ? left : Math.max(1, Math.round(left * (0.2 + seededRandom(seed + i + 50) * 0.35)));
    left = Math.max(0, left - c);
    teams.push({
      name: TEAMS[(start + i) % TEAMS.length],
      consumers: c,
      percentage: Math.round((c / total) * 100),
    });
  }
  return teams.sort((a, b) => b.consumers - a.consumers);
}

const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

function makeCostTrend(base: number, growth: number, seed: number): CostTrendPoint[] {
  return months.map((m, i) => ({
    month: m,
    cost: Math.round(base * (1 + growth * i) * 100) / 100,
    value: Math.round(base * (1 + growth * i) * (2 + seededRandom(seed + i)) * 100) / 100,
  }));
}

function makeUsageTrend(base: number, growth: number, seed: number): UsageTrendPoint[] {
  return months.map((m, i) => ({
    month: m,
    consumers: Math.round(base * (1 + growth * i)),
    queries: Math.round(base * (1 + growth * i) * (30 + seededRandom(seed + i) * 30)),
  }));
}

// ---- Product Builder ----

interface ProductSpec {
  id: string;
  name: string;
  domain: string;
  businessUnit: string;
  owner: Owner;
  platform: Platform;
  lifecycleStage: LifecycleStage;
  monthlyCost: number;
  costBreakdown?: { compute: number; storage: number; pipeline: number; humanEstimate: number };
  declaredValue: number | null;
  usageImpliedValue: number;
  monthlyConsumers: number;
  teamCount?: number;
  freshnessHours: number;
  freshnessSLA: number;
  completeness: number;
  accuracy: number;
  trustScore: number;
  costTrendPct: number;
  costCoverage: number;
  usageTrend: number;
  peakConsumers: number;
  isPublished: boolean;
  isCertified: boolean;
  subscriptionCount: number;
  valueDeclaration: ValueDeclaration | null;
  downstreamProducts: number;
  downstreamModels: number;
  downstreamDashboards: number;
  isRetirementCandidate: boolean;
  hasCostSpike: boolean;
  hasUsageDecline: boolean;
  createdAt: string;
  updatedAt: string;
}

function build(s: ProductSpec): DataProduct {
  const compositeValue = computeCompositeValue(s.declaredValue, s.usageImpliedValue);
  const roi = computeProductROI(compositeValue, s.monthlyCost);
  const seed = parseInt(s.id.replace("dp-", ""), 10);
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    businessUnit: s.businessUnit,
    owner: s.owner,
    platform: s.platform,
    lifecycleStage: s.lifecycleStage,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    monthlyCost: s.monthlyCost,
    costBreakdown: s.costBreakdown ?? splitCost(s.monthlyCost, seed),
    declaredValue: s.declaredValue,
    usageImpliedValue: s.usageImpliedValue,
    compositeValue,
    roi,
    roiBand: canonicalClassifyROI(roi) ?? "critical",
    costTrend: s.costTrendPct,
    costCoverage: s.costCoverage,
    monthlyConsumers: s.monthlyConsumers,
    totalQueries: Math.round(s.monthlyConsumers * 45),
    consumerTeams: makeTeams(s.monthlyConsumers, seed, s.teamCount ?? 4),
    usageTrend: s.usageTrend,
    peakConsumers: s.peakConsumers,
    freshnessHours: s.freshnessHours,
    freshnessSLA: s.freshnessSLA,
    completeness: s.completeness,
    accuracy: s.accuracy,
    trustScore: s.trustScore,
    isPublished: s.isPublished,
    isCertified: s.isCertified,
    subscriptionCount: s.subscriptionCount,
    valueDeclaration: s.valueDeclaration,
    downstreamProducts: s.downstreamProducts,
    downstreamModels: s.downstreamModels,
    downstreamDashboards: s.downstreamDashboards,
    isRetirementCandidate: s.isRetirementCandidate,
    hasCostSpike: s.hasCostSpike,
    hasUsageDecline: s.hasUsageDecline,
    inferredValue: null, // Hydrated by seed.ts hydrateInference()
    valueSource: s.declaredValue !== null ? "declared" : "inferred",
  };
}

// ============================================================
// ANCHOR PRODUCTS — 8 hand-crafted enterprise narratives
// ============================================================

export const anchorProducts: DataProduct[] = [
  // ── 1. The AI Governance Story ──
  build({
    id: "dp-014",
    name: "AI Feature Store",
    domain: "Machine Learning",
    businessUnit: "Data Science",
    owner: { id: "u-20", name: "Sophia Martinez", title: "ML Platform Lead", team: "AI & ML" },
    platform: "databricks",
    lifecycleStage: "growth",
    monthlyCost: 28500,
    costBreakdown: { compute: 14200, storage: 3800, pipeline: 6500, humanEstimate: 4000 },
    declaredValue: 95000,
    usageImpliedValue: 72000,
    monthlyConsumers: 85,
    teamCount: 5,
    freshnessHours: 2,
    freshnessSLA: 6,
    completeness: 0.96,
    accuracy: 0.94,
    trustScore: 0.88,
    costTrendPct: 12,
    costCoverage: 0.94,
    usageTrend: 18,
    peakConsumers: 92,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 8,
    valueDeclaration: {
      declaredBy: "Sophia Martinez",
      declaredByTitle: "ML Platform Lead",
      method: "revenue_attribution",
      value: 95000,
      basis: "ML model-powered recommendations drive $95K/mo attributed revenue uplift across pricing and personalization.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-11-15",
      nextReview: "2026-05-15",
      isExpiring: false,
    },
    downstreamProducts: 6,
    downstreamModels: 12,
    downstreamDashboards: 3,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
    createdAt: "2025-06-01",
    updatedAt: "2026-02-20T10:15:00Z",
  }),

  // ── 2. The Compliance Imperative ──
  build({
    id: "dp-015",
    name: "Regulatory Compliance Feed",
    domain: "Risk & Compliance",
    businessUnit: "Legal & Compliance",
    owner: { id: "u-21", name: "Benjamin Okonjo", title: "Compliance Data Manager", team: "Legal & Compliance" },
    platform: "snowflake",
    lifecycleStage: "mature",
    monthlyCost: 9800,
    costBreakdown: { compute: 3200, storage: 2800, pipeline: 2200, humanEstimate: 1600 },
    declaredValue: 180000,
    usageImpliedValue: 25000,
    monthlyConsumers: 42,
    teamCount: 3,
    freshnessHours: 0.5,
    freshnessSLA: 1,
    completeness: 0.999,
    accuracy: 0.998,
    trustScore: 0.95,
    costTrendPct: 1,
    costCoverage: 0.98,
    usageTrend: 2,
    peakConsumers: 45,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 4,
    valueDeclaration: {
      declaredBy: "Benjamin Okonjo",
      declaredByTitle: "Compliance Data Manager",
      method: "compliance",
      value: 180000,
      basis: "Regulatory penalty avoidance: non-compliance fines estimated at $2.16M/yr. Feed prevents $180K/mo risk.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-10-01",
      nextReview: "2026-04-01",
      isExpiring: false,
    },
    downstreamProducts: 2,
    downstreamModels: 0,
    downstreamDashboards: 5,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
    createdAt: "2024-03-15",
    updatedAt: "2026-02-22T08:00:00Z",
  }),

  // ── 3. The Streaming Cost Challenge ──
  build({
    id: "dp-016",
    name: "Real-Time Clickstream",
    domain: "Digital Analytics",
    businessUnit: "Product",
    owner: { id: "u-22", name: "Yuki Tanaka", title: "Streaming Platform Lead", team: "Real-Time Systems" },
    platform: "databricks",
    lifecycleStage: "growth",
    monthlyCost: 32400,
    costBreakdown: { compute: 18500, storage: 4200, pipeline: 7300, humanEstimate: 2400 },
    declaredValue: 68000,
    usageImpliedValue: 55000,
    monthlyConsumers: 120,
    teamCount: 6,
    freshnessHours: 0.1,
    freshnessSLA: 0.5,
    completeness: 0.94,
    accuracy: 0.91,
    trustScore: 0.85,
    costTrendPct: 38,
    costCoverage: 0.92,
    usageTrend: 25,
    peakConsumers: 135,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 10,
    valueDeclaration: {
      declaredBy: "Yuki Tanaka",
      declaredByTitle: "Streaming Platform Lead",
      method: "revenue_attribution",
      value: 68000,
      basis: "Powers real-time personalization engine. A/B tests show 12% conversion uplift = $68K/mo revenue.",
      status: ["peer_reviewed"],
      declaredAt: "2025-12-01",
      nextReview: "2026-06-01",
      isExpiring: false,
    },
    downstreamProducts: 4,
    downstreamModels: 3,
    downstreamDashboards: 8,
    isRetirementCandidate: false,
    hasCostSpike: true,
    hasUsageDecline: false,
    createdAt: "2025-04-10",
    updatedAt: "2026-02-22T16:30:00Z",
  }),

  // ── 4. The Executive Visibility ──
  build({
    id: "dp-017",
    name: "Executive Dashboard Feed",
    domain: "Business Intelligence",
    businessUnit: "Office of the CFO",
    owner: { id: "u-23", name: "Chris Patterson", title: "BI Director", team: "Business Intelligence" },
    platform: "power_bi",
    lifecycleStage: "mature",
    monthlyCost: 4200,
    costBreakdown: { compute: 1200, storage: 800, pipeline: 1100, humanEstimate: 1100 },
    declaredValue: 35000,
    usageImpliedValue: 42000,
    monthlyConsumers: 28,
    teamCount: 3,
    freshnessHours: 1,
    freshnessSLA: 2,
    completeness: 0.997,
    accuracy: 0.996,
    trustScore: 0.98,
    costTrendPct: 0,
    costCoverage: 0.90,
    usageTrend: 3,
    peakConsumers: 32,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 3,
    valueDeclaration: {
      declaredBy: "Michael Torres",
      declaredByTitle: "CFO",
      method: "strategic",
      value: 35000,
      basis: "Primary decision-support feed for C-suite. Enables data-driven board reporting and strategic planning.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-09-01",
      nextReview: "2026-03-01",
      isExpiring: true,
    },
    downstreamProducts: 1,
    downstreamModels: 0,
    downstreamDashboards: 14,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
    createdAt: "2024-01-20",
    updatedAt: "2026-02-21T07:00:00Z",
  }),

  // ── 5. The Legacy Retirement Win ──
  build({
    id: "dp-018",
    name: "Legacy HR Data Extract",
    domain: "Human Resources",
    businessUnit: "HR",
    owner: { id: "u-24", name: "Fatima Al-Hassan", title: "HR Analytics Manager", team: "People Analytics" },
    platform: "s3",
    lifecycleStage: "decline",
    monthlyCost: 11600,
    costBreakdown: { compute: 3400, storage: 4200, pipeline: 2100, humanEstimate: 1900 },
    declaredValue: null,
    usageImpliedValue: 4800,
    monthlyConsumers: 8,
    teamCount: 2,
    freshnessHours: 48,
    freshnessSLA: 72,
    completeness: 0.78,
    accuracy: 0.82,
    trustScore: 0.55,
    costTrendPct: -2,
    costCoverage: 0.72,
    usageTrend: -35,
    peakConsumers: 45,
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
    createdAt: "2022-06-01",
    updatedAt: "2026-01-15T12:00:00Z",
  }),

  // ── 6. The Cross-Functional Value Driver ──
  build({
    id: "dp-019",
    name: "Partner Revenue Attribution",
    domain: "Revenue Analytics",
    businessUnit: "Partnerships",
    owner: { id: "u-25", name: "Raj Sundaram", title: "Revenue Ops Lead", team: "Revenue Operations" },
    platform: "snowflake",
    lifecycleStage: "growth",
    monthlyCost: 15800,
    costBreakdown: { compute: 6200, storage: 2400, pipeline: 4300, humanEstimate: 2900 },
    declaredValue: 82000,
    usageImpliedValue: 58000,
    monthlyConsumers: 95,
    teamCount: 6,
    freshnessHours: 4,
    freshnessSLA: 8,
    completeness: 0.95,
    accuracy: 0.93,
    trustScore: 0.90,
    costTrendPct: 8,
    costCoverage: 0.91,
    usageTrend: 15,
    peakConsumers: 102,
    isPublished: true,
    isCertified: true,
    subscriptionCount: 7,
    valueDeclaration: {
      declaredBy: "Raj Sundaram",
      declaredByTitle: "Revenue Ops Lead",
      method: "revenue_attribution",
      value: 82000,
      basis: "Partner channel drives $4.2M/yr. Attribution model credits data product with 23% of channel optimization.",
      status: ["peer_reviewed", "cfo_acknowledged"],
      declaredAt: "2025-08-15",
      nextReview: "2026-02-28",
      isExpiring: true,
    },
    downstreamProducts: 3,
    downstreamModels: 2,
    downstreamDashboards: 9,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
    createdAt: "2025-02-01",
    updatedAt: "2026-02-22T14:00:00Z",
  }),

  // ── 7. The Cost Spike Alert ──
  build({
    id: "dp-020",
    name: "API Usage Analytics",
    domain: "Platform Engineering",
    businessUnit: "Engineering",
    owner: { id: "u-26", name: "Olivia Chen", title: "Platform Engineer", team: "API Platform" },
    platform: "databricks",
    lifecycleStage: "growth",
    monthlyCost: 19200,
    costBreakdown: { compute: 9800, storage: 2200, pipeline: 4600, humanEstimate: 2600 },
    declaredValue: 40000,
    usageImpliedValue: 35000,
    monthlyConsumers: 62,
    teamCount: 4,
    freshnessHours: 1,
    freshnessSLA: 4,
    completeness: 0.93,
    accuracy: 0.91,
    trustScore: 0.84,
    costTrendPct: 38,
    costCoverage: 0.88,
    usageTrend: 22,
    peakConsumers: 68,
    isPublished: true,
    isCertified: false,
    subscriptionCount: 5,
    valueDeclaration: {
      declaredBy: "Olivia Chen",
      declaredByTitle: "Platform Engineer",
      method: "efficiency_gain",
      value: 40000,
      basis: "API cost attribution prevents over-provisioning. Saves estimated $40K/mo across 12 internal services.",
      status: ["peer_reviewed"],
      declaredAt: "2025-11-01",
      nextReview: "2026-05-01",
      isExpiring: false,
    },
    downstreamProducts: 2,
    downstreamModels: 1,
    downstreamDashboards: 4,
    isRetirementCandidate: false,
    hasCostSpike: true,
    hasUsageDecline: false,
    createdAt: "2025-07-15",
    updatedAt: "2026-02-22T18:00:00Z",
  }),

  // ── 8. The New Onboarding ──
  build({
    id: "dp-021",
    name: "ESG Metrics Platform",
    domain: "Sustainability",
    businessUnit: "Corporate Affairs",
    owner: { id: "u-27", name: "Daniel Kim", title: "Sustainability Lead", team: "Corporate Affairs" },
    platform: "snowflake",
    lifecycleStage: "draft",
    monthlyCost: 7500,
    costBreakdown: { compute: 2800, storage: 1200, pipeline: 2100, humanEstimate: 1400 },
    declaredValue: null,
    usageImpliedValue: 12000,
    monthlyConsumers: 15,
    teamCount: 2,
    freshnessHours: 24,
    freshnessSLA: 48,
    completeness: 0.82,
    accuracy: 0.85,
    trustScore: 0.70,
    costTrendPct: 0,
    costCoverage: 0.78,
    usageTrend: 0,
    peakConsumers: 15,
    isPublished: false,
    isCertified: false,
    subscriptionCount: 0,
    valueDeclaration: null,
    downstreamProducts: 0,
    downstreamModels: 0,
    downstreamDashboards: 2,
    isRetirementCandidate: false,
    hasCostSpike: false,
    hasUsageDecline: false,
    createdAt: "2026-01-15",
    updatedAt: "2026-02-20T15:00:00Z",
  }),
];

// ============================================================
// LONG-TAIL PRODUCTS — 20 table-driven generated products
// ============================================================

interface CompactSpec {
  id: string;
  name: string;
  domain: string;
  bu: string;
  platform: Platform;
  lifecycle: LifecycleStage;
  cost: number;
  declared: number | null;
  usage: number;
  consumers: number;
  quality: [number, number, number]; // completeness, accuracy, trustScore
  flags?: { retirement?: boolean; spike?: boolean; decline?: boolean };
}

const LONG_TAIL_OWNERS: Owner[] = [
  { id: "u-30", name: "Michelle Torres", title: "Data Product Manager", team: "Analytics" },
  { id: "u-31", name: "Ahmed Hassan", title: "Sr. Data Engineer", team: "Data Platform" },
  { id: "u-32", name: "Lisa Wang", title: "Analytics Lead", team: "Business Intelligence" },
  { id: "u-33", name: "Carlos Moreno", title: "Data Architect", team: "Enterprise Data" },
  { id: "u-34", name: "Jessica Park", title: "ML Engineer", team: "Data Science" },
  { id: "u-35", name: "Robert Liu", title: "Data Engineering Manager", team: "Infrastructure" },
  { id: "u-36", name: "Nina Petrov", title: "Product Analyst", team: "Product" },
  { id: "u-37", name: "Michael O'Brien", title: "Sr. Analytics Engineer", team: "Revenue Ops" },
  { id: "u-38", name: "Aisha Patel", title: "Data Governance Lead", team: "Data Quality" },
  { id: "u-39", name: "Thomas Schmidt", title: "Data Engineering Lead", team: "Operations" },
  { id: "u-40", name: "Isabella Rossi", title: "Business Analyst", team: "Strategy" },
  { id: "u-41", name: "Kevin Huang", title: "DevOps Engineer", team: "Platform" },
  { id: "u-42", name: "Sarah Nakamura", title: "Analytics Manager", team: "Finance" },
  { id: "u-43", name: "David Okafor", title: "Data Product Owner", team: "Supply Chain" },
  { id: "u-44", name: "Emma Johansson", title: "BI Analyst", team: "Marketing" },
  { id: "u-45", name: "Arjun Mehta", title: "Platform Lead", team: "Security" },
  { id: "u-46", name: "Rachel Green", title: "Legal Analyst", team: "Legal" },
  { id: "u-47", name: "Jun Watanabe", title: "Research Analyst", team: "Strategy" },
  { id: "u-48", name: "Laura Svensson", title: "Data Engineer", team: "IT" },
  { id: "u-49", name: "Mark Dubois", title: "Analytics Lead", team: "Customer Success" },
];

const VALUE_METHODS = ["revenue_attribution", "cost_avoidance", "efficiency_gain", "compliance", "strategic"] as const;

const LONG_TAIL_SPECS: CompactSpec[] = [
  { id: "dp-022", name: "Sales Pipeline Dashboard", domain: "Sales Analytics", bu: "Sales", platform: "power_bi", lifecycle: "mature", cost: 6800, declared: 28000, usage: 22000, consumers: 65, quality: [0.94, 0.96, 0.90] },
  { id: "dp-023", name: "Support Ticket Analytics", domain: "Customer Support", bu: "Customer Success", platform: "snowflake", lifecycle: "growth", cost: 5200, declared: 18000, usage: 14000, consumers: 38, quality: [0.91, 0.93, 0.87] },
  { id: "dp-024", name: "Warehouse Operations Metrics", domain: "Supply Chain", bu: "Operations", platform: "databricks", lifecycle: "mature", cost: 8400, declared: 32000, usage: 26000, consumers: 52, quality: [0.93, 0.95, 0.91] },
  { id: "dp-025", name: "Campaign Performance Aggregates", domain: "Marketing Analytics", bu: "Marketing", platform: "snowflake", lifecycle: "growth", cost: 11300, declared: 45000, usage: 38000, consumers: 78, quality: [0.92, 0.90, 0.86] },
  { id: "dp-026", name: "Financial Close Automation", domain: "Finance", bu: "Finance", platform: "snowflake", lifecycle: "mature", cost: 9100, declared: 52000, usage: 30000, consumers: 35, quality: [0.97, 0.98, 0.95] },
  { id: "dp-027", name: "Vendor Risk Scores", domain: "Procurement", bu: "Procurement", platform: "s3", lifecycle: "active", cost: 4300, declared: 15000, usage: 11000, consumers: 22, quality: [0.89, 0.91, 0.85] },
  { id: "dp-028", name: "Employee Engagement Survey Data", domain: "People Analytics", bu: "HR", platform: "s3", lifecycle: "draft", cost: 3100, declared: null, usage: 8000, consumers: 12, quality: [0.85, 0.88, 0.78] },
  { id: "dp-029", name: "Social Media Sentiment Feed", domain: "Digital Marketing", bu: "Marketing", platform: "databricks", lifecycle: "growth", cost: 7200, declared: 22000, usage: 18000, consumers: 45, quality: [0.88, 0.82, 0.80] },
  { id: "dp-030", name: "Manufacturing Quality Metrics", domain: "Manufacturing", bu: "Operations", platform: "snowflake", lifecycle: "mature", cost: 6500, declared: 35000, usage: 20000, consumers: 40, quality: [0.95, 0.97, 0.93] },
  { id: "dp-031", name: "Customer Lifetime Value Model", domain: "Data Science", bu: "Data Science", platform: "databricks", lifecycle: "growth", cost: 12800, declared: 55000, usage: 42000, consumers: 55, quality: [0.90, 0.88, 0.84] },
  { id: "dp-032", name: "Logistics Tracking Events", domain: "Supply Chain", bu: "Operations", platform: "databricks", lifecycle: "active", cost: 8900, declared: 28000, usage: 24000, consumers: 48, quality: [0.92, 0.94, 0.89] },
  { id: "dp-033", name: "Website Performance Analytics", domain: "Digital Analytics", bu: "Product", platform: "snowflake", lifecycle: "active", cost: 4800, declared: 16000, usage: 20000, consumers: 55, quality: [0.93, 0.91, 0.88] },
  { id: "dp-034", name: "Revenue Forecasting Outputs", domain: "Finance", bu: "Finance", platform: "snowflake", lifecycle: "growth", cost: 10500, declared: 48000, usage: 32000, consumers: 30, quality: [0.91, 0.93, 0.89] },
  { id: "dp-035", name: "Product Feature Usage Data", domain: "Product Analytics", bu: "Product", platform: "databricks", lifecycle: "active", cost: 5600, declared: 20000, usage: 18000, consumers: 42, quality: [0.94, 0.92, 0.88] },
  { id: "dp-036", name: "Procurement Spend Analytics", domain: "Finance", bu: "Procurement", platform: "power_bi", lifecycle: "mature", cost: 4100, declared: 22000, usage: 15000, consumers: 25, quality: [0.96, 0.97, 0.94] },
  { id: "dp-037", name: "IT Asset Inventory", domain: "IT Operations", bu: "IT", platform: "s3", lifecycle: "decline", cost: 5800, declared: 8000, usage: 5000, consumers: 14, quality: [0.82, 0.85, 0.75], flags: { decline: true } },
  { id: "dp-038", name: "Customer Feedback Analysis", domain: "Customer Insights", bu: "Customer Success", platform: "snowflake", lifecycle: "growth", cost: 6100, declared: 25000, usage: 20000, consumers: 48, quality: [0.90, 0.88, 0.84] },
  { id: "dp-039", name: "Market Research Data Hub", domain: "Strategy", bu: "Strategy", platform: "s3", lifecycle: "draft", cost: 3800, declared: null, usage: 9000, consumers: 10, quality: [0.78, 0.82, 0.72] },
  { id: "dp-040", name: "Network Security Events", domain: "IT Security", bu: "IT", platform: "databricks", lifecycle: "active", cost: 14200, declared: 60000, usage: 35000, consumers: 35, quality: [0.95, 0.96, 0.92] },
  { id: "dp-041", name: "Contract Analytics Data", domain: "Legal", bu: "Legal", platform: "snowflake", lifecycle: "mature", cost: 3900, declared: 18000, usage: 12000, consumers: 18, quality: [0.93, 0.95, 0.91] },
];

function buildCompact(s: CompactSpec): DataProduct {
  const seed = parseInt(s.id.replace("dp-", ""), 10);
  const compositeValue = computeCompositeValue(s.declared, s.usage);
  const roi = computeProductROI(compositeValue, s.cost);
  const isGrowth = s.lifecycle === "growth";
  const isDecline = s.lifecycle === "decline";
  const owner = LONG_TAIL_OWNERS[(seed - 22) % LONG_TAIL_OWNERS.length];
  const costTrendPct = s.flags?.spike ? 30 + seededRandom(seed) * 15 : isGrowth ? 3 + seededRandom(seed) * 8 : isDecline ? -(2 + seededRandom(seed) * 5) : 1 + seededRandom(seed) * 3;

  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    businessUnit: s.bu,
    owner,
    platform: s.platform,
    lifecycleStage: s.lifecycle,
    createdAt: `2025-${String(1 + (seed % 10)).padStart(2, "0")}-${String(5 + (seed % 20)).padStart(2, "0")}`,
    updatedAt: "2026-02-20T09:00:00Z",
    monthlyCost: s.cost,
    costBreakdown: splitCost(s.cost, seed),
    declaredValue: s.declared,
    usageImpliedValue: s.usage,
    compositeValue,
    roi,
    roiBand: canonicalClassifyROI(roi) ?? "critical",
    costTrend: Math.round(costTrendPct * 10) / 10,
    costCoverage: 0.80 + seededRandom(seed + 100) * 0.15,
    monthlyConsumers: s.consumers,
    totalQueries: Math.round(s.consumers * (30 + seededRandom(seed) * 30)),
    consumerTeams: makeTeams(s.consumers, seed),
    usageTrend: isGrowth ? 5 + Math.round(seededRandom(seed) * 12) : isDecline ? -(5 + Math.round(seededRandom(seed) * 15)) : 2 + Math.round(seededRandom(seed) * 5),
    peakConsumers: Math.round(s.consumers * (isDecline ? 2.5 : 1.1)),
    freshnessHours: 1 + Math.round(seededRandom(seed + 200) * 23),
    freshnessSLA: 24,
    completeness: s.quality[0],
    accuracy: s.quality[1],
    trustScore: s.quality[2],
    isPublished: s.lifecycle !== "draft",
    isCertified: s.lifecycle === "mature" || (s.lifecycle === "growth" && seededRandom(seed) > 0.5),
    subscriptionCount: Math.round(seededRandom(seed + 300) * 8),
    valueDeclaration: s.declared != null ? {
      declaredBy: owner.name,
      declaredByTitle: owner.title,
      method: VALUE_METHODS[seed % VALUE_METHODS.length],
      value: s.declared,
      basis: `Value assessment for ${s.name} based on ${VALUE_METHODS[seed % VALUE_METHODS.length].replace(/_/g, " ")} methodology.`,
      status: seededRandom(seed + 400) > 0.3 ? ["peer_reviewed", "cfo_acknowledged"] as const : ["peer_reviewed"] as const,
      declaredAt: "2025-10-01",
      nextReview: "2026-04-01",
      isExpiring: seededRandom(seed + 500) > 0.8,
    } : null,
    downstreamProducts: Math.round(seededRandom(seed + 600) * 5),
    downstreamModels: Math.round(seededRandom(seed + 700) * 4),
    downstreamDashboards: Math.round(seededRandom(seed + 800) * 6),
    isRetirementCandidate: s.flags?.retirement ?? false,
    hasCostSpike: s.flags?.spike ?? false,
    hasUsageDecline: s.flags?.decline ?? false,
    inferredValue: null, // Hydrated by seed.ts hydrateInference()
    valueSource: s.declared !== null ? "declared" : "inferred",
  };
}

export const longTailProducts: DataProduct[] = LONG_TAIL_SPECS.map(buildCompact);

// ============================================================
// ADDITIONAL DECISIONS — 5 decisions for anchor products
// ============================================================

export const additionalDecisions: Decision[] = [
  {
    id: "dec-012",
    type: "retirement",
    status: "under_review",
    productId: "dp-018",
    productName: "Legacy HR Data Extract",
    title: "Retire Legacy HR Data Extract",
    description: "Usage collapsed to 8 consumers (from peak of 45). No declared value. ROI is critical at 0.12x. Recommend full retirement with data archive to cold storage.",
    initiatedBy: "Capital Governance Board",
    assignedTo: "Fatima Al-Hassan",
    assignedToTitle: "HR Analytics Manager",
    estimatedImpact: 11600,
    actualImpact: null,
    impactBasis: "Full monthly cost elimination upon retirement ($11,600/mo = $139,200/yr)",
    createdAt: "2026-02-18T09:00:00Z",
    updatedAt: "2026-02-18T09:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 11600,
    projectedSavingsAnnual: 139200,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-013",
    type: "cost_investigation",
    status: "approved",
    productId: "dp-016",
    productName: "Real-Time Clickstream",
    title: "Optimize Real-Time Clickstream compute costs",
    description: "38% cost spike from over-provisioned streaming nodes. Reserved instances and right-sizing expected to save $4,800/mo without impacting throughput.",
    initiatedBy: "Cost Alert System",
    assignedTo: "Yuki Tanaka",
    assignedToTitle: "Streaming Platform Lead",
    estimatedImpact: 4800,
    actualImpact: 4800,
    impactBasis: "Reserved instance pricing + right-sizing streaming nodes from 8 to 5",
    createdAt: "2026-02-05T14:00:00Z",
    updatedAt: "2026-02-19T11:30:00Z",
    resolvedAt: "2026-02-19T11:30:00Z",
    resolution: "Approved. Streaming nodes right-sized from 8 to 5. Reserved instances applied. Verified $4,800/mo savings.",
    capitalFreed: 4800,
    projectedSavingsMonthly: 4800,
    projectedSavingsAnnual: 57600,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "confirmed",
  },
  {
    id: "dec-014",
    type: "ai_project_review",
    status: "approved",
    productId: "dp-014",
    productName: "AI Feature Store",
    title: "Review AI Feature Store infrastructure efficiency",
    description: "Quarterly AI governance review identified 12 unused feature tables and 3 redundant pipelines consuming $3,200/mo in compute and storage.",
    initiatedBy: "AI Governance Committee",
    assignedTo: "Sophia Martinez",
    assignedToTitle: "ML Platform Lead",
    estimatedImpact: 3200,
    actualImpact: 3200,
    impactBasis: "Cleanup of unused feature tables and pipeline consolidation",
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-02-12T16:00:00Z",
    resolvedAt: "2026-02-12T16:00:00Z",
    resolution: "Approved. Removed 12 unused feature tables, consolidated 3 pipelines. Monthly savings: $3,200.",
    capitalFreed: 3200,
    projectedSavingsMonthly: 3200,
    projectedSavingsAnnual: 38400,
    delayReason: null,
    delayedUntil: null,
    impactValidationStatus: "validating",
  },
  {
    id: "dec-015",
    type: "cost_investigation",
    status: "under_review",
    productId: "dp-020",
    productName: "API Usage Analytics",
    title: "Investigate API Usage Analytics cost spike",
    description: "38% MoM cost increase driven by new microservices deployment increasing log volume. Preliminary analysis suggests log level optimization and sampling could reduce costs.",
    initiatedBy: "Cost Alert System",
    assignedTo: "Olivia Chen",
    assignedToTitle: "Platform Engineer",
    estimatedImpact: 5500,
    actualImpact: null,
    impactBasis: "Estimated savings from log level optimization and adaptive sampling",
    createdAt: "2026-02-22T08:00:00Z",
    updatedAt: "2026-02-22T08:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 5500,
    projectedSavingsAnnual: 66000,
    delayReason: null,
    delayedUntil: null,
  },
  {
    id: "dec-016",
    type: "value_revalidation",
    status: "under_review",
    productId: "dp-019",
    productName: "Partner Revenue Attribution",
    title: "Revalidate Partner Revenue Attribution value declaration",
    description: "Value declaration approaching 180-day review window. Current declaration: $82K/mo via revenue attribution. Partnership team confirmation of methodology required.",
    initiatedBy: "Value Governance Policy",
    assignedTo: "Raj Sundaram",
    assignedToTitle: "Revenue Ops Lead",
    estimatedImpact: 0,
    actualImpact: null,
    impactBasis: "No direct cost impact — value governance compliance",
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
    resolvedAt: null,
    resolution: null,
    capitalFreed: 0,
    projectedSavingsMonthly: 0,
    projectedSavingsAnnual: 0,
    delayReason: null,
    delayedUntil: null,
  },
];

// ============================================================
// ADDITIONAL CAPITAL EVENTS — from approved decisions
// ============================================================

export const additionalCapitalEvents: Array<{
  id: string;
  decisionId: string;
  productId: string | null;
  eventType: "retirement_freed" | "cost_optimization" | "reallocation" | "pricing_revenue" | "ai_spend_reduced";
  amount: number;
  description: string;
  effectiveDate: string;
  createdAt: string;
}> = [
  {
    id: "ce-005",
    decisionId: "dec-013",
    productId: "dp-016",
    eventType: "cost_optimization",
    amount: 4800,
    description: "Real-Time Clickstream: reserved instances + node right-sizing ($4,800/mo)",
    effectiveDate: "2026-02-19",
    createdAt: "2026-02-19T11:30:00Z",
  },
  {
    id: "ce-006",
    decisionId: "dec-014",
    productId: "dp-014",
    eventType: "cost_optimization",
    amount: 3200,
    description: "AI Feature Store: unused table cleanup + pipeline consolidation ($3,200/mo)",
    effectiveDate: "2026-02-12",
    createdAt: "2026-02-12T16:00:00Z",
  },
];

// ============================================================
// TREND DATA — cost & usage trends for anchor products
// ============================================================

export const extendedCostTrends: Record<string, CostTrendPoint[]> = {
  "dp-014": makeCostTrend(22000, 0.05, 14),
  "dp-015": makeCostTrend(9500, 0.005, 15),
  "dp-016": makeCostTrend(18000, 0.12, 16),
  "dp-019": makeCostTrend(12000, 0.05, 19),
  "dp-020": makeCostTrend(11000, 0.12, 20),
};

export const extendedUsageTrends: Record<string, UsageTrendPoint[]> = {
  "dp-014": makeUsageTrend(55, 0.08, 14),
  "dp-016": makeUsageTrend(60, 0.15, 16),
  "dp-018": [
    { month: "Sep", consumers: 32, queries: 1440 },
    { month: "Oct", consumers: 25, queries: 1125 },
    { month: "Nov", consumers: 18, queries: 810 },
    { month: "Dec", consumers: 14, queries: 630 },
    { month: "Jan", consumers: 10, queries: 450 },
    { month: "Feb", consumers: 8, queries: 360 },
  ],
  "dp-019": makeUsageTrend(65, 0.08, 19),
  "dp-020": makeUsageTrend(35, 0.12, 20),
};

// ============================================================
// SCALE-UP GENERATOR — ~160 products for enterprise-scale demo
// Power law distributions for cost and usage (realistic).
// ============================================================

interface DomainTemplate {
  domain: string;
  bu: string;
  names: string[];
}

const SCALE_DOMAINS: DomainTemplate[] = [
  { domain: "Finance", bu: "Finance", names: ["GL Journal Entries", "Budget Variance Report", "Treasury Positions", "Tax Liability Data", "Intercompany Settlements", "Fixed Asset Register", "Revenue Recognition Feed", "Cash Management Pool"] },
  { domain: "Sales Analytics", bu: "Sales", names: ["Territory Performance Matrix", "Quote Analytics Hub", "Renewal Rate Tracker", "Account Health Scores", "Sales Forecast Engine", "Commission Data Feed", "Deal Velocity Index", "Win-Loss Analysis"] },
  { domain: "Marketing Analytics", bu: "Marketing", names: ["Multi-Touch Attribution", "Campaign ROI Dashboard", "Lead Scoring Engine", "Brand Tracking Survey", "Email Engagement Metrics", "Ad Spend Optimizer", "Marketing Funnel Analytics", "Content Performance Data"] },
  { domain: "Supply Chain", bu: "Operations", names: ["Demand Forecast Model", "Supplier Scorecard Hub", "Inventory Optimization", "Logistics KPI Dashboard", "Order Fulfillment Metrics", "Capacity Planning Data", "Material Requirements Feed", "Warehouse Utilization Index"] },
  { domain: "Customer Success", bu: "Customer Success", names: ["Churn Signal Detector", "NPS Tracking Dashboard", "Usage Adoption Metrics", "Customer Health Scores", "Renewal Forecast Model", "Onboarding Metrics Feed", "Support SLA Tracker", "Engagement Analytics Hub"] },
  { domain: "Product Analytics", bu: "Product", names: ["Feature Adoption Tracker", "A/B Test Repository", "User Journey Analytics", "Error Tracking Pipeline", "Release Impact Metrics", "Performance Monitoring", "Product Conversion Funnel", "User Segmentation Engine"] },
  { domain: "People Analytics", bu: "HR", names: ["Headcount Planning Model", "Attrition Analysis Feed", "Compensation Benchmarks", "DEI Metrics Dashboard", "Performance Review Data", "Recruiting Pipeline Feed", "Learning Analytics Hub", "Org Network Analysis"] },
  { domain: "IT Operations", bu: "IT", names: ["Infrastructure Monitoring", "Incident Response Data", "Change Management Log", "IT SLA Compliance", "Cloud Cost Optimizer", "Capacity Management Feed", "Security Event Pipeline", "Service Health Dashboard"] },
  { domain: "Data Science", bu: "Data Science", names: ["Feature Repository Hub", "Model Registry Feed", "Experiment Tracking Log", "Training Pipeline Metrics", "Inference Log Analytics", "Data Drift Monitor", "Bias Detection Pipeline", "Model Performance Index"] },
  { domain: "Risk & Compliance", bu: "Risk", names: ["Audit Trail Repository", "Policy Compliance Feed", "Fraud Detection Pipeline", "Regulatory Report Data", "Risk Scoring Engine", "Control Testing Results", "Privacy Tracking Feed", "Compliance Incident Log"] },
  { domain: "Strategy", bu: "Strategy", names: ["Market Intelligence Feed", "Competitive Analysis Hub", "Industry Benchmark Data", "Board Reporting Pack", "Strategic Initiative Tracker", "Investment Analytics Feed", "M&A Pipeline Data", "Portfolio Analytics Hub"] },
  { domain: "Operations", bu: "Operations", names: ["Fleet Management Data", "Quality Assurance Feed", "Process Efficiency Index", "Resource Allocation Hub", "Scheduling Analytics Engine", "Environmental Metrics Feed", "Safety Incident Tracker", "Maintenance Log Pipeline"] },
  { domain: "Legal", bu: "Legal", names: ["Contract Repository Index", "Litigation Tracker Feed", "IP Portfolio Analytics", "Regulatory Filing Data", "E-Discovery Index Hub", "Compliance Calendar Feed", "Vendor Agreement Data", "Policy Library Index"] },
  { domain: "Digital Marketing", bu: "Marketing", names: ["SEO Analytics Pipeline", "Paid Search Performance", "Social Listening Feed", "Programmatic Media Metrics", "Web Traffic Analytics", "Conversion Tracking Hub", "Audience Segment Builder", "Creative Performance Data"] },
  { domain: "Procurement", bu: "Procurement", names: ["Supplier Risk Dashboard", "Category Spend Analytics", "Contract Compliance Feed", "Sourcing Pipeline Data", "Vendor Performance Hub", "Category Management Feed", "Cost Benchmarking Index", "PO Analytics Pipeline"] },
  { domain: "Customer Insights", bu: "Customer Success", names: ["Survey Results Aggregator", "Behavioral Segment Data", "Journey Mapping Analytics", "Voice of Customer Feed", "Loyalty Program Metrics", "Customer Effort Score", "Preference Center Data", "Feedback Loop Analytics"] },
  { domain: "Revenue Operations", bu: "Revenue Ops", names: ["Pipeline Health Analytics", "Forecast Accuracy Feed", "Revenue Waterfall Data", "Pricing Analytics Engine", "Quota Attainment Tracker", "Deal Analytics Pipeline", "Revenue Leakage Detector", "ARR Tracking Dashboard"] },
  { domain: "Cybersecurity", bu: "IT", names: ["Threat Intelligence Feed", "Vulnerability Scan Data", "Access Review Pipeline", "Endpoint Security Metrics", "SIEM Analytics Engine", "Penetration Test Results", "Compliance Scan Reports", "Identity Analytics Hub"] },
  { domain: "Manufacturing", bu: "Operations", names: ["Production Metrics Feed", "Defect Analysis Pipeline", "OEE Dashboard Data", "Batch Record Analytics", "Equipment Telemetry Hub", "Energy Consumption Feed", "Yield Analytics Engine", "Process Control Data"] },
  { domain: "Research", bu: "Research", names: ["Clinical Trial Analytics", "Lab Results Pipeline", "Patent Analytics Feed", "Research Output Tracker", "Collaboration Metrics Hub", "Grant Tracking Data", "Publication Index Feed", "Innovation Pipeline Hub"] },
];

const PLATFORMS: Platform[] = ["snowflake", "databricks", "s3", "power_bi", "bigquery"];

// Platform weights: snowflake dominant, then databricks, bigquery, s3, power_bi
const PLATFORM_WEIGHTS = [0.35, 0.25, 0.10, 0.10, 0.20];

const LIFECYCLE_POOL: LifecycleStage[] = [
  "mature", "mature", "mature", "mature",       // 25%
  "active", "active", "active",                  // 18.75%
  "growth", "growth", "growth",                  // 18.75%
  "draft", "draft",                              // 12.5%
  "decline", "decline",                          // 12.5%
  "retired",                                     // 6.25%
  "retired",                                     // 6.25%
];

function powerLawCost(seed: number): number {
  // Power law: most products are cheap ($500-$5K), few are expensive ($20K-$50K)
  const u = seededRandom(seed);
  const alpha = 1.8; // shape parameter
  const minCost = 500;
  const maxCost = 50000;
  const raw = minCost * Math.pow(1 - u, -1 / alpha);
  return Math.round(Math.min(raw, maxCost) / 100) * 100; // round to nearest $100
}

function powerLawConsumers(seed: number): number {
  // Power law: most products have few consumers (3-20), some have many (50-450)
  const u = seededRandom(seed);
  const alpha = 2.0;
  const min = 3;
  const max = 450;
  const raw = min * Math.pow(1 - u, -1 / alpha);
  return Math.round(Math.min(raw, max));
}

function pickPlatform(seed: number): Platform {
  let r = seededRandom(seed);
  for (let i = 0; i < PLATFORMS.length; i++) {
    r -= PLATFORM_WEIGHTS[i];
    if (r <= 0) return PLATFORMS[i];
  }
  return PLATFORMS[0];
}

function qualityTriplet(seed: number): [number, number, number] {
  const base = 0.70 + seededRandom(seed) * 0.25; // 0.70-0.95
  const completeness = Math.round((base + seededRandom(seed + 1) * 0.05) * 100) / 100;
  const accuracy = Math.round((base + seededRandom(seed + 2) * 0.05) * 100) / 100;
  const trust = Math.round((base - seededRandom(seed + 3) * 0.08) * 100) / 100;
  return [
    Math.min(0.99, Math.max(0.60, completeness)),
    Math.min(0.99, Math.max(0.60, accuracy)),
    Math.min(0.99, Math.max(0.55, trust)),
  ];
}

function generateScaleUpSpecs(): CompactSpec[] {
  const specs: CompactSpec[] = [];
  let dpIndex = 42; // Start after dp-041

  for (let d = 0; d < SCALE_DOMAINS.length; d++) {
    const tmpl = SCALE_DOMAINS[d];
    for (let n = 0; n < tmpl.names.length; n++) {
      const seed = d * 1000 + n * 100 + dpIndex;
      const id = `dp-${String(dpIndex).padStart(3, "0")}`;
      const cost = powerLawCost(seed);
      const consumers = powerLawConsumers(seed + 50);
      const lifecycle = LIFECYCLE_POOL[Math.floor(seededRandom(seed + 77) * LIFECYCLE_POOL.length)];
      const platform = pickPlatform(seed + 33);

      // ~20% have no declared value
      const hasDeclared = seededRandom(seed + 99) > 0.20;
      const declared = hasDeclared
        ? Math.round(cost * (1.5 + seededRandom(seed + 111) * 4.5)) // 1.5x-6x cost
        : null;

      // Usage-implied value: correlated with consumers and cost
      const usage = Math.round(consumers * (80 + seededRandom(seed + 222) * 200));

      // ~8% cost spikes, ~10% usage decline, ~5% retirement candidates
      const spike = seededRandom(seed + 333) < 0.08;
      const decline = lifecycle === "decline" || seededRandom(seed + 444) < 0.10;
      const retirement = lifecycle === "decline" && seededRandom(seed + 555) < 0.50;

      specs.push({
        id,
        name: tmpl.names[n],
        domain: tmpl.domain,
        bu: tmpl.bu,
        platform,
        lifecycle,
        cost,
        declared,
        usage,
        consumers,
        quality: qualityTriplet(seed + 666),
        flags: (spike || decline || retirement) ? {
          spike: spike || undefined,
          decline: decline || undefined,
          retirement: retirement || undefined,
        } : undefined,
      });

      dpIndex++;
    }
  }

  return specs;
}

const SCALE_UP_SPECS = generateScaleUpSpecs();

export const scaleUpProducts: DataProduct[] = SCALE_UP_SPECS.map(buildCompact);
