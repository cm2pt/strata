/**
 * Strata — Data Hooks
 *
 * When the API is configured (NEXT_PUBLIC_API_URL), data comes from the real backend.
 * When not configured, falls back to seed.ts imports seamlessly.
 *
 * Usage:  const { data, loading, error } = usePortfolioSummary();
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { apiGet, apiPost, apiPatch, isAPIEnabled, canMutate, isDemoMode } from "./client";
import {
  validateResponse,
  DataProductSchema,
  DecisionSchema,
  CandidateListItemSchema,
  PortfolioSummarySchema,
} from "./schemas";

// Pre-built array schemas for hooks (avoids creating new references on each render)
const DataProductListResponseSchema = z.object({
  items: z.array(DataProductSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
}).passthrough();
const DecisionArraySchema = z.array(DecisionSchema);
const CandidateListItemArraySchema = z.array(CandidateListItemSchema);
import type {
  DataProduct,
  PortfolioSummary,
  CostTrendPoint,
  ROIHistoryPoint,
  ExecutiveSummary,
  Decision,
  DecisionComment,
  DecisionAction,
  DecisionEconomicEffect,
  Connector,
  BenchmarkDataPoint,
  Notification,
  LifecycleTransition,
  UsageTrendPoint,
  SavingsSummary,
  CapitalImpactSummary,
  PricingPolicy,
  AIProjectScorecard,
  CandidateListItem,
  CandidateDetail,
  OrgInfo,
  DisplayConfig,
  CEIResponse,
  CapitalBehavior,
  PortfolioRebalance,
  BoardCapitalSummary,
  ImpactReport,
  CapitalProjectionResponse,
  ConnectorDepthOverview,
  SyncLogList,
  ExtractionMatrixResponse,
  AutomationSummary,
  AssetProvenance,
  LineageNodeSearchResponse,
  LineageNodeDetail,
  LineageGraphResponse,
} from "@/lib/types";

// Lazy-load seed data only if API is not enabled (tree-shaken in production)
async function getSeed() {
  return import("@/lib/mock-data/seed");
}

async function getConnectorDepthSeed() {
  return import("@/lib/mock-data/connector-depth-seed");
}

async function getLineageSeed() {
  return import("@/lib/mock-data/lineage-seed");
}

// ─── Generic Hook ─────────────────────────────────────────────────────────────

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Simple in-memory cache to prevent refetching recently-fetched data */
const DATA_CACHE = new Map<string, { data: unknown; fetchedAt: number }>();

/** Stale-after duration for tab-visibility refetch (30 seconds) */
const VISIBILITY_STALE_MS = 30_000;

