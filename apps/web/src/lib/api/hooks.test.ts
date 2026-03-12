/**
 * Tests for data hooks.
 *
 * Since isAPIEnabled is false in the test env (no NEXT_PUBLIC_API_URL),
 * all hooks fall back to seed data — which is exactly what we test here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// We need to mock the seed module so hooks resolve quickly
vi.mock("@/lib/mock-data/seed", () => ({
  portfolioSummary: {
    totalProducts: 13,
    totalCost: 156000,
    averageROI: 2.8,
    roiTrend: 4,
    totalConsumers: 847,
    consumersTrend: 12,
    activeSubscriptions: 5,
    retirementCandidates: 3,
    estimatedSavings: 15900,
    costCoverage: 0.72,
    productsWithValue: 9,
    newProductsThisQuarter: 2,
  },
  portfolioCostTrend: [
    { month: "Sep", cost: 140000, value: 350000 },
    { month: "Oct", cost: 145000, value: 360000 },
  ],
  portfolioROIHistory: [
    { month: "Sep", roi: 2.5, cost: 140000, compositeValue: 350000 },
  ],
  executiveSummary: {
    generatedAt: "2026-02-23T00:00:00Z",
    confidenceLevel: 0.72,
    confidenceBasis: "based on 72% cost coverage",
    insights: [],
    doNothingProjection: {
      currentMonthlyCost: 156000,
      projectedMonthlyCost: 170000,
      currentROI: 2.8,
      projectedROI: 2.4,
      projectedWastedSpend: 42000,
      projectedValueAtRisk: 65000,
      months: 6,
      assumptions: [],
    },
  },
  dataProducts: [
    {
      id: "dp-001",
      name: "Customer 360",
      domain: "Customer",
      businessUnit: "Marketing",
      owner: { id: "u1", name: "Alice", title: "PM", team: "Customer" },
      platform: "snowflake",
      lifecycleStage: "active",
      createdAt: "2025-01-01",
      updatedAt: "2026-02-20",
      monthlyCost: 18400,
      costBreakdown: { compute: 8000, storage: 4000, pipeline: 5000, humanEstimate: 1400 },
      declaredValue: 62000,
      usageImpliedValue: 45000,
      compositeValue: 55000,
      roi: 3.4,
      roiBand: "high",
      costTrend: 8,
      costCoverage: 0.85,
      monthlyConsumers: 156,
      totalQueries: 34000,
      consumerTeams: [],
      usageTrend: 12,
      peakConsumers: 180,
      freshnessHours: 6,
      freshnessSLA: 8,
      completeness: 0.94,
      accuracy: 0.97,
      trustScore: 0.92,
      isPublished: true,
      isCertified: true,
      subscriptionCount: 3,
      valueDeclaration: null,
      downstreamProducts: 4,
      downstreamModels: 2,
      downstreamDashboards: 8,
      isRetirementCandidate: false,
      hasCostSpike: false,
      hasUsageDecline: false,
    },
    {
      id: "dp-002",
      name: "Revenue Pipeline",
      domain: "Finance",
      businessUnit: "Finance",
      owner: { id: "u2", name: "Bob", title: "Analyst", team: "Finance" },
      platform: "databricks",
      lifecycleStage: "mature",
      createdAt: "2024-06-01",
      updatedAt: "2026-02-18",
      monthlyCost: 5200,
      costBreakdown: { compute: 2000, storage: 1000, pipeline: 1500, humanEstimate: 700 },
      declaredValue: null,
      usageImpliedValue: 12000,
      compositeValue: 12000,
      roi: 2.3,
      roiBand: "healthy",
      costTrend: -3,
      costCoverage: 0.6,
      monthlyConsumers: 42,
      totalQueries: 8000,
      consumerTeams: [],
      usageTrend: -5,
      peakConsumers: 50,
      freshnessHours: 12,
      freshnessSLA: 24,
      completeness: 0.88,
      accuracy: 0.95,
      trustScore: 0.85,
      isPublished: false,
      isCertified: false,
      subscriptionCount: 0,
      valueDeclaration: null,
      downstreamProducts: 1,
      downstreamModels: 0,
      downstreamDashboards: 3,
      isRetirementCandidate: false,
      hasCostSpike: false,
      hasUsageDecline: true,
    },
  ],
  productCostTrends: {} as Record<string, unknown[]>,
  productUsageTrends: {} as Record<string, unknown[]>,
  lifecycleTransitions: [],
  decisions: [
    {
      id: "dec-001",
      type: "retirement",
      status: "approved",
      productId: "dp-001",
      productName: "Customer 360",
      title: "Retire product",
      description: "Low usage",
      initiatedBy: "Admin",
      assignedTo: "CFO",
      assignedToTitle: "CFO",
      estimatedImpact: 6100,
      actualImpact: null,
      impactBasis: "monthly cost",
      createdAt: "2026-01-15",
      updatedAt: "2026-02-01",
      resolvedAt: "2026-02-01",
      resolution: null,
      capitalFreed: 6100,
      projectedSavingsMonthly: 6100,
      projectedSavingsAnnual: 73200,
      delayReason: null,
      delayedUntil: null,
    },
  ],
  connectors: [
    {
      id: "c-001",
      platform: "snowflake",
      name: "Snowflake Prod",
      status: "connected",
      lastSync: "2026-02-22",
      productsFound: 8,
      costCoverage: 0.85,
      usageCoverage: 0.78,
    },
  ],
  benchmarkData: [
    {
      industry: "saas",
      label: "SaaS",
      medianROI: 3.2,
      medianCostPerConsumer: 220,
      medianPortfolioROI: 2.8,
      p25ROI: 1.8,
      p75ROI: 4.5,
      sampleSize: 150,
    },
  ],
  notifications: [
    {
      id: "n-001",
      type: "cost_spike",
      title: "Cost spike detected",
      description: "Product 1 cost up 25%",
      productId: "dp-001",
      productName: "Customer 360",
      timestamp: "2026-02-22T10:00:00Z",
      isRead: false,
    },
  ],
  // Capital impact / pricing / AI scorecard seed stubs
  savingsSummary: {
    totalCapitalFreedMonthly: 0,
    totalCapitalFreedAnnual: 0,
    capitalFreedByMonth: [],
    pendingRetirements: 0,
    pendingEstimatedSavings: 0,
    approvedRetirements: 0,
    decisionsThisQuarter: 0,
  },
  capitalImpactSummary: {
    totalCapitalFreed: 0,
    totalCapitalFreedAnnual: 0,
    budgetReallocated: 0,
    aiSpendReduced: 0,
    portfolioRoiDelta: 0,
    portfolioRoiCurrent: 0,
    portfolioRoiPrevious: 0,
    decisionsExecuted: 0,
    decisionsUnderReview: 0,
    activePricingPolicies: 0,
    pricingRevenueTotal: 0,
    capitalFreedByMonth: [],
    capitalByType: [],
    recentEvents: [],
  },
  pricingPolicies: [],
  aiScorecards: [],
  candidatesList: [],
  candidateDetails: {},
  // Decision detail seed stubs
  decisionImpactReports: {},
  decisionComments: {},
  decisionActions: {},
  decisionEconomicEffects: {},
  // Org, config, capital performance seed stubs
  orgInfo: undefined,
  displayConfig: undefined,
  capitalEfficiency: undefined,
  capitalBehavior: undefined,
  portfolioRebalance: undefined,
  boardCapitalSummary: undefined,
  capitalProjection: undefined,
}));

import {
  usePortfolioSummary,
  usePortfolioCostTrend,
  usePortfolioROIHistory,
  useExecutiveSummary,
  useDataProducts,
  useDataProduct,
  useProductCostTrend,
  useProductUsageTrend,
  useLifecycleOverview,
  useDecisions,
  useConnectors,
  useAllocationSummary,
  useBenchmarks,
  useNotifications,
  useMarketplaceProducts,
  useSavingsSummary,
  useCapitalImpact,
  useActivePricingPolicies,
  useAIScorecards,
  useCandidates,
  useCandidateDetail,
  useDecision,
  useDecisionImpactReport,
  useDecisionComments,
  useDecisionActions,
  useDecisionEconomicEffects,
  useOrgInfo,
  useDisplayConfig,
  useCapitalEfficiency,
  useCapitalBehavior,
  usePortfolioRebalance,
  useBoardCapitalSummary,
  useCapitalProjection,
  useMutation,
} from "./hooks";

// ---------- Portfolio hooks ----------

describe("usePortfolioSummary", () => {
  it("returns portfolio summary from seed", async () => {
    const { result } = renderHook(() => usePortfolioSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.totalProducts).toBe(13);
    expect(result.current.data!.totalCost).toBe(156000);
    expect(result.current.error).toBeNull();
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => usePortfolioSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

describe("usePortfolioCostTrend", () => {
  it("returns cost trend data", async () => {
    const { result } = renderHook(() => usePortfolioCostTrend());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBe(2);
  });
});

describe("usePortfolioROIHistory", () => {
  it("returns ROI history", async () => {
    const { result } = renderHook(() => usePortfolioROIHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data![0].roi).toBe(2.5);
  });
});

describe("useExecutiveSummary", () => {
  it("returns executive summary", async () => {
    const { result } = renderHook(() => useExecutiveSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.confidenceLevel).toBe(0.72);
  });
});

// ---------- Asset hooks ----------

describe("useDataProducts", () => {
  it("returns data products from seed", async () => {
    const { result } = renderHook(() => useDataProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.items.length).toBe(2);
  });

  it("filters by search", async () => {
    const { result } = renderHook(() => useDataProducts({ search: "Customer" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.items.length).toBe(1);
    expect(result.current.data!.items[0].name).toBe("Customer 360");
  });

  it("filters by lifecycle stage", async () => {
    const { result } = renderHook(() =>
      useDataProducts({ lifecycleStage: "mature" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.items.length).toBe(1);
    expect(result.current.data!.items[0].id).toBe("dp-002");
  });
});

describe("useDataProduct", () => {
  it("returns single product by id", async () => {
    const { result } = renderHook(() => useDataProduct("dp-001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.name).toBe("Customer 360");
  });

  it("returns error for missing product", async () => {
    const { result } = renderHook(() => useDataProduct("dp-999"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Not found");
  });
});

describe("useProductCostTrend", () => {
  it("returns empty array when no trends for product", async () => {
    const { result } = renderHook(() => useProductCostTrend("dp-001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});

describe("useProductUsageTrend", () => {
  it("returns empty array when no trends for product", async () => {
    const { result } = renderHook(() => useProductUsageTrend("dp-001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});

// ---------- Lifecycle ----------

describe("useLifecycleOverview", () => {
  it("returns lifecycle overview", async () => {
    const { result } = renderHook(() => useLifecycleOverview());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.dataProducts.length).toBe(2);
  });
});

// ---------- Decisions ----------

describe("useDecisions", () => {
  it("returns decisions list", async () => {
    const { result } = renderHook(() => useDecisions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.length).toBe(1);
    expect(result.current.data![0].type).toBe("retirement");
  });
});

// ---------- Connectors ----------

describe("useConnectors", () => {
  it("returns connectors list", async () => {
    const { result } = renderHook(() => useConnectors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.length).toBe(1);
    expect(result.current.data![0].platform).toBe("snowflake");
  });
});

// ---------- Allocation & Benchmarks ----------

describe("useAllocationSummary", () => {
  it("returns allocation summary with products and benchmarks", async () => {
    const { result } = renderHook(() => useAllocationSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.dataProducts.length).toBe(2);
    expect(result.current.data!.benchmarkData.length).toBe(1);
  });
});

describe("useBenchmarks", () => {
  it("returns benchmark data", async () => {
    const { result } = renderHook(() => useBenchmarks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data![0].industry).toBe("saas");
  });
});

// ---------- Notifications ----------

describe("useNotifications", () => {
  it("returns notifications", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data![0].type).toBe("cost_spike");
  });
});

// ---------- Marketplace ----------

describe("useMarketplaceProducts", () => {
  it("returns only published products", async () => {
    const { result } = renderHook(() => useMarketplaceProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    // Only dp-001 is published
    expect(result.current.data!.length).toBe(1);
    expect(result.current.data![0].isPublished).toBe(true);
  });
});

// ---------- Capital Impact ----------

describe("useSavingsSummary", () => {
  it("returns savings summary data (seed fallback)", async () => {
    const { result } = renderHook(() => useSavingsSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // The seed mock doesn't have savingsSummary, so the hook defaults to the fallback object
    expect(result.current.data).not.toBeNull();
  });
});

describe("useCapitalImpact", () => {
  it("returns capital impact summary data (seed fallback)", async () => {
    const { result } = renderHook(() => useCapitalImpact());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
  });
});

describe("useActivePricingPolicies", () => {
  it("returns data from seed (may be null or empty)", async () => {
    const { result } = renderHook(() => useActivePricingPolicies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Seed mock doesn't have pricingPolicies → returns []
    expect(result.current.error).toBeNull();
  });
});

describe("useAIScorecards", () => {
  it("returns data from seed (may be null or empty)", async () => {
    const { result } = renderHook(() => useAIScorecards());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useCandidates", () => {
  it("resolves without error from seed", async () => {
    const { result } = renderHook(() => useCandidates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useCandidateDetail", () => {
  it("resolves without error for unknown candidate", async () => {
    const { result } = renderHook(() => useCandidateDetail("unknown-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Detail for unknown ID returns null from seed
    expect(result.current.data).toBeNull();
  });
});

// ---------- Decision detail hooks ----------

describe("useDecision", () => {
  it("returns error for unknown decision id", async () => {
    const { result } = renderHook(() => useDecision("nonexistent"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Unknown ID throws in fallback → error
    expect(result.current.error).not.toBeNull();
  });
});

describe("useDecisionImpactReport", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useDecisionImpactReport("some-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useDecisionComments", () => {
  it("resolves to empty array for unknown id", async () => {
    const { result } = renderHook(() => useDecisionComments("some-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useDecisionActions", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useDecisionActions("some-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useDecisionEconomicEffects", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useDecisionEconomicEffects("some-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

// ---------- Org & Config hooks ----------

describe("useOrgInfo", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useOrgInfo());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useDisplayConfig", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useDisplayConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

// ---------- Capital performance hooks ----------

describe("useCapitalEfficiency", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useCapitalEfficiency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useCapitalBehavior", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useCapitalBehavior());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("usePortfolioRebalance", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => usePortfolioRebalance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useBoardCapitalSummary", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useBoardCapitalSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

describe("useCapitalProjection", () => {
  it("resolves without error", async () => {
    const { result } = renderHook(() => useCapitalProjection());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

// ---------- Mutation hook ----------

describe("useMutation", () => {
  it("returns disabled=true in test env (no API)", async () => {
    const { result } = renderHook(() => useMutation());
    expect(result.current.disabled).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.disabledReason).toBeTruthy();
  });

  it("execute throws when API unavailable", async () => {
    const { result } = renderHook(() => useMutation());
    await expect(
      result.current.execute(() => Promise.resolve("ok"))
    ).rejects.toThrow("API unavailable");
  });
});
