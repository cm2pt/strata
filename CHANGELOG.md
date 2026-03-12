# Changelog

All notable changes to the Strata project are documented in this file.

---

## [Unreleased] — Capital Pressure Sprint

**Date:** February 2026

### Summary

Added Capital Drift & Liability Projection Engine — a deterministic 36-month forward simulation under 3 governance scenarios (Passive, Governance, Active Capital) that quantifies the cost of inaction. New backend service, API endpoint, frontend page with 5 visualization sections, and full seed data fallback.

---

### Added

- **Capital Projection service** (`apps/api/app/services/capital_projection.py`) — Deterministic 36-month simulation engine with 3 scenarios:
  - **Passive Mode:** No decisions, unchecked AI spend growth (8%/mo), cost inflation (1.5%/mo), decline-stage erosion
  - **Governance Mode:** Retirements + cost optimizations at current decision velocity
  - **Active Capital Mode:** Full governance + AI kills + pricing revenue + capital reallocation
  - Collects current snapshot from 10+ database queries, simulates 36 months, computes derived metrics (capital liability, missed capital freed, drift deltas)

- **`GET /capital-projection/` endpoint** (`apps/api/app/api/v1/capital_projection.py`) — Returns scenarios, drift deltas, liability estimates, and current snapshot. Requires `capital:read` permission.

- **Capital Projection page** (`/capital-projection`) — New executive page with 5 sections:
  - **KPI Row:** Portfolio ROI, Monthly Spend, AI Exposure, 36M Passive Liability
  - **Scenario Comparison Table:** 7 metrics across Passive/Governance/Active with delta column
  - **ROI Drift Chart:** 3-line LineChart showing 36-month ROI trajectory divergence
  - **Liability Accumulation Chart:** Stacked AreaChart with 4 liability components (AI exposure, decline waste, missed retirement, governance erosion)
  - **AI Exposure Risk Curve:** Dual-axis AreaChart showing AI spend growth vs governance score erosion
  - **Decision Velocity Impact:** 3 KPIs showing current vs optimal velocity and achievable improvements
  - **Liability Summary:** Executive callout with 36-month totals

- **`useCapitalProjection()` hook** (`lib/api/hooks.ts`) — Fetches projection data from API, falls back to seed data.

- **`CapitalProjectionResponse` type** and related interfaces (`lib/types.ts`) — `ProjectionMonth`, `ProjectionScenario`, `DriftDelta`, `LiabilityEstimate`, `CurrentSnapshot`.

- **Seed data** (`lib/mock-data/seed.ts`) — Full deterministic projection seed with `buildPassiveMonths()`, `buildGovernanceMonths()`, `buildActiveMonths()` helpers using same constants as backend.

- **Sidebar nav item** — "Capital Projection" with `TrendingDown` icon between Capital Review and AI Scorecard.

- **Route permission** — `/capital-projection: "capital:read"` in `ROUTE_PERMISSIONS`.

### Changed

- **API Router** (`apps/api/app/api/v1/router.py`) — Registered `capital_projection` router at `/capital-projection`.

### Documentation

- **DEMO.md** — Added Act 12 (Capital Pressure: The Cost of Inaction).
- **STRATA_PRODUCT_ARCHITECTURE.md** — Added Capital Projection page and endpoint.
- **CHANGELOG.md** — Added Capital Pressure Sprint entry.

---

## [Unreleased] — Close the Loop Sprint

**Date:** February 2026

### Summary

Closed the decision audit loop with a full Decision Detail page (`/decisions/[id]`) showing impact verification reports, economic effects, comments, and activity timeline. Made the notification bell interactive with a Popover dropdown supporting type-colored items, mark-all-read, and click-to-navigate. Added 7 new backend endpoints (5 decision sub-resources, 2 notification actions) and 5 new frontend data hooks.

---

### Added

- **Decision Detail page** (`/decisions/[id]`) — Full audit trail page for individual capital decisions with:
  - **Impact verification report:** cost trend chart, narrative summary, projected vs actual savings, confidence score
  - **Economic effects table:** capital freed and cost saved breakdowns by category
  - **Comments section:** deliberation history with author, timestamp, and threaded discussion
  - **Activity timeline:** chronological log of all actions (created, commented, approved/rejected/delayed)
  - **Action buttons:** Approve, Reject, Delay (permission-gated to `decisions:approve`)
  - **KPI row:** estimated vs actual impact, capital freed, annual savings, confidence score

