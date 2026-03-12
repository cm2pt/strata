/**
 * Strata -- API Endpoint Registry
 *
 * Centralized endpoint paths for the Strata API.
 * All paths are relative to API_BASE (which is NEXT_PUBLIC_API_URL,
 * typically ending with /api/v1).
 *
 * Matches the backend routers defined in:
 *   apps/api/app/api/v1/router.py
 *   apps/api/app/main.py  (prefix="/api/v1")
 *
 * NOTE: The frontend hooks (hooks.ts) pass these paths directly to
 * `apiFetch()`, which prepends API_BASE. Since API_BASE already
 * includes "/api/v1", the paths here omit that prefix.
 */

export const API_ENDPOINTS = {
  // ── Auth ────────────────────────────────────────────────────
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGIN: "/auth/login",
  AUTH_DEMO_LOGIN: "/auth/demo-login",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_ME: "/auth/me",
  AUTH_DEMO_PERSONAS: "/auth/demo-personas",

  // ── Portfolio ───────────────────────────────────────────────
  PORTFOLIO_SUMMARY: "/portfolio/summary",
  PORTFOLIO_COST_TREND: "/portfolio/cost-trend",
  PORTFOLIO_ROI_HISTORY: "/portfolio/roi-history",
  PORTFOLIO_EXECUTIVE_SUMMARY: "/portfolio/executive-summary",

  // ── Assets (Data Products) ─────────────────────────────────
  ASSETS: "/assets/",
  ASSET: (id: string) => `/assets/${id}` as const,
  ASSET_METRICS: (id: string) => `/assets/${id}/metrics` as const,
  /** POST — create a new data product */
  ASSETS_CREATE: "/assets/",

  // ── Lifecycle ───────────────────────────────────────────────
  LIFECYCLE_OVERVIEW: "/lifecycle/overview",

  // ── Decisions ───────────────────────────────────────────────
  DECISIONS: "/decisions/",
  DECISION: (id: string) => `/decisions/${id}` as const,
  DECISION_COMMENTS: (id: string) => `/decisions/${id}/comments` as const,
  DECISION_ACTIONS: (id: string) => `/decisions/${id}/actions` as const,
  DECISION_ECONOMIC_EFFECTS: (id: string) =>
    `/decisions/${id}/economic-effects` as const,
  DECISION_IMPACT_REPORT: (id: string) =>
    `/decisions/${id}/impact-report` as const,
  /** POST — approve a retirement decision */
  DECISION_APPROVE_RETIREMENT: (id: string) =>
    `/decisions/${id}/approve-retirement` as const,
  /** POST — delay a retirement decision */
  DECISION_DELAY_RETIREMENT: (id: string) =>
    `/decisions/${id}/delay-retirement` as const,
  DECISIONS_SAVINGS_SUMMARY: "/decisions/savings-summary",
  /** POST — trigger validation sweep */
  DECISIONS_RUN_VALIDATION_SWEEP: "/decisions/run-validation-sweep",

  // ── Connectors ──────────────────────────────────────────────
  CONNECTORS: "/connectors/",
  /** POST — create a new connector */
  CONNECTORS_CREATE: "/connectors/",
  CONNECTOR_TEST: (id: string) => `/connectors/${id}/test` as const,
  CONNECTOR_RUN: (id: string) => `/connectors/${id}/run` as const,

  // ── Allocation ──────────────────────────────────────────────
  ALLOCATION_SUMMARY: "/allocation/summary",
  ALLOCATION_APPROVE_REALLOCATION: "/allocation/approve-reallocation",
  ALLOCATION_PORTFOLIO_REBALANCE: "/allocation/portfolio-rebalance",

  // ── Benchmarks ──────────────────────────────────────────────
  BENCHMARKS: "/benchmarks/",

  // ── Simulate ────────────────────────────────────────────────
  SIMULATE_PRICING: "/simulate/pricing",

  // ── Marketplace ─────────────────────────────────────────────
  MARKETPLACE_PRODUCTS: "/marketplace/products",
  MARKETPLACE_SUBSCRIBE: "/marketplace/subscribe",

  // ── Capital Impact ──────────────────────────────────────────
  CAPITAL_IMPACT_SUMMARY: "/capital-impact/summary",

  // ── Pricing ─────────────────────────────────────────────────
  PRICING_ACTIVATE: "/pricing/activate",
  PRICING_POLICIES: "/pricing/policies",
  PRICING_POLICIES_ACTIVE: "/pricing/policies/active",
  PRICING_POLICY: (id: string) => `/pricing/policies/${id}` as const,

  // ── AI Scorecard ────────────────────────────────────────────
  AI_SCORECARD_PRODUCTS: "/ai-scorecard/products",
  AI_SCORECARD_FLAG: (productId: string) =>
    `/ai-scorecard/${productId}/flag` as const,
  AI_SCORECARD_KILL: (productId: string) =>
    `/ai-scorecard/${productId}/kill` as const,

  // ── Notifications ───────────────────────────────────────────
  NOTIFICATIONS: "/notifications/",
  NOTIFICATION_MARK_READ: (id: string) =>
    `/notifications/${id}/read` as const,
  NOTIFICATIONS_MARK_ALL_READ: "/notifications/mark-all-read",

  // ── Candidates ──────────────────────────────────────────────
  CANDIDATES: "/candidates/",
  CANDIDATE: (candidateId: string) => `/candidates/${candidateId}` as const,
  CANDIDATE_PROMOTE: (candidateId: string) =>
    `/candidates/${candidateId}/promote` as const,
  CANDIDATE_IGNORE: (candidateId: string) =>
    `/candidates/${candidateId}/ignore` as const,
  CANDIDATE_FLAG_RETIREMENT: (candidateId: string) =>
    `/candidates/${candidateId}/flag-retirement` as const,
  CANDIDATES_INGEST: "/candidates/ingest",

  // ── Capital Efficiency ──────────────────────────────────────
  CAPITAL_EFFICIENCY: "/capital-efficiency/",

  // ── Enforcement ─────────────────────────────────────────────
  ENFORCEMENT_RUN_SWEEP: "/enforcement/run-sweep",

  // ── Board ───────────────────────────────────────────────────
  BOARD_CAPITAL_SUMMARY: "/board/capital-summary",

  // ── Organization Info ───────────────────────────────────────
  ORG_INFO: "/org-info/",

  // ── Display Configuration ───────────────────────────────────
  DISPLAY_CONFIG: "/display-config/",

  // ── Capital Behavior ────────────────────────────────────────
  CAPITAL_BEHAVIOR: "/capital-behavior/",

  // ── Capital Projection ──────────────────────────────────────
  CAPITAL_PROJECTION: "/capital-projection/",
} as const;
