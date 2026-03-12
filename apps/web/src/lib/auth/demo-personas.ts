/**
 * Strata — Client-Side Demo Personas
 *
 * Static persona definitions that mirror the backend's rbac.py role registry.
 * Used when NEXT_PUBLIC_DEMO_MODE=true and the backend is not reachable.
 *
 * Each persona includes full role metadata (permissions, nav priority, focus route)
 * so the entire app works identically to a backend-authenticated session.
 */

import type { DemoPersona, AuthUser, RoleMeta, UserRole } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────
// All permissions (mirrors backend ALL_PERMISSIONS)
// ──────────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  "connectors:read", "connectors:write", "connectors:run",
  "candidates:read", "candidates:promote", "candidates:ignore",
  "products:read", "products:write", "products:certify",
  "marketplace:read", "marketplace:subscribe",
  "decisions:read", "decisions:create", "decisions:approve", "decisions:execute",
  "pricing:simulate", "pricing:activate",
  "ai:read", "ai:flag", "ai:kill_approve", "ai:kill_execute",
  "capital:read", "capital:export",
  "portfolio:read",
  "lifecycle:read",
  "allocation:read",
  "notifications:read",
  "users:read", "users:write",
  "audit:read",
];

// ──────────────────────────────────────────────────────────────────────
// Persona + Role Metadata definitions
// ──────────────────────────────────────────────────────────────────────

interface SeedPersona {
  roleId: UserRole;
  displayName: string;
  description: string;
  defaultFocusRoute: string;
  navPriority: string[];
  permissions: string[];
  /** Demo user display name */
  name: string;
  /** Demo user email */
  email: string;
  /** Demo user job title */
  title: string;
}