- **Notification Bell Popover** — Made the topbar bell icon interactive:
  - Click opens a **Popover dropdown** with recent notifications
  - Each notification item is **type-colored** (cost spike = red, lifecycle = blue, decision = amber)
  - **Mark all read** action at the top of the popover
  - **Click-to-navigate:** clicking a notification routes to the relevant page
  - **Unread dot indicator** on unread notification items

- **`GET /decisions/{id}` endpoint** — Returns full decision record with creator, status, timestamps, projected savings, and impact validation fields.

- **`GET /decisions/{id}/comments` endpoint** — Returns comment thread for a decision with author info and timestamps.

- **`POST /decisions/{id}/comments` endpoint** — Creates a new comment on a decision. Requires `decisions:read` permission.

- **`GET /decisions/{id}/actions` endpoint** — Returns activity timeline (creation, comments, status changes) for a decision.

- **`GET /decisions/{id}/economic-effects` endpoint** — Returns economic effects breakdown (capital freed, cost saved) by category.

- **`PATCH /notifications/{id}/read` endpoint** — Marks a single notification as read.

- **`POST /notifications/mark-all-read` endpoint** — Marks all notifications as read for the current user.

- **`useDecision(id)` hook** — Fetches full decision record by ID.

- **`useDecisionImpactReport(id)` hook** — Fetches impact verification report (cost trend, narrative, confidence).

- **`useDecisionComments(id)` hook** — Fetches comment thread for a decision.

- **`useDecisionActions(id)` hook** — Fetches activity timeline for a decision.

- **`useDecisionEconomicEffects(id)` hook** — Fetches economic effects breakdown for a decision.

- **`DecisionComment` type** (`lib/types.ts`) — TypeScript interface for decision comments (id, author, message, timestamp).

- **`DecisionAction` type** (`lib/types.ts`) — TypeScript interface for decision activity events (id, type, actor, timestamp, details).

- **`DecisionEconomicEffect` type** (`lib/types.ts`) — TypeScript interface for economic effect rows (category, capital_freed, cost_saved).

- **Seed data** for decision comments, actions, and economic effects in `lib/mock-data/seed.ts`.

### Changed

- **Decisions list page** (`decisions/page.tsx`) — "View" button now navigates to `/decisions/{id}` instead of `/assets/{productId}`.

- **Topbar** (`components/layout/topbar.tsx`) — Bell icon now opens a Popover with notification list, mark-all-read, and click-to-navigate behavior.

- **Notifications router** (`apps/api/app/api/v1/notifications.py`) — Added `PATCH /{id}/read` and `POST /mark-all-read` endpoints.

- **Decisions router** (`apps/api/app/api/v1/decisions.py`) — Added `GET /{id}`, `GET /{id}/comments`, `POST /{id}/comments`, `GET /{id}/actions`, `GET /{id}/economic-effects` endpoints.

- **Sidebar** (`components/layout/sidebar.tsx`) — Decision Detail route inherits `decisions:read` permission.

- **Permissions** (`lib/auth/permissions.ts`) — Added `/decisions/[id]: "decisions:read"` route mapping.

### Documentation

- **DEMO.md** — Added Act 6 (Decision Detail), added notification bell mention to RBAC act, renumbered subsequent acts.
- **UX_SPEC.md** — Added Decision Detail to RBAC visibility table, updated NotificationBell component to describe Popover behavior, added Decision Detail to mutation gating table.
- **STRATA_PRODUCT_ARCHITECTURE.md** — Added 7 new endpoints to router table, added Decision Detail page to screens table, updated page count to 17, updated endpoint count to 62+.
- **CHANGELOG.md** — Added Close the Loop sprint entry.

---

## [Unreleased] — Capital Performance Layer Sprint

**Date:** February 2026

### Summary

Unified all economic governance signals into a single executive page (`/capital-review`) and enhanced the Decisions page with impact validation visibility. Extended the Capital Efficiency Index from 4 to 6 configurable-weight components, added a new Capital Behavior endpoint with 5 governance hygiene metrics, and exposed `impactValidationStatus` on the Decisions response.

