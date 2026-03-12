/**
 * Tests for useCapitalModel hook.
 *
 * We mock the API hooks to return realistic data so the hook's internal
 * computation logic (helpers + useMemo) is fully exercised.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mock data ────────────────────────────────────────────────────────────────

const now = new Date("2026-03-01T12:00:00Z");

const mockProducts = {
  data: {
    items: [
      {
        id: "dp-001",
        name: "Customer 360",
        domain: "analytics",
        roiBand: "high",
        declaredValue: 62000,
        usageImpliedValue: 48000,
        compositeValue: 57800,
        monthlyCost: 18400,
        roi: 3.14,
        costCoverage: 0.92,
        lifecycleStage: "growth",
        inferredValue: 55000,
        platform: "snowflake",
        isRetirementCandidate: false,
        valueDeclaration: null,
      },
      {
        id: "dp-002",
        name: "ML Feature Store",
        domain: "ml",
        roiBand: "critical",
        declaredValue: null,
        usageImpliedValue: 2000,
        compositeValue: 600,
        monthlyCost: 22000,
        roi: 0.03,
        costCoverage: 0.68,
        lifecycleStage: "decline",
        inferredValue: null,
        platform: "databricks",
        isRetirementCandidate: true,
        valueDeclaration: { isExpiring: true },
      },
      {
        id: "dp-003",
        name: "Risk Analytics",
        domain: "risk",
        roiBand: "healthy",
        declaredValue: null,
        usageImpliedValue: 10000,
        compositeValue: 3000,
        monthlyCost: 5000,
        roi: 0.6,
        costCoverage: 0.75,
        lifecycleStage: "active",
        inferredValue: 3000,
        platform: "snowflake",
        isRetirementCandidate: false,
        valueDeclaration: null,
      },
    ],
  },
  loading: false,
};

const mockSummary = {
  data: {
    totalCost: 45400,
    totalProducts: 3,
    portfolioROI: 1.35,
    costCoverage: 0.78,
  },
  loading: false,
};

const mockDecisions = {
  data: [
    {
      id: "dec-001",
      type: "retirement",
      status: "under_review",
      productId: "dp-002",
      productName: "ML Feature Store",
      createdAt: "2026-02-10T00:00:00Z",
      resolvedAt: null,
      capitalFreed: 0,
      projectedSavingsMonthly: 22000,
      estimatedImpact: 22000,
      assignedTo: "Sarah Chen",
      assignedToTitle: "CFO",
      impactBasis: "cost analysis",
      actualImpact: null,
    },
    {
      id: "dec-002",
      type: "capital_reallocation",
      status: "under_review",
      productId: "dp-003",
      productName: "Risk Analytics",
      createdAt: "2026-02-15T00:00:00Z",
      resolvedAt: null,
      capitalFreed: 0,
      projectedSavingsMonthly: 5000,
      estimatedImpact: 5000,
      assignedTo: "Sarah Chen",
      assignedToTitle: "CFO",
      impactBasis: "rebalance model",
      actualImpact: null,
    },
    {
      id: "dec-003",
      type: "cost_investigation",
      status: "approved",
      productId: "dp-001",
      productName: "Customer 360",
      createdAt: "2026-01-01T00:00:00Z",
      resolvedAt: "2026-02-01T00:00:00Z",
      capitalFreed: 8000,
      projectedSavingsMonthly: 3000,
      estimatedImpact: 8000,
      assignedTo: "Michael Torres",
      assignedToTitle: "FP&A Analyst",
      impactBasis: "connector data",
      actualImpact: 7500,
    },
    {
      id: "dec-004",
      type: "pricing_activation",
      status: "under_review",
      productId: "dp-001",
      productName: "Customer 360",
      createdAt: "2026-02-20T00:00:00Z",
      resolvedAt: null,
      capitalFreed: 0,
      projectedSavingsMonthly: 4000,
      estimatedImpact: 4000,
      assignedTo: "Priya Patel",
      assignedToTitle: "CDO",
      impactBasis: "pricing model",
      actualImpact: null,
    },
    {
      id: "dec-005",
      type: "ai_project_review",
      status: "under_review",
      productId: "dp-002",
      productName: "ML Feature Store",
      createdAt: "2026-02-25T00:00:00Z",
      resolvedAt: null,
      capitalFreed: 0,
      projectedSavingsMonthly: 10000,
      estimatedImpact: 10000,
      assignedTo: "Head of AI",
      assignedToTitle: "Head of AI",
      impactBasis: "ai scorecard",
      actualImpact: null,
    },
    {
      id: "dec-006",
      type: "value_revalidation",
      status: "under_review",
      productId: "dp-003",
      productName: "Risk Analytics",
      createdAt: "2026-02-28T00:00:00Z",
      resolvedAt: null,
      capitalFreed: 0,
      projectedSavingsMonthly: 2000,
      estimatedImpact: 2000,
      assignedTo: "David Kim",
      assignedToTitle: "Product Owner",
      impactBasis: null,
      actualImpact: null,
    },
  ],
  loading: false,
};

const mockCapitalImpact = {
  data: {
    totalCapitalFreed: 8000,
    capitalFreedByMonth: [
      { month: "2026-01", amount: 3000 },
      { month: "2026-02", amount: 5000 },
    ],
  },
  loading: false,
};

const mockBehavior = {
  data: {
    avgDecisionVelocityDays: 12,
  },
  loading: false,
};

const mockRebalance = {
  data: {
    totalMonthlyCost: 45400,
    rebalancePct: 0.15,
    efficiencyDelta: 0.8,
    bottomQuartile: {
      count: 1,
      blendedRoi: 0.03,
      products: [{ id: "dp-002" }],
    },
    topQuartile: {
      count: 1,
      blendedRoi: 3.14,
      products: [{ id: "dp-001" }],
    },
  },
  loading: false,
};

const mockPricing = {
  data: [
    { productId: "dp-001", projectedRevenue: 6000 },
  ],
  loading: false,
};

const mockScorecards = {
  data: [
    {
      productId: "dp-002",
      flaggedForReview: true,
      monthlyCost: 22000,
      roi: 0.03,
    },
  ],
  loading: false,
};

const mockExecutive = {
  data: {
    confidenceLevel: "high",
    confidenceBasis: "92% cost coverage, 66% value declarations",
    doNothingProjection: {
      currentMonthlyCost: 45400,
      projectedMonthlyCost: 49940,
      currentROI: 1.35,
      projectedROI: 0.85,
      months: 6,
      projectedWastedSpend: 50000,
      projectedValueAtRisk: 62000,
    },
  },
  loading: false,
};

const mockCostTrend = {
  data: [
    { month: "Jan", cost: 43000 },
    { month: "Feb", cost: 45400 },
  ],
  loading: false,
};

// ── Mock setup ───────────────────────────────────────────────────────────────

let mockHookData: Record<string, { data: unknown; loading: boolean }>;

vi.mock("@/lib/api/hooks", () => ({
  useDataProducts: () => mockHookData.products,
  usePortfolioSummary: () => mockHookData.summary,
  useDecisions: () => mockHookData.decisions,
  useCapitalImpact: () => mockHookData.capitalImpact,
  useCapitalBehavior: () => mockHookData.behavior,
  usePortfolioRebalance: () => mockHookData.rebalance,
  useActivePricingPolicies: () => mockHookData.pricing,
  useAIScorecards: () => mockHookData.scorecards,
  useExecutiveSummary: () => mockHookData.executive,
  usePortfolioCostTrend: () => mockHookData.costTrend,
}));

const { useCapitalModel } = await import("./use-capital-model");

describe("useCapitalModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockHookData = {
      products: mockProducts,
      summary: mockSummary,
      decisions: mockDecisions,
      capitalImpact: mockCapitalImpact,
      behavior: mockBehavior,
      rebalance: mockRebalance,
      pricing: mockPricing,
      scorecards: mockScorecards,
      executive: mockExecutive,
      costTrend: mockCostTrend,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns loading=true and data=null when any hook is loading", () => {
    mockHookData = {
      products: { data: null, loading: true },
      summary: { data: null, loading: true },
      decisions: { data: null, loading: true },
      capitalImpact: { data: null, loading: true },
      behavior: { data: null, loading: true },
      rebalance: { data: null, loading: true },
      pricing: { data: null, loading: true },
      scorecards: { data: null, loading: true },
      executive: { data: null, loading: true },
      costTrend: { data: null, loading: true },
    };
    const { result } = renderHook(() => useCapitalModel());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("returns data=null when products are missing", () => {
    mockHookData.products = { data: null, loading: false };
    const { result } = renderHook(() => useCapitalModel());
    expect(result.current.data).toBeNull();
  });

  it("computes header metrics correctly", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data).not.toBeNull();
    expect(data.monthlyCapitalSpend).toBe(45400);
    // dp-002 is critical ROI, dp-003 has null declared + roi < 1.0
    expect(data.capitalMisallocated).toBe(22000 + 5000);
  });

  it("computes capitalFreedLast90d from resolved decisions", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    // dec-003 resolved 2026-02-01 is within 90 days of 2026-03-01
    expect(data.capitalFreedLast90d).toBe(8000);
    expect(data.capitalFreedRunRate).toBe(3000);
    expect(data.capitalFreedOneTime).toBe(5000);
  });

  it("computes decision latency median from resolved decisions", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    // dec-003: 2026-01-01 to 2026-02-01 = 31 days (only resolved decision)
    expect(data.decisionLatencyMedianDays).toBe(31);
  });

  it("falls back to behavior avg when no resolved decisions", () => {
    mockHookData.decisions = {
      data: [mockDecisions.data[0]], // Only under_review, no resolved
      loading: false,
    };
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.decisionLatencyMedianDays).toBe(12); // from mockBehavior
  });

  it("builds board snapshot from executive projection", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.boardSnapshotCostDelta).toBe(49940 - 45400);
    expect(data.boardSnapshotRoiDelta).toBeCloseTo(0.85 - 1.35);
    expect(data.boardSnapshotMonths).toBe(6);
  });

  it("creates retire action card from pending retirement decisions", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    const retire = data.capitalActions.find((a) => a.type === "retire");
    expect(retire).toBeDefined();
    expect(retire!.capitalImpactMonthly).toBe(22000);
    expect(retire!.status).toBe("actionable");
    expect(retire!.relatedDecisionIds).toContain("dec-001");
  });

  it("creates reallocate action card from rebalance data", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    const reallocate = data.capitalActions.find((a) => a.type === "reallocate");
    expect(reallocate).toBeDefined();
    expect(reallocate!.capitalImpactMonthly).toBe(Math.round(45400 * 0.15));
    expect(reallocate!.status).toBe("in_progress"); // dec-002 is capital_reallocation under_review
  });

  it("creates price action card from pricing policies", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    const price = data.capitalActions.find((a) => a.type === "price");
    expect(price).toBeDefined();
    expect(price!.capitalImpactMonthly).toBe(6000);
    expect(price!.status).toBe("in_progress"); // dec-004 pricing_activation
  });

  it("creates review_ai action card from flagged scorecards", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    const ai = data.capitalActions.find((a) => a.type === "review_ai");
    expect(ai).toBeDefined();
    expect(ai!.capitalImpactMonthly).toBe(22000);
    expect(ai!.status).toBe("in_progress"); // dec-005 ai_project_review
  });

  it("computes capital at risk and freed confirmed", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.capitalFreedConfirmed).toBe(8000);
    expect(data.capitalAtRisk).toBe(27000 + 62000); // misallocated + projectedValueAtRisk
  });

  it("computes inaction cost projections", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.inactionProjectedSpend).toBe((49940 - 45400) * 6);
    expect(data.inactionProjectedLiability).toBe(50000 + 62000);
    expect(data.inactionPrimaryDriver).toBe("decision latency");
  });

  it("builds capital flow data from cost trend and freed by month", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.capitalFlowData.length).toBe(2);
    const jan = data.capitalFlowData.find((d) => d.month === "Jan");
    expect(jan).toBeDefined();
    expect(jan!.totalSpend).toBe(43000);
    expect(jan!.freed).toBe(3000); // Jan from capitalFreedByMonth
  });

  it("builds decision queue from pending decisions", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.decisionQueue.length).toBe(5); // 5 under_review decisions
    // Sorted by capitalImpactMonthly desc
    expect(data.decisionQueue[0].capitalImpactMonthly).toBeGreaterThanOrEqual(
      data.decisionQueue[1].capitalImpactMonthly,
    );
    // Check approver assignment by type
    const pricingRow = data.decisionQueue.find((r) => r.type === "pricing_activation");
    expect(pricingRow!.approver).toBe("CDO");
    const aiRow = data.decisionQueue.find((r) => r.type === "ai_project_review");
    expect(aiRow!.approver).toBe("Head of AI");
    const valRow = data.decisionQueue.find((r) => r.type === "value_revalidation");
    expect(valRow!.approver).toBe("Product Owner");
  });

  it("computes coverage and auditability metrics", () => {
    const { result } = renderHook(() => useCapitalModel());
    const data = result.current.data!;
    expect(data.costCoverage).toBe(0.78);
    expect(data.valueCoverage).toContain("declared");
    expect(data.valueCoverage).toContain("inferred");
    expect(data.confidenceLevel).toBe("high");
    expect(data.decisionProvenance).toBeGreaterThan(0);
  });

  it("skips action cards when no relevant decisions/data", () => {
    mockHookData.decisions = { data: [], loading: false };
    mockHookData.rebalance = { data: null, loading: false };
    mockHookData.pricing = { data: [], loading: false };
    mockHookData.scorecards = { data: [], loading: false };
    // rebalance is null → no data → null returned
    const { result } = renderHook(() => useCapitalModel());
    expect(result.current.data).toBeNull();
  });

  it("returns loading=false when all hooks loaded", () => {
    const { result } = renderHook(() => useCapitalModel());
    expect(result.current.loading).toBe(false);
  });
});