// Personas are ordered by deal importance tier:
// Tier 1 (Deal Makers): CFO, CDO, Product Owner
// Tier 2 (Deal Accelerators): FP&A, Head of AI, Governance Steward
// Tier 3 (Supporting Cast): Everyone else
const SEED_PERSONAS: SeedPersona[] = [
  // ── Tier 1: Deal Makers ───────────────────────────────────────
  {
    roleId: "cfo",
    displayName: "CFO",
    description: "Chief Financial Officer — financial oversight of data capital",
    defaultFocusRoute: "/capital-impact",
    navPriority: ["/capital-impact", "/portfolio", "/decisions", "/allocation"],
    permissions: [
      "portfolio:read", "products:read", "decisions:read", "decisions:approve",
      "capital:read", "capital:export", "pricing:simulate", "ai:read",
      "audit:read", "marketplace:read", "lifecycle:read", "allocation:read",
      "candidates:read", "notifications:read",
    ],
    name: "Sarah Chen",
    email: "sarah.chen@strata.demo",
    title: "Chief Financial Officer",
  },
  {
    roleId: "cdo",
    displayName: "CDO / Head of Data",
    description: "Chief Data Officer — data strategy, lifecycle, and governance authority",
    defaultFocusRoute: "/portfolio",
    navPriority: ["/portfolio", "/candidates", "/lifecycle", "/decisions", "/ai-scorecard"],
    permissions: [
      "portfolio:read", "products:read", "products:write", "products:certify",
      "decisions:read", "decisions:create", "decisions:approve",
      "capital:read", "capital:export", "ai:read", "ai:flag", "ai:kill_approve",
      "lifecycle:read", "allocation:read", "candidates:read",
      "candidates:promote", "candidates:ignore", "marketplace:read",
      "connectors:read", "pricing:simulate", "pricing:activate",
      "audit:read", "notifications:read", "users:read",
    ],
    name: "Priya Patel",
    email: "priya.patel@strata.demo",
    title: "Chief Data Officer",
  },
  {
    roleId: "product_owner",
    displayName: "Data Product Owner",
    description: "Owns data products — cost, value declarations, consumer management",
    defaultFocusRoute: "/assets",
    navPriority: ["/assets", "/candidates", "/decisions", "/marketplace"],
    permissions: [
      "portfolio:read", "products:read", "products:write",
      "decisions:read", "decisions:create",
      "candidates:read", "candidates:promote", "candidates:ignore",
      "marketplace:read", "marketplace:subscribe",
      "lifecycle:read", "connectors:read", "pricing:simulate",
      "notifications:read",
    ],
    name: "David Kim",
    email: "david.kim@strata.demo",
    title: "Data Product Owner",
  },
  // ── Tier 2: Deal Accelerators ────────────────────────────────
  {
    roleId: "fpa_analyst",
    displayName: "FP&A Analyst",
    description: "Financial Planning & Analysis — cost modelling and allocation",
    defaultFocusRoute: "/allocation",
    navPriority: ["/allocation", "/capital-impact", "/portfolio", "/simulate"],
    permissions: [
      "portfolio:read", "products:read", "capital:read", "capital:export",
      "pricing:simulate", "allocation:read", "lifecycle:read",
      "notifications:read", "audit:read",
    ],
    name: "Michael Torres",
    email: "michael.torres@strata.demo",
    title: "Senior FP&A Analyst",
  },
  {
    roleId: "head_of_ai",
    displayName: "Head of AI",
    description: "Oversees AI/ML investments — scorecard, kill-switch authority",
    defaultFocusRoute: "/ai-scorecard",
    navPriority: ["/ai-scorecard", "/portfolio", "/decisions", "/candidates"],
    permissions: [
      "portfolio:read", "products:read",
      "ai:read", "ai:flag", "ai:kill_approve", "ai:kill_execute",
      "decisions:read", "decisions:create",
      "capital:read", "lifecycle:read",
      "candidates:read", "notifications:read",
    ],
    name: "Nina Volkov",
    email: "nina.volkov@strata.demo",
    title: "Head of AI & ML",
  },
  {
    roleId: "governance_steward",
    displayName: "Data Governance / Steward",
    description: "Certifies products, enforces policies, reviews lifecycle compliance",
    defaultFocusRoute: "/lifecycle",
    navPriority: ["/lifecycle", "/assets", "/decisions", "/candidates"],
    permissions: [
      "portfolio:read", "products:read", "products:certify",
      "decisions:read", "decisions:create", "lifecycle:read",
      "candidates:read", "marketplace:read", "audit:read",
      "notifications:read",
    ],
    name: "Elena Rodriguez",
    email: "elena.rodriguez@strata.demo",
    title: "Data Governance Lead",
  },
  // ── Tier 3: Supporting Cast ────────────────────────────────────
  {
    roleId: "executive_sponsor",
    displayName: "Executive Sponsor",
    description: "CEO/COO — strategic oversight and board reporting",
    defaultFocusRoute: "/portfolio",
    navPriority: ["/portfolio", "/capital-impact", "/decisions"],
    permissions: [
      "portfolio:read", "products:read", "decisions:read", "capital:read",
      "capital:export", "ai:read", "audit:read", "marketplace:read",
      "lifecycle:read", "notifications:read", "allocation:read",
    ],
    name: "James Whitfield",
    email: "james.whitfield@strata.demo",
    title: "Chief Operating Officer",
  },
  {
    roleId: "consumer",
    displayName: "Business Consumer",
    description: "End-user who discovers and subscribes to data products",
    defaultFocusRoute: "/marketplace",
    navPriority: ["/marketplace", "/portfolio"],
    permissions: [
      "portfolio:read", "products:read",
      "marketplace:read", "marketplace:subscribe",
      "notifications:read",
    ],
    name: "Amanda Liu",
    email: "amanda.liu@strata.demo",
    title: "Marketing Analyst",
  },
  {
    roleId: "data_engineer",
    displayName: "Data Engineer",
    description: "Builds and maintains data pipelines and source asset mappings",
    defaultFocusRoute: "/candidates",
    navPriority: ["/candidates", "/assets", "/setup", "/lifecycle"],
    permissions: [
      "portfolio:read", "products:read",
      "connectors:read", "connectors:run",
      "candidates:read", "candidates:promote", "candidates:ignore",
      "lifecycle:read", "marketplace:read", "notifications:read",
    ],
    name: "Liam O'Brien",
    email: "liam.obrien@strata.demo",
    title: "Senior Data Engineer",
  },
  {
    roleId: "data_scientist",
    displayName: "Data Scientist / ML Engineer",
    description: "Discovers and consumes data products for ML feature engineering",
    defaultFocusRoute: "/marketplace",
    navPriority: ["/marketplace", "/ai-scorecard", "/candidates", "/assets"],
    permissions: [
      "portfolio:read", "products:read",
      "marketplace:read", "marketplace:subscribe",
      "ai:read", "ai:flag",
      "candidates:read", "lifecycle:read", "notifications:read",
    ],
    name: "Raj Mehta",
    email: "raj.mehta@strata.demo",
    title: "Senior ML Engineer",
  },
  {
    roleId: "platform_admin",
    displayName: "Data Platform Admin",
    description: "Manages connectors, infrastructure, and platform configuration",
    defaultFocusRoute: "/setup",
    navPriority: ["/setup", "/candidates", "/assets", "/lifecycle"],
    permissions: [
      "portfolio:read", "products:read",
      "connectors:read", "connectors:write", "connectors:run",
      "candidates:read", "candidates:promote", "candidates:ignore",
      "lifecycle:read", "users:read", "users:write",
      "notifications:read", "audit:read",
    ],
    name: "Alex Murphy",
    email: "alex.murphy@strata.demo",
    title: "Data Platform Engineer",
  },
  {
    roleId: "dataops_sre",
    displayName: "DataOps / SRE",
    description: "Monitors platform health, cost efficiency, and operational reliability",
    defaultFocusRoute: "/setup",
    navPriority: ["/setup", "/lifecycle", "/portfolio"],
    permissions: [
      "portfolio:read", "products:read",
      "connectors:read", "connectors:write", "connectors:run",
      "lifecycle:read", "notifications:read", "audit:read",
    ],
    name: "Taylor Jackson",
    email: "taylor.jackson@strata.demo",
    title: "DataOps Lead",
  },
  {
    roleId: "external_auditor",
    displayName: "External Auditor",
    description: "Read-only access for compliance audits and board reviews",
    defaultFocusRoute: "/portfolio",
    navPriority: ["/portfolio", "/capital-impact", "/decisions"],
    permissions: [
      "portfolio:read", "products:read", "decisions:read",
      "capital:read", "audit:read", "lifecycle:read",
    ],
    name: "Robert Frost",
    email: "robert.frost@strata.demo",
    title: "External Auditor",
  },
  {
    roleId: "admin",
    displayName: "System Admin",
    description: "Full platform access — user management, configuration, all operations",
    defaultFocusRoute: "/portfolio",
    navPriority: ["/portfolio", "/setup", "/candidates", "/decisions"],
    permissions: ALL_PERMISSIONS,
    name: "System Administrator",
    email: "admin@strata.demo",
    title: "System Administrator",
  },
];

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/** Get the list of demo personas for the login page. */
export function getSeedPersonas(): DemoPersona[] {
  return SEED_PERSONAS.map((p) => ({
    roleId: p.roleId,
    displayName: p.displayName,
    description: p.description,
    defaultFocusRoute: p.defaultFocusRoute,
    email: p.email,
    name: p.name,
  }));
}

/**
 * Create a synthetic AuthUser for client-side demo login.
 * Returns null if the roleId is not found.
 */
export function createDemoUser(roleId: string): AuthUser | null {
  const persona = SEED_PERSONAS.find((p) => p.roleId === roleId);
  if (!persona) return null;

  const roleMeta: RoleMeta = {
    roleId: persona.roleId,
    displayName: persona.displayName,
    description: persona.description,
    defaultFocusRoute: persona.defaultFocusRoute,
    navPriority: persona.navPriority,
    permissions: persona.permissions,
  };

  return {
    id: `demo-${persona.roleId}`,
    email: persona.email,
    name: persona.name,
    title: persona.title,
    role: persona.roleId,
    orgId: "demo-org",
    roleMeta,
  };
}