---

### Added

- **Capital Review page** (`/capital-review`) — New executive page with 5 sections:
  - **Capital Overview:** 4 KPIs from Board Capital Summary (capital freed, savings, ROI, CEI score)
  - **Capital Efficiency Index:** CEI score (0-100) with 6-component progress bars, detail text, and 6-month trend chart
  - **Decision Performance:** Approved/Pending/Underperforming KPIs, Top Capital Actions table with validation status badges
  - **Portfolio Rebalance:** Current vs Projected ROI, bottom/top quartile tables, efficiency delta
  - **Governance Behavior:** Governance Health Score (0-100), 5 metric cards (decision velocity, value coverage, review overdue, enforcement rate, impact confirmed)

- **`GET /capital-behavior/` endpoint** (`apps/api/app/api/v1/capital_behavior.py`) — 5 governance hygiene metrics computed from existing tables: avg decision velocity (days), value declaration coverage (%), review overdue rate (%), enforcement trigger rate (%), impact confirmation rate (%), plus composite governance health score (0-100). Requires `capital:read` permission.

- **Capital Behavior service** (`apps/api/app/services/capital_behavior.py`) — Computes all 5 metrics from `Decision`, `ValueDeclaration`, and `DataProduct` tables.

- **CEI Component: Value Governance** — % of non-retired products with current (non-expiring) value declarations.

- **CEI Component: AI Exposure** — % of total monthly spend in products with validated economics (ROI > 1.0 and trust score ≥ 0.7).

- **CEI configurable weights** — Component weights stored in `policy_configs` table as JSON (`"CEI — Component Weights"`). Default: `roi_coverage:20, action_rate:20, savings_accuracy:15, capital_freed_ratio:15, value_governance:15, ai_exposure:15`.

- **`ImpactStatusBadge` component** on Decisions page — Color-coded badges for `confirmed` (green), `validating` (blue), `underperforming` (amber), `pending` (gray).

- **Impact Accuracy KPI** on Decisions page — 5th KPI card showing confirmed/total approved decisions with percentage.

- **Projected vs Actual comparison** on Decisions page — Inline percentage display (`X% of projection`) on approved decision cards with color coding.

- **`useCapitalEfficiency()` hook** — Fetches enhanced CEI response with 6 components.

- **`useCapitalBehavior()` hook** — Fetches governance behavior metrics.

- **`usePortfolioRebalance()` hook** — Fetches portfolio rebalance simulation data.

- **`useBoardCapitalSummary()` hook** — Fetches board capital summary.

- **Seed data** for all 4 new hooks in `lib/mock-data/seed.ts`.

- **TypeScript interfaces** for `CEIComponent`, `CEIResponse`, `CapitalBehavior`, `PortfolioRebalance`, `BoardCapitalSummary`, `ImpactReport`, and related types.

### Changed

- **Capital Efficiency service** (`apps/api/app/services/capital_efficiency.py`) — Enhanced from 4 components × 25 pts to 6 components with configurable weights from `policy_configs`. Added `_load_weights()` function with fallback to default weights.

- **Decisions endpoint** (`apps/api/app/api/v1/decisions.py`) — Added `impact_validation_status` to `DecisionResponse` schema and `_to_response()` helper.

- **Decision type** (`lib/types.ts`) — Added `impactValidationStatus?: "pending" | "validating" | "confirmed" | "underperforming"`.

- **Decisions page** (`decisions/page.tsx`) — Added 5th KPI (Impact Accuracy), impact status badges on approved cards, projected vs actual inline comparison. KPI grid expanded to 5 columns.

- **Sidebar** (`components/layout/sidebar.tsx`) — Added Capital Review nav item with Gauge icon after Capital Impact.

- **Permissions** (`lib/auth/permissions.ts`) — Added `/capital-review: "capital:read"` route mapping.

- **API Router** (`apps/api/app/api/v1/router.py`) — Registered `capital_behavior` router at `/capital-behavior`.

- **Seeder** (`apps/api/app/seed/seeder.py`) — Added CEI weights `PolicyConfig` row.

### Documentation