function useData<T>(
  apiPath: string,
  seedFn: () => Promise<T>,
  staleTimeMs = 0,
  schema?: z.ZodType<T>,
  options?: { isEmpty?: (data: T) => boolean },
): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const lastFetchAtRef = useRef(0);

  // Stable refs for options to avoid unnecessary re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const seedFnRef = useRef(seedFn);
  seedFnRef.current = seedFn;

  const fetchData = useCallback(async () => {
    // Check cache before fetching
    if (staleTimeMs > 0) {
      const cached = DATA_CACHE.get(apiPath);
      if (cached && Date.now() - cached.fetchedAt < staleTimeMs) {
        setData(cached.data as T);
        setLoading(false);
        return;
      }
    }

    // In demo mode, always fall back to seed on API error or empty data.
    // Demo data is expected to be fabricated anyway, so showing seed data
    // is always better than showing empty pages.
    const demoFallback = isDemoMode;
    const hasEmptyCheck = !!optionsRef.current?.isEmpty;

    setLoading(true);
    setError(null);
    try {
      let result: T;
      if (isAPIEnabled) {
        result = await apiGet<T>(apiPath);
      } else {
        result = await seedFnRef.current();
      }

      // In demo mode, if API returned empty data, fall back to seed
      if (demoFallback && hasEmptyCheck && optionsRef.current?.isEmpty?.(result)) {
        result = await seedFnRef.current();
      }

      // Optional runtime validation (warns in dev, never throws)
      if (schema) {
        result = validateResponse(schema, result, apiPath);
      }

      if (mountedRef.current) setData(result);
      lastFetchAtRef.current = Date.now();
      if (staleTimeMs > 0) {
        DATA_CACHE.set(apiPath, { data: result, fetchedAt: Date.now() });
      }
    } catch (e) {
      if (!mountedRef.current) return;

      // In demo mode, use seed data on API error (any hook, not just opt-in ones).
      // Demo data is always fabricated, so seed is a better UX than empty/error state.
      if (demoFallback) {
        try {
          const fallback = await seedFnRef.current();
          if (mountedRef.current) setData(fallback);
          lastFetchAtRef.current = Date.now();
          return;
        } catch { /* seed also failed, fall through to error */ }
      }

      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      // NOTE: In production (non-demo) mode, we intentionally do NOT fall back
      // to seed data when API is enabled. Serving mock data on API failure would
      // silently mask production errors and present fabricated financial data as
      // real — a critical data integrity risk.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiPath, staleTimeMs, schema]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // Refetch stale data when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        lastFetchAtRef.current > 0 &&
        Date.now() - lastFetchAtRef.current > VISIBILITY_STALE_MS
      ) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function usePortfolioSummary() {
  return useData<PortfolioSummary>(
    "/portfolio/summary",
    async () => (await getSeed()).portfolioSummary,
    0,
    PortfolioSummarySchema,
  );
}

export function usePortfolioCostTrend() {
  return useData<CostTrendPoint[]>(
    "/portfolio/cost-trend",
    async () => (await getSeed()).portfolioCostTrend,
    0,
    undefined,
    { isEmpty: (d) => !d?.length },
  );
}

export function usePortfolioROIHistory() {
  return useData<ROIHistoryPoint[]>(
    "/portfolio/roi-history",
    async () => (await getSeed()).portfolioROIHistory,
    0,
    undefined,
    { isEmpty: (d) => !d?.length },
  );
}

export function useExecutiveSummary() {
  return useData<ExecutiveSummary>(
    "/portfolio/executive-summary",
    async () => (await getSeed()).executiveSummary,
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export function useDataProducts(params?: {
  search?: string;
  lifecycleStage?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.lifecycleStage) query.set("lifecycle_stage", params.lifecycleStage);
  if (params?.sortBy) query.set("sort_by", params.sortBy);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("page_size", String(params.pageSize));
  const qs = query.toString();

  return useData<{ items: DataProduct[]; total: number; page: number; pageSize: number }>(
    `/assets/${qs ? "?" + qs : ""}`,
    async () => {
      const seed = await getSeed();
      let items = [...seed.dataProducts];
      if (params?.search) {
        const s = params.search.toLowerCase();
        items = items.filter(
          (d) =>
            d.name.toLowerCase().includes(s) ||
            d.domain.toLowerCase().includes(s),
        );
      }
      if (params?.lifecycleStage) {
        items = items.filter((d) => d.lifecycleStage === params.lifecycleStage);
      }
      return { items, total: items.length, page: 1, pageSize: items.length };
    },
    0,
    DataProductListResponseSchema,
    { isEmpty: (d) => !d?.items?.length },
  );
}

export function useDataProduct(id: string) {
  return useData<DataProduct>(
    `/assets/${id}`,
    async () => {
      const seed = await getSeed();
      const found = seed.dataProducts.find((d) => d.id === id);
      if (!found) throw new Error("Not found");
      return found;
    },
  );
}

interface AssetMetricsResponse {
  costTrend: CostTrendPoint[];
  usageTrend: UsageTrendPoint[];
  roiHistory: ROIHistoryPoint[];
}

function useAssetMetrics(id: string) {
  return useData<AssetMetricsResponse>(
    `/assets/${id}/metrics`,
    async () => {
      const seed = await getSeed();
      return {
        costTrend: seed.productCostTrends[id] || [],
        usageTrend: seed.productUsageTrends[id] || [],
        roiHistory: [],
      };
    },
  );
}

export function useProductCostTrend(id: string) {
  const { data, loading, error, refetch } = useAssetMetrics(id);
  return { data: data?.costTrend ?? null, loading, error, refetch };
}

export function useProductUsageTrend(id: string) {
  const { data, loading, error, refetch } = useAssetMetrics(id);
  return { data: data?.usageTrend ?? null, loading, error, refetch };
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export function useLifecycleOverview() {
  return useData(
    "/lifecycle/overview",
    async () => {
      const seed = await getSeed();
      return {
        dataProducts: seed.dataProducts,
        lifecycleTransitions: seed.lifecycleTransitions,
      };
    },
  );
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export function useDecisions(params?: { status?: string; type?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.type) query.set("type", params.type);
  const qs = query.toString();

  return useData<Decision[]>(
    `/decisions/${qs ? "?" + qs : ""}`,
    async () => (await getSeed()).decisions,
    0,
    DecisionArraySchema,
    { isEmpty: (d) => !d?.length },
  );
}

export function useDecision(id: string) {
  return useData<Decision>(
    `/decisions/${id}`,
    async () => {
      const seed = await getSeed();
      const found = seed.decisions.find((d) => d.id === id);
      if (!found) throw new Error("Decision not found");
      return found;
    },
  );
}

export function useDecisionImpactReport(id: string) {
  return useData<ImpactReport>(
    `/decisions/${id}/impact-report`,
    async () => {
      const seed = await getSeed();
      const reports = seed.decisionImpactReports ?? {};
      return reports[id] ?? null;
    },
  );
}

export function useDecisionComments(id: string) {
  return useData<DecisionComment[]>(
    `/decisions/${id}/comments`,
    async () => {
      const seed = await getSeed();
      const comments = seed.decisionComments ?? {};
      return comments[id] ?? [];
    },
  );
}

export function useDecisionActions(id: string) {
  return useData<DecisionAction[]>(
    `/decisions/${id}/actions`,
    async () => {
      const seed = await getSeed();
      const actions = seed.decisionActions ?? {};
      return actions[id] ?? [];
    },
  );
}

export function useDecisionEconomicEffects(id: string) {
  return useData<DecisionEconomicEffect[]>(
    `/decisions/${id}/economic-effects`,
    async () => {
      const seed = await getSeed();
      const effects = seed.decisionEconomicEffects ?? {};
      return effects[id] ?? [];
    },
  );
}

// ─── Connectors ───────────────────────────────────────────────────────────────

export function useConnectors() {
  return useData<Connector[]>(
    "/connectors/",
    async () => (await getSeed()).connectors,
    0,
    undefined,
    { isEmpty: (d) => !d?.length },
  );
}

// ─── Allocation & Benchmarks ──────────────────────────────────────────────────

export function useAllocationSummary() {
  return useData(
    "/allocation/summary",
    async () => {
      const seed = await getSeed();
      return {
        dataProducts: seed.dataProducts,
        benchmarkData: seed.benchmarkData,
      };
    },
  );
}

export function useBenchmarks() {
  return useData<BenchmarkDataPoint[]>(
    "/benchmarks/",
    async () => (await getSeed()).benchmarkData,
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  return useData<Notification[]>(
    "/notifications/",
    async () => (await getSeed()).notifications,
    0,
    undefined,
    { isEmpty: (d) => !d?.length },
  );
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export function useMarketplaceProducts() {
  return useData<DataProduct[]>(
    "/marketplace/products",
    async () => {
      const seed = await getSeed();
      return seed.dataProducts
        .filter((d) => d.isPublished)
        .map((d) => ({
          ...d,
          isSubscribed: d.id === "dp-001" || d.id === "dp-002",
        }));
    },
    0,
    undefined,
    { isEmpty: (d) => !d?.length },
  );
}

// ─── Capital Impact ──────────────────────────────────────────────────────────

export function useSavingsSummary() {
  return useData<SavingsSummary>(
    "/decisions/savings-summary",
    async () => {
      const seed = await getSeed();
      return seed.savingsSummary ?? {
        totalCapitalFreedMonthly: 0,
        totalCapitalFreedAnnual: 0,
        capitalFreedByMonth: [],
        pendingRetirements: 0,
        pendingEstimatedSavings: 0,
        approvedRetirements: 0,
        decisionsThisQuarter: 0,
      };
    },
  );
}

export function useCapitalImpact() {
  return useData<CapitalImpactSummary>(
    "/capital-impact/summary",
    async () => {
      const seed = await getSeed();
      return seed.capitalImpactSummary ?? {
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
      };
    },
  );
}

export function useActivePricingPolicies() {
  return useData<PricingPolicy[]>(
    "/pricing/policies/active",
    async () => {
      const seed = await getSeed();
      return seed.pricingPolicies ?? [];
    },
  );
}

export function useAIScorecards() {
  return useData<AIProjectScorecard[]>(
    "/ai-scorecard/products",
    async () => {
      const seed = await getSeed();
      return seed.aiScorecards ?? [];
    },
  );
}

// --- Candidates ---

export function useCandidates() {
  return useData<CandidateListItem[]>(
    "/candidates/",
    async () => {
      const seed = await getSeed();
      return seed.candidatesList ?? [];
    },
    0,
    CandidateListItemArraySchema,
    { isEmpty: (d) => !d?.length },
  );
}

export function useCandidateDetail(candidateId: string) {
  return useData<CandidateDetail>(
    `/candidates/${candidateId}`,
    async () => {
      const seed = await getSeed();
      const details = seed.candidateDetails ?? {};
      return details[candidateId] ?? null;
    },
  );
}

// --- Organization Info ---

export function useOrgInfo() {
  return useData<OrgInfo>(
    "/org-info/",
    async () => {
      const seed = await getSeed();
      return seed.orgInfo;
    },
  );
}

// --- Display Configuration ---

export function useDisplayConfig() {
  return useData<DisplayConfig>(
    "/display-config/",
    async () => {
      const seed = await getSeed();
      return seed.displayConfig;
    },
  );
}

// --- Capital Performance ---

export function useCapitalEfficiency() {
  return useData<CEIResponse>(
    "/capital-efficiency/",
    async () => {
      const seed = await getSeed();
      return seed.capitalEfficiency;
    },
  );
}

export function useCapitalBehavior() {
  return useData<CapitalBehavior>(
    "/capital-behavior/",
    async () => {
      const seed = await getSeed();
      return seed.capitalBehavior;
    },
  );
}

export function usePortfolioRebalance() {
  return useData<PortfolioRebalance>(
    "/allocation/portfolio-rebalance",
    async () => {
      const seed = await getSeed();
      return seed.portfolioRebalance;
    },
  );
}

export function useBoardCapitalSummary() {
  return useData<BoardCapitalSummary>(
    "/board/capital-summary",
    async () => {
      const seed = await getSeed();
      return seed.boardCapitalSummary;
    },
  );
}

export function useCapitalProjection() {
  return useData<CapitalProjectionResponse>(
    "/capital-projection/",
    async () => (await getSeed()).capitalProjection,
  );
}

// ─── Connector Depth & Transparency ─────────────────────────────────────────

export function useConnectorDepth() {
  return useData<ConnectorDepthOverview>(
    "/connector-depth/depth",
    async () => (await getConnectorDepthSeed()).seedConnectorDepth(),
  );
}

export function useConnectorSyncLog(connectorId: string) {
  return useData<SyncLogList>(
    `/connector-depth/${connectorId}/sync-log`,
    async () => (await getConnectorDepthSeed()).seedSyncLog(connectorId),
  );
}

export function useExtractionMatrix(connectorId: string) {
  return useData<ExtractionMatrixResponse>(
    `/connector-depth/${connectorId}/extraction-matrix`,
    async () => (await getConnectorDepthSeed()).seedExtractionMatrix(connectorId),
  );
}

export function useAutomationSummary() {
  return useData<AutomationSummary>(
    "/connector-depth/automation-summary",
    async () => (await getConnectorDepthSeed()).seedAutomationSummary(),
  );
}

export function useAssetProvenance(productId: string) {
  return useData<AssetProvenance>(
    `/connector-depth/assets/${productId}/provenance`,
    async () => (await getConnectorDepthSeed()).seedAssetProvenance(productId),
  );
}

// ─── Lineage Hooks ────────────────────────────────────────────────────────────

export function useLineageNodes(params?: {
  q?: string;
  nodeType?: string;
  platform?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.nodeType) searchParams.set("node_type", params.nodeType);
  if (params?.platform) searchParams.set("platform", params.platform);
  if (params?.domain) searchParams.set("domain", params.domain);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  const path = `/lineage/nodes${qs ? `?${qs}` : ""}`;

  return useData<LineageNodeSearchResponse>(
    path,
    async () => (await getLineageSeed()).seedLineageNodes(params),
    0,
    undefined,
    {
      isEmpty: (d) => !d?.items?.length,
    },
  );
}

export function useLineageNodeDetail(nodeId: string | null) {
  const safePath = nodeId ? `/lineage/node/${nodeId}` : `/__noop__/lineage-node`;
  return useData<LineageNodeDetail>(
    safePath,
    async () => (await getLineageSeed()).seedLineageNodeDetail(nodeId ?? ""),
  );
}

export function useLineageGraph(params: {
  rootNodeId: string | null;
  direction?: "upstream" | "downstream" | "both";
  depth?: number;
}) {
  const { rootNodeId, direction = "both", depth = 3 } = params;
  const safePath = rootNodeId
    ? `/lineage/graph?root_node_id=${rootNodeId}&direction=${direction}&depth=${depth}`
    : `/__noop__/lineage-graph`;

  return useData<LineageGraphResponse>(
    safePath,
    async () => (await getLineageSeed()).seedLineageGraph(rootNodeId ?? "", direction, depth),
    0,
    undefined,
    {
      isEmpty: (d) => !d?.nodes?.length,
    },
  );
}

// ─── Capital Intelligence Engine ─────────────────────────────────────────────

const getEngine = () => import("@/lib/engine");

export function useEconomicSignals() {
  return useData<import("@/lib/engine").EconomicSignalResult[]>(
    "/engine/economic-scores",
    async () => {
      const [seed, engine] = await Promise.all([getSeed(), getEngine()]);
      return engine.computeEconomicSignals(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
      );
    },
  );
}

export function useOpportunityCost() {
  return useData<import("@/lib/engine").OpportunityCostResult>(
    "/engine/opportunity-cost",
    async () => {
      const [seed, engine] = await Promise.all([getSeed(), getEngine()]);
      const signals = engine.computeEconomicSignals(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
      );
      return engine.computeOpportunityCost(seed.dataProducts, seed.decisions, signals);
    },
  );
}

export function usePortfolioFrontier() {
  return useData<import("@/lib/engine").FrontierResult>(
    "/engine/frontier",
    async () => {
      const [seed, engine] = await Promise.all([getSeed(), getEngine()]);
      const signals = engine.computeEconomicSignals(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
      );
      return engine.computePortfolioFrontier(seed.dataProducts, signals);
    },
  );
}

export function useValueAttribution() {
  return useData<import("@/lib/engine").AttributionResult>(
    "/engine/value-attribution",
    async () => {
      const [seed, engine] = await Promise.all([getSeed(), getEngine()]);
      const signals = engine.computeEconomicSignals(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
      );
      return engine.computeValueAttribution(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
        signals,
      );
    },
  );
}

export function usePortfolioOptimization() {
  return useData<{
    signals: import("@/lib/engine").PortfolioSignalSummary;
    opportunityCost: import("@/lib/engine").OpportunityCostResult;
    frontier: import("@/lib/engine").FrontierResult;
  }>(
    "/engine/portfolio-optimization",
    async () => {
      const [seed, engine] = await Promise.all([getSeed(), getEngine()]);
      const signalResults = engine.computeEconomicSignals(
        seed.dataProducts,
        seed.decisions,
        seed.capitalEvents,
      );
      return {
        signals: engine.computePortfolioSignalSummary(signalResults),
        opportunityCost: engine.computeOpportunityCost(seed.dataProducts, seed.decisions, signalResults),
        frontier: engine.computePortfolioFrontier(seed.dataProducts, signalResults),
      };
    },
  );
}

// ─── Mutation Hook ───────────────────────────────────────────────────────────

/**
 * Generic mutation hook that gates writes behind canMutate.
 *
 * - If API is unavailable, `execute` returns a rejected promise.
 * - On API error, the error is surfaced (not silently swallowed).
 * - `disabled` is true when mutations are blocked (offline demo mode).
 * - `disabledReason` provides the tooltip text for disabled buttons.
 *
 * Usage:
 *   const { execute, loading, disabled, disabledReason } = useMutation<ResponseType>();
 *   // In click handler:
 *   const result = await execute(() => apiPost("/some/path", payload));
 */
export interface UseMutationResult<T> {
  execute: (fn: () => Promise<T>) => Promise<T>;
  loading: boolean;
  disabled: boolean;
  disabledReason: string;
}

export function useMutation<T = unknown>(): UseMutationResult<T> {
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    if (!canMutate) {
      throw new Error("API unavailable in offline demo mode");
    }
    if (inFlightRef.current) {
      throw new Error("Mutation already in progress");
    }
    inFlightRef.current = true;
    setLoading(true);
    try {
      const result = await fn();
      return result;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  return {
    execute,
    loading,
    disabled: !canMutate,
    disabledReason: canMutate ? "" : "API unavailable in offline demo mode",
  };
}

// ─── Value Declaration Mutation ──────────────────────────────────────────────

export interface ValueDeclarationPayload {
  productId: string;
  value: number;
  method: "revenue_attribution" | "cost_avoidance" | "efficiency_gain" | "compliance" | "strategic";
  basis: string;
}

/**
 * Mutates a product's declared value.
 *
 * In demo mode: updates the seed data in-memory and invalidates the cache
 * so all hooks refetch with the new values.
 * In API mode: sends PATCH to /assets/:id/value.
 */
export function useUpdateProductValue() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (payload: ValueDeclarationPayload) => {
    setLoading(true);
    try {
      if (isAPIEnabled && canMutate) {
        await apiPatch(`/assets/${payload.productId}/value`, payload);
      } else {
        // Demo mode: update seed data in-place
        const seed = await getSeed();
        const product = seed.dataProducts.find((p) => p.id === payload.productId);
        if (!product) throw new Error(`Product ${payload.productId} not found`);

        // Update declared value and recompute derived fields
        const { computeCompositeValue, computeProductROI, classifyROI } = await import("@/lib/metrics/canonical");
        product.declaredValue = payload.value;
        product.compositeValue = computeCompositeValue(payload.value, product.usageImpliedValue);
        product.roi = computeProductROI(product.compositeValue, product.monthlyCost);
        product.roiBand = classifyROI(product.roi) ?? "critical";
        product.valueSource = "blended";
        product.valueDeclaration = {
          declaredBy: "Demo User",
          declaredByTitle: "Data Analyst",
          method: payload.method,
          value: payload.value,
          basis: payload.basis,
          status: ["peer_reviewed"],
          declaredAt: new Date().toISOString().slice(0, 10),
          nextReview: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
          isExpiring: false,
        };

        // Invalidate all cached data so hooks refetch from updated seed
        DATA_CACHE.clear();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading };
}

/** Re-export canMutate for convenience */
export { canMutate } from "./client";
