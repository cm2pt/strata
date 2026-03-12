/**
 * Strata — Client-Side Permission Utilities
 *
 * Maps routes to required permissions and provides reusable
 * helpers for permission-gated UI rendering.
 *
 * These are convenience guards only — the backend enforces
 * all permissions via require_permission() on every endpoint.
 */

// ──────────────────────────────────────────────────────────────────────
// Permission String Constants
// Use these instead of raw strings to prevent typos.
// ──────────────────────────────────────────────────────────────────────

export const PERM = {
  // Portfolio
  PORTFOLIO_READ: "portfolio:read",

  // Candidates
  CANDIDATES_READ: "candidates:read",
  CANDIDATES_PROMOTE: "candidates:promote",
  CANDIDATES_IGNORE: "candidates:ignore",

  // Products / Assets
  PRODUCTS_READ: "products:read",

  // Lifecycle
  LIFECYCLE_READ: "lifecycle:read",

  // Decisions
  DECISIONS_READ: "decisions:read",
  DECISIONS_CREATE: "decisions:create",
  DECISIONS_APPROVE: "decisions:approve",

  // Allocation
  ALLOCATION_READ: "allocation:read",

  // Capital
  CAPITAL_READ: "capital:read",

  // AI Scorecard
  AI_READ: "ai:read",
  AI_FLAG: "ai:flag",
  AI_KILL_EXECUTE: "ai:kill_execute",

  // Marketplace
  MARKETPLACE_READ: "marketplace:read",

  // Pricing / Simulate
  PRICING_SIMULATE: "pricing:simulate",
  PRICING_ACTIVATE: "pricing:activate",

  // Connectors / Setup
  CONNECTORS_READ: "connectors:read",
} as const;

export type Permission = (typeof PERM)[keyof typeof PERM];

// ──────────────────────────────────────────────────────────────────────
// Route → required permission mapping
// ──────────────────────────────────────────────────────────────────────

/**
 * Maps each dashboard route to the backend permission required
 * to view that section. Used by the sidebar to hide inaccessible
 * routes and by the route guard to redirect unauthorized users.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/portfolio": "portfolio:read",
  "/candidates": "candidates:read",
  "/assets": "products:read",
  "/lifecycle": "lifecycle:read",
  "/decisions": "decisions:read",
  "/allocation": "allocation:read",
  "/capital-impact": "capital:read",
  "/capital-review": "capital:read",
  "/capital-projection": "capital:read",
  "/ai-scorecard": "ai:read",
  "/marketplace": "marketplace:read",
  "/simulate": "pricing:simulate",
  "/lineage": "connectors:read",
  "/connectors/depth": "connectors:read",
  "/setup": "connectors:read",
};

/**
 * Given a pathname, return the required permission (if any).
 * Matches the longest prefix in ROUTE_PERMISSIONS.
 */
export function getRequiredPermission(pathname: string): string | null {
  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];

  // Prefix match (e.g. /candidates/abc → candidates:read)
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route + "/") || pathname === route) {
      return perm;
    }
  }
  return null;
}