- **DEMO.md** — Added Act 7 (Capital Review), renumbered subsequent acts.
- **UX_SPEC.md** — Added Capital Review to navigation map and RBAC visibility table.
- **STRATA_PRODUCT_ARCHITECTURE.md** — Added Capital Review page, capital-behavior endpoint, updated CEI description to 6 components, updated endpoint/page counts, updated planned-next section.
- **CHANGELOG.md** — Added Capital Performance Layer sprint entry.

---

## [Unreleased] — Seal the Demo Seams Sprint

**Date:** February 2026

### Summary

Hardened the frontend demo experience so that mutations never silently succeed when the API is unavailable, all API errors surface as toast notifications, hardcoded org metadata is replaced with dynamic data from a new backend endpoint, and all UI classification thresholds are sourced from a configurable display-config endpoint.

---

### Added

- **`canMutate` gate** (`lib/api/client.ts`) — Compile-time constant derived from `NEXT_PUBLIC_API_URL`. When `false`, all mutation buttons across the app are disabled with the tooltip: *"API unavailable in offline demo mode"*.

- **`useMutation<T>` hook** (`lib/api/hooks.ts`) — Generic mutation hook that gates writes behind `canMutate`, manages loading state, and surfaces errors via toast.

- **`GET /org-info/` endpoint** (`apps/api/app/api/v1/org_info.py`) — Returns org name, slug, industry, team count, user count, role count, and value composite weights from the database.

- **`useOrgInfo()` hook** (`lib/api/hooks.ts`) — Fetches org metadata from `/org-info/`, falls back to seed data when API is unavailable.

- **`OrgInfo` type** (`lib/types.ts`) — TypeScript interface for org metadata.

- **`orgInfo` seed data** (`lib/mock-data/seed.ts`) — Offline fallback for org metadata (Acme Corp, 12 teams, 48 users, 5 roles, 70/30 weights).

- **Offline Demo Mode section** in `DEMO.md` — Documents how the app behaves without a running API.

- **Mutation Gating section** (§6) in `UX_SPEC.md` — Documents the `canMutate` pattern, `useMutation<T>` hook, per-screen gating table, and toast feedback pattern.

- **`GET /display-config/` endpoint** (`apps/api/app/api/v1/display_config.py`) — Returns all UI threshold bands (ROI, trust score, confidence score, AI risk score, pricing simulation defaults, team budget threshold) from the `policy_configs` table. Falls back to hardcoded defaults if rows are missing.

- **`useDisplayConfig()` hook** (`lib/api/hooks.ts`) — Fetches display configuration from `/display-config/`, falls back to seed data when API is unavailable.

- **`DisplayConfig` type** (`lib/types.ts`) — TypeScript interfaces for 6 config groups: `ROIBandsConfig`, `TrustScoreBandsConfig`, `ConfidenceScoreBandsConfig`, `AIRiskScoreBandsConfig`, `PricingSimulationDefaultsConfig`, `TeamBudgetThresholdConfig`.

- **`displayConfig` seed data** (`lib/mock-data/seed.ts`) — Offline fallback with all default threshold values.

- **6 display config seed rows** (`apps/api/app/seed/seeder.py`) — Added to `policy_configs` table with JSON-string values for all UI threshold bands.

- **Display Configuration section** (§6.5) in `UX_SPEC.md` — Documents all configurable thresholds, default values, and the pages that use them.

### Changed

- **Marketplace subscribe** (`marketplace/page.tsx`) — Wired `toggleSubscribe` to `POST /marketplace/subscribe` with per-button loading state, toast success/error feedback, and `canMutate` gate.

- **Decisions page** (`decisions/page.tsx`) — All Approve/Reject/Delay buttons gated with `disabled={!canMutate}` + tooltip.

- **Lifecycle page** (`lifecycle/page.tsx`) — "Start Retirement Review" button gated with `canMutate`.

- **Simulate page** (`simulate/page.tsx`) — "Activate as Policy" button gated. Fixed silent catch block to use `toastError()`.

- **Candidates list** (`candidates/page.tsx`) — "Run Discovery" button gated. Fixed silent catch block.

- **Candidates detail** (`candidates/[id]/page.tsx`) — Promote, Ignore, Flag for Retirement buttons and their dialog confirmations all gated. Fixed 3 silent catch blocks to use `toastError()`.

- **AI Scorecard** (`ai-scorecard/page.tsx`) — Flag for Review and Kill Project buttons (in table rows, summary cards, and dialog confirmations) all gated with `canMutate`.

- **Allocation** (`allocation/page.tsx`) — "Approve Reallocation" button and dialog confirmation gated. Fixed silent catch block in approve handler to use `toastError()`.

- **Setup** (`setup/page.tsx`) — Replaced hardcoded "12 teams, 48 users", "5 roles configured", and "70/30 declared/usage" with dynamic values from `useOrgInfo()`.

- **Asset Detail** (`assets/[id]/page.tsx`) — Decorative action buttons gated with `canMutate` + tooltip.

- **Sidebar** (`components/layout/sidebar.tsx`) — Replaced hardcoded "Acme Corp" org name with dynamic `orgInfo?.name` from `useOrgInfo()`.

- **Board View** (`portfolio/board-view/page.tsx`) — Replaced hardcoded "Acme Corp" with dynamic `orgInfoResult.data?.name`.

- **API Router** (`apps/api/app/api/v1/router.py`) — Registered new `org_info` router at `/org-info` and `display_config` router at `/display-config`.

- **Marketplace** (`marketplace/page.tsx`) — Removed hardcoded subscription IDs (`dp-001`, `dp-002`); subscriptions now initialized from `isSubscribed` field in API response. ROI threshold uses `cfg?.roiBands.high`. Trust score bands standardized from inconsistent 0.95/0.85 to configurable 0.9/0.7 via `cfg?.trustScoreBands`.

- **Allocation** (`allocation/page.tsx`) — Replaced hardcoded portfolio ROI (`2.8`) with `portfolioSummary?.averageROI` from `usePortfolioSummary()` hook.

- **Assets list** (`assets/page.tsx`) — ROI band thresholds (`>= 3`, `>= 1`) replaced with `cfg?.roiBands.high` and `cfg?.roiBands.healthy` from `useDisplayConfig()`.

- **Asset detail** (`assets/[id]/page.tsx`) — ROI band thresholds (3 occurrences) and trust score band thresholds replaced with display config values.

- **Candidates** (`candidates/page.tsx`) — `ConfidenceBadge` component now accepts configurable `bands` prop. High-confidence KPI filter uses `cfg?.confidenceScoreBands.green`. All hardcoded thresholds (80, 60, 40) replaced.

- **AI Scorecard** (`ai-scorecard/page.tsx`) — Composite score color thresholds (70, 50, 30) replaced with `cfg?.aiRiskScoreBands`. Explanatory text now renders dynamic threshold values.

- **Simulate** (`simulate/page.tsx`) — Pricing parameter defaults (markup 25, baseFee 500, perQuery 1.25, freeTier 500, adoptionSlider 12) synced from `useDisplayConfig()` via `useEffect`. Budget threshold (4500) replaced with `cfg?.teamBudgetThreshold.amount`.

- **`DataProduct` type** (`lib/types.ts`) — Added `isSubscribed?: boolean` field for marketplace subscription state from API.

### Fixed

- **6 silent catch blocks** across candidates, simulate, allocation, and candidates detail pages that previously swallowed API errors and either silently simulated success or called `refetch()` in the catch path. All now use `toastError(msg)` and do not update UI optimistically on failure.

### Documentation

- **DEMO.md** — Added "Offline Demo Mode" section, added troubleshooting entry for disabled buttons, added key message #6 about no silent failures. Added display thresholds to offline demo mode description.
- **UX_SPEC.md** — Added §6 "Mutation Gating & Offline Demo Mode" with `canMutate` pattern, `useMutation<T>` hook, per-screen gating table, and toast feedback pattern. Added §6.5 "Display Configuration" with threshold table documenting all 6 config groups, their default values, and the pages that consume them.
- **STRATA_PRODUCT_ARCHITECTURE.md** — Added org-info and display-config endpoints to router table, updated demo mode description, added Layer 4 (mutation gating) and Layer 5 (configurable thresholds) to frontend enforcement, updated marketplace status, added org info and display config to secondary global elements.
- **CHANGELOG.md** — Created and maintained (this file).
