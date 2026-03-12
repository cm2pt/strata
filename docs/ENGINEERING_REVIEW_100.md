# Strata Engineering Review — 120+ Improvements

> Deep engineering review covering security, robustness, maintainability, performance, and operational readiness.
> Performed: 2026-02-25

---

## Executive Summary — Top 10 Risks

| # | Risk | Impact | Likelihood |
|---|------|--------|------------|
| 1 | **Middleware not wired** — `proxy.ts` exists but no `middleware.ts`; all dashboard routes publicly accessible | Critical | Certain |
| 2 | **No security headers** — CSP, X-Frame-Options, HSTS absent from Next.js config | High | Certain |
| 3 | **Mock data silently replaces real data** on API failure in production | High | Likely |
| 4 | **Tokens in localStorage** — XSS-exfiltrable access + refresh tokens | High | Moderate |
| 5 | **Session cookie trivially forgeable** — not httpOnly, value is `"1"` | High | Moderate |
| 6 | **No request timeouts** — API calls hang indefinitely on unresponsive backend | Medium | Likely |
| 7 | **Zero component/page tests** — 78+ UI files with no test coverage | Medium | Certain |
| 8 | **16 `(seed as any)` casts** — complete type safety bypass for seed data | Medium | Certain |
| 9 | **No env validation** — misconfigured env vars produce silent failures | Medium | Likely |
| 10 | **CORS is fully permissive** — `allow_methods=["*"]`, `allow_headers=["*"]` | Medium | Moderate |

---

## Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Security** | 4/10 | Missing middleware, headers, CSRF, localStorage tokens |
| **Reliability** | 6/10 | Good error boundaries; no timeouts, no caching, silent mock fallback |
| **Maintainability** | 7/10 | Clean tokens/types; 14 monolithic pages, duplicated mutation boilerplate |
| **Performance** | 6/10 | No code splitting, no caching, N+1 hook fetching, charts loaded sync |
| **Developer Experience** | 7/10 | Good types, tokens, CI; no E2E tests, missing component tests |
| **Observability** | 3/10 | No request IDs, no structured logging, no metrics, no health checks on FE |

---

## Top 20 Must-Fix

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1 | Wire middleware.ts for auth redirect | P0 | S |
| 2 | Add security headers to next.config.ts | P0 | S |
| 3 | Remove seed fallback when API is enabled | P0 | S |
| 4 | Add request timeouts with AbortController | P0 | S |
| 5 | Add env variable validation (Zod schema) | P0 | S |
| 6 | Move tokens to httpOnly cookies (coordinate with backend) | P0 | M |
| 7 | Tighten CORS configuration on backend | P0 | S |
| 8 | Fix 3 `catch (e: any)` unsafe error patterns | P1 | S |
| 9 | Fix 16 `(seed as any)` casts with proper SeedData interface | P1 | M |
| 10 | Add AbortController cleanup in useData hook | P1 | S |
| 11 | Make seed data deterministic (remove Math.random) | P1 | S |
| 12 | Add component tests for critical pages | P1 | L |
| 13 | Adopt useMutation hook to replace duplicated boilerplate | P1 | M |
| 14 | Lazy-load Recharts with next/dynamic | P1 | M |
| 15 | Add request ID header to all API calls | P1 | S |
| 16 | Fill undefined seed stubs for capital pages | P1 | S |
| 17 | Abstract disabled mutation button pattern | P1 | S |
| 18 | Add CSRF token for mutations | P1 | M |
| 19 | Break down 14 monolithic page files | P2 | L |
| 20 | Add E2E tests for core workflows | P2 | L |

---

## Full Backlog (120 Items)

### Security (25 items)

**[1] Wire middleware.ts for auth redirect**
Category: Security
Priority: P0
Effort: S
Where: `apps/web/src/middleware.ts` (create new), `apps/web/src/proxy.ts` (existing)
Why it matters: All dashboard routes are publicly accessible without edge-level auth check
Suggested fix: Create `src/middleware.ts` that exports proxy function and matcher config

**[2] Add security headers to next.config.ts**
Category: Security
Priority: P0
Effort: S
Where: `apps/web/next.config.ts`
Why it matters: Prevents clickjacking, MIME sniffing, and provides basic XSS mitigation
Suggested fix: Add `headers()` function returning X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy, basic CSP

**[3] Move tokens from localStorage to httpOnly cookies**
Category: Security
Priority: P0
Effort: M
Where: `apps/web/src/lib/api/client.ts`, `apps/api/app/api/v1/auth.py`
Why it matters: localStorage tokens are XSS-exfiltrable; refresh token gives indefinite access
Suggested fix: Backend sets httpOnly+Secure+SameSite cookies; frontend reads CSRF token only

**[4] Make session cookie httpOnly and server-set**
Category: Security
Priority: P0
Effort: M
Where: `apps/web/src/lib/auth/context.tsx` (line 35-43), backend auth endpoint
Why it matters: Current `document.cookie` session cookie is trivially forgeable
Suggested fix: Backend login response sets `dao_session` cookie via Set-Cookie header

**[5] Add CSRF protection for mutations**
Category: Security
Priority: P1
Effort: M
Where: `apps/web/src/lib/api/client.ts`, backend middleware
Why it matters: Prevents cross-site request forgery on state-changing operations
Suggested fix: Double-submit cookie pattern — backend sets CSRF cookie, frontend sends as X-CSRF-Token header

**[6] Tighten CORS configuration**
Category: Security
Priority: P0
Effort: S
Where: `apps/api/app/main.py` or CORS middleware config
Why it matters: `allow_methods=["*"]`, `allow_headers=["*"]` is too permissive for production
Suggested fix: Whitelist specific methods (GET, POST, PATCH, DELETE) and headers (Authorization, Content-Type, X-CSRF-Token)

**[7] Add Content-Security-Policy header**
Category: Security
Priority: P1
Effort: M
Where: `apps/web/next.config.ts`
Why it matters: CSP is the strongest XSS mitigation; currently absent
Suggested fix: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';`

**[8] Validate JWT_SECRET is not default on startup**
Category: Security
Priority: P0
Effort: S
Where: `apps/api/app/core/config.py` (already exists, verify)
Why it matters: Default secrets allow token forgery
Suggested fix: Startup validation already exists — verify it blocks startup, not just warns

**[9] Audit rate limiting coverage**
Category: Security
Priority: P1
Effort: S
Where: `apps/api/app/api/v1/auth.py`, all mutation endpoints
Why it matters: Auth endpoints have slowapi; mutation endpoints lack rate limiting
Suggested fix: Add rate limits to POST/PATCH endpoints (100/minute/user)

**[10] Add request size limits**
Category: Security
Priority: P1
Effort: S
Where: `apps/api/` — Uvicorn/Starlette config
Why it matters: Prevents large payload DoS attacks
Suggested fix: Set max request body size to 1MB via Starlette middleware

**[11] Sanitize error messages before client display**
Category: Security
Priority: P1
Effort: S
Where: `apps/web/src/lib/api/client.ts` (lines 146-160)
Why it matters: Backend error details (SQL, stack traces) could leak to UI
Suggested fix: Map known error codes to user-friendly messages; log raw detail to console in dev only

**[12] Ensure demo-login endpoint is disabled in production**
Category: Security
Priority: P1
Effort: S
Where: `apps/api/app/api/v1/auth.py`
Why it matters: Demo login bypasses password auth — must not be available in production
Suggested fix: Gate endpoint behind `DEMO_MODE` env var check

**[13] Add Permissions-Policy header**
Category: Security
Priority: P2
Effort: S
Where: `apps/web/next.config.ts`
Why it matters: Restricts browser feature access (camera, microphone, geolocation)
Suggested fix: `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**[14] Add Referrer-Policy header**
Category: Security
Priority: P2
Effort: S
Where: `apps/web/next.config.ts`
Why it matters: Prevents referrer leakage to third-party origins
Suggested fix: `Referrer-Policy: strict-origin-when-cross-origin`

**[15] Prevent open redirect on login callback**
Category: Security
Priority: P1
Effort: S
Where: `apps/web/src/app/login/page.tsx`, proxy.ts redirect logic
Why it matters: Attacker could craft URL that redirects to malicious site after login
Suggested fix: Validate redirect URL is same-origin before navigating

**[16] Add Subresource Integrity (SRI) for CDN assets**
Category: Security
Priority: P2
Effort: S
Where: `apps/web/next.config.ts`
Why it matters: Protects against CDN compromise
Suggested fix: Enable SRI in Next.js build config (if using CDN)

**[17] Encrypt sensitive data in seed.ts for demos**
Category: Security
Priority: P2
Effort: S
Where: `apps/web/src/lib/mock-data/seed.ts`
Why it matters: Seed data contains realistic names/titles that could be mistaken for real PII
Suggested fix: Add disclaimer comments and ensure names are clearly fictional

**[18] Validate API rewrite destination URL**
Category: Security
Priority: P1
Effort: S
Where: `apps/web/next.config.ts` (lines 8-15)
Why it matters: String replacement to construct proxy destination could be manipulated
Suggested fix: Use static URL or validate against allowlist

**[19] Add security.txt**
Category: Security
Priority: P2
Effort: S
Where: `apps/web/public/.well-known/security.txt`
Why it matters: Standard vulnerability disclosure channel
Suggested fix: Create file with contact info and disclosure policy

**[20] Restrict `NEXT_PUBLIC_DEMO_MODE` to non-production**
Category: Security
Priority: P1
Effort: S
Where: Build pipeline / env validation
Why it matters: Demo persona selector should never appear in production
Suggested fix: Build-time check that DEMO_MODE=false when NODE_ENV=production

**[21] Add lockfile integrity check to CI**
Category: Security
Priority: P2
Effort: S
Where: `.github/workflows/ci.yml`
Why it matters: Detects supply-chain attacks via dependency tampering
Suggested fix: Add `npm ci --ignore-scripts` and run `npm audit --audit-level=high`

**[22] Audit backend input validation completeness**
Category: Security
Priority: P1
Effort: M
Where: `apps/api/app/api/v1/*.py`
Why it matters: Missing Pydantic validation could allow injection or data corruption
Suggested fix: Ensure all endpoint request bodies use Pydantic models with strict validation

**[23] Add API key authentication for service-to-service calls**
Category: Security
Priority: P2
Effort: M
Where: `apps/api/app/core/security.py`
Why it matters: Connector runner and integration service accounts need separate auth
Suggested fix: API key + rate limit separate from JWT flow

**[24] Add audit logging for sensitive operations**
Category: Security
Priority: P1
Effort: M
Where: `apps/api/app/services/audit_service.py`
Why it matters: Capital decisions and pricing activations need an audit trail
Suggested fix: Emit structured audit events for all create/approve/reject/activate operations

**[25] Implement token rotation for refresh tokens**
Category: Security
Priority: P2
Effort: M
Where: `apps/api/app/services/auth_service.py`
Why it matters: Reuse detection — if a refresh token is used twice, revoke all tokens for that user
Suggested fix: Rotate refresh token on each use; store token family for reuse detection

---

### Robustness (20 items)

**[26] Remove seed data fallback when API is enabled**
Category: Robustness
Priority: P0
Effort: S
Where: `apps/web/src/lib/api/hooks.ts` (lines 77-86)
Why it matters: Users silently see mock data when API fails — decisions based on fake numbers
Suggested fix: When `isAPIEnabled`, show ErrorState on failure, never fall back to seed

**[27] Add request timeouts with AbortController**
Category: Robustness
Priority: P0
Effort: S
Where: `apps/web/src/lib/api/client.ts` (apiFetch function)
Why it matters: Requests hang indefinitely on unresponsive backend
Suggested fix: Add 30s AbortController timeout to all fetch calls

**[28] Add AbortController cleanup in useData hook**
Category: Robustness
Priority: P1
Effort: S
Where: `apps/web/src/lib/api/hooks.ts` (useEffect, line 92)
Why it matters: Prevents setState on unmounted component; avoids memory leaks
Suggested fix: Return cleanup function from useEffect that aborts in-flight requests

**[29] Add env variable validation with Zod**
Category: Robustness
Priority: P0
Effort: S
Where: `apps/web/src/lib/env.ts` (create new)
Why it matters: Misconfigured env vars produce silent failures instead of fast crashes
Suggested fix: Zod schema validating NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DEMO_MODE, NEXT_PUBLIC_SITE_URL

**[30] Fill undefined seed stubs for capital pages**
Category: Robustness
Priority: P1
Effort: S
Where: `apps/web/src/lib/mock-data/seed.ts` (lines 232-238)
Why it matters: Capital review/efficiency/behavior pages show empty states in demo mode
Suggested fix: Add realistic seed data for orgInfo, displayConfig, capitalEfficiency, etc.

**[31] Make seed data deterministic**
Category: Robustness
Priority: P1
Effort: S
Where: `apps/web/src/lib/mock-data/seed.ts` (costTrend helper, line 41)
Why it matters: Math.random() makes tests flaky and screenshots inconsistent
Suggested fix: Replace with seeded PRNG or static values

**[32] Add retry logic for transient failures**
Category: Robustness
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/client.ts`
Why it matters: Network blips cause unnecessary error states
Suggested fix: Retry 5xx errors up to 2 times with exponential backoff

**[33] Add circuit breaker for API calls**
Category: Robustness
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/client.ts`
Why it matters: Prevents cascading failures when backend is down
Suggested fix: After N consecutive failures, short-circuit to error state for cooldown period

**[34] Handle 429 (rate limited) responses gracefully**
Category: Robustness
Priority: P1
Effort: S
Where: `apps/web/src/lib/api/client.ts`
Why it matters: Backend uses slowapi; frontend doesn't handle rate limit responses
Suggested fix: Parse Retry-After header, show user-friendly "too many requests" message

**[35] Add error boundary per dashboard section**
Category: Robustness
Priority: P2
Effort: M
Where: Page files with multiple independent sections
Why it matters: Chart crash takes down entire page instead of just that section
Suggested fix: Wrap chart/table sections in `ErrorBoundary` components

**[36] Prevent double-submit on mutation buttons**
Category: Robustness
Priority: P1
Effort: S
Where: All mutation handlers across 13 page files
Why it matters: Rapid clicks could fire duplicate API calls
Suggested fix: Debounce mutation calls or add request deduplication

**[37] Handle stale data after tab switch**
Category: Robustness
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/hooks.ts`
Why it matters: Data becomes stale when user switches tabs and returns
Suggested fix: Add `visibilitychange` listener to trigger refetch on tab focus

**[38] Add graceful degradation for chart render failures**
Category: Robustness
Priority: P2
Effort: S
Where: All Recharts usage (10 files)
Why it matters: Invalid data can crash Recharts, taking down the page
Suggested fix: Wrap chart components in try-catch or error boundary

**[39] Validate API response shapes**
Category: Robustness
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/client.ts` or `hooks.ts`
Why it matters: Unexpected API response shapes cause runtime crashes
Suggested fix: Add Zod response parsing for critical endpoints (portfolio, decisions)

**[40] Handle network offline gracefully**
Category: Robustness
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/client.ts`
Why it matters: No offline indicator when network is unavailable
Suggested fix: Add `navigator.onLine` check and offline banner

**[41] Add `apiDelete` function to API client**
Category: Robustness
Priority: P2
Effort: S
Where: `apps/web/src/lib/api/client.ts`
Why it matters: DELETE method is completely absent from the API client
Suggested fix: Add `apiDelete(path)` following same pattern as apiPost/apiPatch

**[42] Prevent state update after unmount in mutations**
Category: Robustness
Priority: P1
Effort: S
Where: All mutation handlers with local loading states
Why it matters: Async mutation completing after navigation causes React warning
Suggested fix: Use ref to track mounted state, or adopt useMutation hook

**[43] Add loading timeout for skeleton states**
Category: Robustness
Priority: P2
Effort: S
Where: All pages with skeleton loading
Why it matters: If API hangs, skeleton shows indefinitely with no feedback
Suggested fix: After 10s of loading, show "Taking longer than expected" message

**[44] Validate date values before formatting**
Category: Robustness
Priority: P1
Effort: S
Where: `apps/web/src/lib/format.ts`
Why it matters: Invalid date strings produce "Invalid Date" in UI
Suggested fix: Add `isValid(date)` check in formatDate and formatRelativeTime

**[45] Handle empty arrays in chart components**
Category: Robustness
Priority: P1
Effort: S
Where: Recharts usage across pages
Why it matters: Empty arrays can cause Recharts to render broken SVGs
Suggested fix: Guard chart rendering with `data.length > 0` check (partially done, inconsistent)

---

### Code Quality (20 items)

**[46] Fix 16 `(seed as any)` casts in hooks.ts**
Category: Code Quality
Priority: P1
Effort: M
Where: `apps/web/src/lib/api/hooks.ts`
Why it matters: Complete bypass of TypeScript type safety for seed data access
Suggested fix: Define `SeedData` interface and type the seed module export

**[47] Fix 3 `catch (e: any)` unsafe error access**
Category: Code Quality
Priority: P1
Effort: S
Where: `apps/web/src/app/(dashboard)/assets/[id]/page.tsx` (lines 280, 529, 551)
Why it matters: If `e` is not an Error, `e.message` is `undefined`, shown as "undefined"
Suggested fix: Use `e instanceof Error ? e.message : "Operation failed"` pattern

**[48] Adopt useMutation hook across all pages**
Category: Code Quality
Priority: P1
Effort: M
Where: 13 page files with manual mutation boilerplate
Why it matters: Duplicated try/catch/loading/toast pattern across every page
Suggested fix: Refactor to use existing `useMutation` hook from hooks.ts

**[49] Abstract disabled mutation button pattern**
Category: Code Quality
Priority: P1
Effort: S
Where: 20+ button instances across pages
Why it matters: `disabled={!canMutate} title={!canMutate ? "..." : ""}` duplicated everywhere
Suggested fix: Create `MutationButton` wrapper component

**[50] Break down 14 monolithic page files**
Category: Code Quality
Priority: P2
Effort: L
Where: All files >300 lines (see list in audit)
Why it matters: 793-line decision detail page is hard to maintain and test
Suggested fix: Extract sub-components (KPI sections, tab panels, dialogs) into separate files

**[51] Fix `any` typed chart tooltip components**
Category: Code Quality
Priority: P1
Effort: S
Where: `capital-flow-chart.tsx`, `capital-projection/page.tsx` (5 instances)
Why it matters: Untyped tooltip props hide runtime errors
Suggested fix: Type tooltip props with Recharts `TooltipProps` type

**[52] Extract shared dialog patterns**
Category: Code Quality
Priority: P2
Effort: M
Where: Confirmation dialogs in decisions, lifecycle, simulate pages
Why it matters: Dialog structure (header + description + impact summary + footer) is duplicated
Suggested fix: Create `ConfirmDialog` component with standard slots

**[53] Colocate hooks with their pages**
Category: Code Quality
Priority: P2
Effort: M
Where: `src/lib/hooks/use-capital-model.ts` (404 lines)
Why it matters: Huge file that composes 10 hooks; hard to reason about
Suggested fix: Split into focused hooks: `useCapitalKPIs`, `useCapitalActions`, `useCapitalFlow`

**[54] Remove deprecated topbar.tsx**
Category: Code Quality
Priority: P1
Effort: S
Where: `apps/web/src/components/layout/topbar.tsx`
Why it matters: Dead code confusion
Suggested fix: Already deleted in previous session — verify

**[55] Standardize card component usage**
Category: Code Quality
Priority: P2
Effort: M
Where: Pages that inline card styles vs using `Card` component
Why it matters: Some pages use `<Card>`, others use inline `rounded-xl border...` classes
Suggested fix: Migrate all inline card patterns to `<Card>` component

**[56] Remove unused imports across pages**
Category: Code Quality
Priority: P2
Effort: S
Where: Multiple page files
Why it matters: Unused imports increase bundle and cause linter warnings
Suggested fix: Run ESLint auto-fix for unused imports

**[57] Enforce consistent file naming**
Category: Code Quality
Priority: P2
Effort: S
Where: Components directory
Why it matters: Mix of kebab-case and nested directories without consistency
Suggested fix: Document convention in CONTRIBUTING.md

**[58] Add JSDoc to shared utility functions**
Category: Code Quality
Priority: P2
Effort: S
Where: `format.ts`, `tokens.ts`, `client.ts`
Why it matters: Improves IDE experience and onboarding for new developers
Suggested fix: Add `@param` and `@returns` JSDoc to exported functions

**[59] Standardize chart color usage**
Category: Code Quality
Priority: P2
Effort: M
Where: Recharts usages across 10 files
Why it matters: Some charts use inline hex colors, others use `chartAxis` tokens
Suggested fix: Move all chart colors to tokens.ts and use consistently

**[60] Extract table component pattern**
Category: Code Quality
Priority: P2
Effort: M
Where: 8+ pages with inline `<table>` markup
Why it matters: Table header styles and row patterns duplicated across pages
Suggested fix: Create `DataTable` component with sortable columns and consistent styling

**[61] Centralize permission string constants**
Category: Code Quality
Priority: P2
Effort: S
Where: Scattered across `permissions.ts` and page files
Why it matters: Typos in permission strings cause silent authorization failures
Suggested fix: Export constants: `PERM_PORTFOLIO_VIEW = "portfolio:view"`, etc.

**[62] Add `eslint-plugin-react-hooks` exhaustive-deps rule**
Category: Code Quality
Priority: P1
Effort: S
Where: `apps/web/eslint.config.mjs`
Why it matters: Stale closures in useCallback/useEffect go undetected
Suggested fix: Enable `react-hooks/exhaustive-deps` as error

**[63] Add barrel exports for shared components**
Category: Code Quality
Priority: P2
Effort: S
Where: `apps/web/src/components/shared/index.ts` (create)
Why it matters: Import paths are verbose: `@/components/shared/error-state`
Suggested fix: Create `index.ts` re-exporting all shared components

**[64] Type the `seed` module properly**
Category: Code Quality
Priority: P1
Effort: M
Where: `apps/web/src/lib/mock-data/seed.ts`, `hooks.ts`
Why it matters: 16 `as any` casts trace back to untyped seed module
Suggested fix: Add `SeedData` interface covering all exported properties

**[65] Migrate all `eslint-disable` comments to proper config**
Category: Code Quality
Priority: P2
Effort: S
Where: Grep for `eslint-disable` across source
Why it matters: Inline disables hide issues and reduce lint coverage
Suggested fix: Add targeted overrides in eslint config instead

---

### Architecture (10 items)

**[66] Adopt react-query or SWR for data fetching**
Category: Architecture
Priority: P1
Effort: L
Where: `apps/web/src/lib/api/hooks.ts` (entire file)
Why it matters: No caching, deduplication, or stale-while-revalidate; every mount = fresh fetch
Suggested fix: Replace custom `useData` with TanStack Query — preserves API client, adds caching/dedup

**[67] Share types between frontend and backend**
Category: Architecture
Priority: P2
Effort: L
Where: `packages/shared/` (empty), `apps/web/src/lib/types.ts`, `apps/api/app/schemas/`
Why it matters: Type definitions are duplicated between TS and Pydantic — drift risk
Suggested fix: Generate TS types from OpenAPI spec, or use shared package

**[68] Add API versioning strategy**
Category: Architecture
Priority: P2
Effort: M
Where: `apps/api/app/api/v1/`, `apps/web/src/lib/api/client.ts`
Why it matters: Currently hardcoded to `/api/v1`; no strategy for breaking changes
Suggested fix: Document API versioning policy; add Accept header versioning

**[69] Implement feature flags**
Category: Architecture
Priority: P2
Effort: M
Where: `apps/web/src/lib/flags.ts` (create)
Why it matters: No way to gradually roll out features or A/B test
Suggested fix: Simple JSON flag system or integrate with LaunchDarkly/Unleash

**[70] Add production Dockerfile (multi-stage)**
Category: Architecture
Priority: P1
Effort: M
Where: `apps/web/Dockerfile`, `apps/api/Dockerfile`
Why it matters: Current Dockerfiles run dev servers — no production builds
Suggested fix: Multi-stage build: install deps → build → runtime with `next start`

**[71] Add Turborepo for monorepo orchestration**
Category: Architecture
Priority: P2
Effort: M
Where: `turbo.json` (create), `package.json` (root)
Why it matters: No build orchestration, caching, or dependency tracking between apps
Suggested fix: Add turbo.json with build/test/lint pipeline

**[72] Implement backend health check endpoint**
Category: Architecture
Priority: P1
Effort: S
Where: `apps/api/app/api/v1/` or `apps/api/app/main.py`
Why it matters: Docker healthchecks and load balancers need a health endpoint
Suggested fix: Add `GET /health` returning `{ status: "ok", db: "connected" }`

**[73] Add OpenAPI spec generation from backend**
Category: Architecture
Priority: P2
Effort: S
Where: `apps/api/` — FastAPI auto-generates OpenAPI
Why it matters: Frontend development can use generated types; API documentation automatic
Suggested fix: Export OpenAPI spec in CI; generate TS client types

**[74] Implement connection pooling config**
Category: Architecture
Priority: P1
Effort: S
Where: `apps/api/app/core/database.py`
Why it matters: Default SQLAlchemy pool may not be tuned for production load
Suggested fix: Configure pool_size, max_overflow, pool_recycle for production

**[75] Separate read/write database connections**
Category: Architecture
Priority: P2
Effort: L
Where: `apps/api/app/core/database.py`
Why it matters: Read replicas improve read-heavy dashboard performance
Suggested fix: Add read-only connection for GET endpoints, primary for mutations

---

### Performance (15 items)

**[76] Lazy-load Recharts with next/dynamic**
Category: Performance
Priority: P1
Effort: M
Where: 10 pages importing Recharts
Why it matters: Recharts is a heavy library loaded synchronously on every dashboard page
Suggested fix: `const Chart = dynamic(() => import('../charts/...'), { ssr: false })`

**[77] Add caching layer (react-query / SWR)**
Category: Performance
Priority: P1
Effort: L
Where: `apps/web/src/lib/api/hooks.ts`
Why it matters: Every component mount = fresh fetch; no deduplication
Suggested fix: TanStack Query with staleTime and gcTime configuration

**[78] Deduplicate N+1 hook calls in useCapitalModel**
Category: Performance
Priority: P1
Effort: M
Where: `apps/web/src/lib/hooks/use-capital-model.ts` (lines 62-71)
Why it matters: 10 independent API calls on every portfolio page render
Suggested fix: Create a single `/api/v1/capital-model` endpoint that returns composite data

**[79] Add `useMemo` for expensive computations in pages**
Category: Performance
Priority: P2
Effort: M
Where: 14 page files with inline computations
Why it matters: Filtering, sorting, and aggregation recomputed on every render
Suggested fix: Wrap filter/sort/compute logic in `useMemo` with appropriate deps

**[80] Code-split dashboard pages with dynamic imports**
Category: Performance
Priority: P2
Effort: M
Where: `apps/web/src/app/(dashboard)/*/page.tsx`
Why it matters: All pages loaded in initial bundle even if user visits one
Suggested fix: Next.js App Router handles this via route-based splitting — verify with `@next/bundle-analyzer`

**[81] Add `@next/bundle-analyzer` for bundle audit**
Category: Performance
Priority: P2
Effort: S
Where: `apps/web/package.json`, `apps/web/next.config.ts`
Why it matters: Cannot optimize what you can't measure
Suggested fix: `npm install @next/bundle-analyzer` and add ANALYZE=true support

**[82] Optimize font loading strategy**
Category: Performance
Priority: P2
Effort: S
Where: `apps/web/src/app/layout.tsx`
Why it matters: Two fonts (Inter + JetBrains Mono) loaded — ensure subsetting
Suggested fix: Next.js font optimization already applies; verify with Lighthouse

**[83] Add pagination to large list pages**
Category: Performance
Priority: P2
Effort: M
Where: `/assets/page.tsx`, `/decisions/page.tsx`, `/candidates/page.tsx`
Why it matters: Loading all items upfront doesn't scale to 100+ products
Suggested fix: Implement cursor-based pagination with "load more" or virtual scroll

**[84] Implement virtual scrolling for long lists**
Category: Performance
Priority: P2
Effort: M
Where: Tables with 20+ rows
Why it matters: Rendering 100+ table rows causes jank
Suggested fix: Use `@tanstack/react-virtual` for list virtualization

**[85] Prefetch adjacent routes on hover**
Category: Performance
Priority: P2
Effort: S
Where: Sidebar navigation links
Why it matters: Reduces perceived navigation latency
Suggested fix: Next.js `<Link prefetch>` is default — verify it's not disabled

**[86] Add API response compression**
Category: Performance
Priority: P1
Effort: S
Where: `apps/api/` — Uvicorn/Starlette middleware
Why it matters: JSON responses can be large for portfolio/allocation endpoints
Suggested fix: Add GZipMiddleware to FastAPI

**[87] Optimize Recharts tree-shaking**
Category: Performance
Priority: P2
Effort: S
Where: 10 files importing various Recharts components
Why it matters: Ensure only used components are bundled
Suggested fix: Verify imports are specific (`import { AreaChart }` not `import * as Recharts`)

**[88] Add staleTime configuration for data hooks**
Category: Performance
Priority: P1
Effort: S
Where: `apps/web/src/lib/api/hooks.ts` (once react-query adopted)
Why it matters: Portfolio data doesn't change every second — 30s stale time appropriate
Suggested fix: Configure staleTime per data type: 30s for dashboards, 5min for config

**[89] Preload critical data on layout mount**
Category: Performance
Priority: P2
Effort: M
Where: `apps/web/src/app/(dashboard)/layout.tsx`
Why it matters: Common data (user, display config, notifications) fetched by multiple pages
Suggested fix: Prefetch shared data in layout, pass via context

**[90] Implement database query optimization**
Category: Performance
Priority: P2
Effort: M
Where: `apps/api/app/api/v1/*.py` — query patterns
Why it matters: Eager loading, N+1 queries, missing indexes
Suggested fix: Add `selectinload`/`joinedload` for relationships; index common filter columns

---

### Developer Experience (5 items)

**[91] Add CONTRIBUTING.md with development guide**
Category: DX
Priority: P2
Effort: S
Where: `/CONTRIBUTING.md` (create)
Why it matters: New developers lack onboarding documentation
Suggested fix: Document setup, architecture, conventions, PR process

**[92] Add pre-commit hooks (lint + typecheck + test)**
Category: DX
Priority: P1
Effort: S
Where: `.husky/` or `.pre-commit-config.yaml`
Why it matters: Catches issues before they reach CI
Suggested fix: Use `husky` + `lint-staged` for pre-commit linting

**[93] Add VS Code workspace settings**
Category: DX
Priority: P2
Effort: S
Where: `.vscode/settings.json`, `.vscode/extensions.json`
Why it matters: Consistent editor experience across team
Suggested fix: ESLint auto-fix on save, recommended extensions, search exclusions

**[94] Add `npm run check` script combining lint + typecheck + test**
Category: DX
Priority: P2
Effort: S
Where: `apps/web/package.json`
Why it matters: Single command to verify all quality gates locally
Suggested fix: `"check": "npm run lint && npx tsc --noEmit && npx vitest run"`

**[95] Document API endpoints with examples**
Category: DX
Priority: P2
Effort: M
Where: `docs/API.md` or auto-generated from FastAPI OpenAPI
Why it matters: Frontend developers need API reference
Suggested fix: Export FastAPI's auto-generated /docs as static HTML

---

### Observability (15 items)

**[96] Add request ID header to all API calls**
Category: Observability
Priority: P1
Effort: S
Where: `apps/web/src/lib/api/client.ts`
Why it matters: Correlates frontend errors with backend logs for debugging
Suggested fix: Generate UUID per request, send as `X-Request-ID` header

**[97] Add structured logging on backend**
Category: Observability
Priority: P1
Effort: M
Where: `apps/api/` — logging configuration
Why it matters: Plain text logs are hard to parse and alert on
Suggested fix: Configure Python structlog or json-logging with request context

**[98] Add frontend error reporting**
Category: Observability
Priority: P1
Effort: M
Where: `apps/web/src/app/(dashboard)/error.tsx`, `client.ts`
Why it matters: Runtime errors in production go unnoticed
Suggested fix: Integrate Sentry or similar error tracking service

**[99] Add health check endpoint with dependency status**
Category: Observability
Priority: P1
Effort: S
Where: `apps/api/`
Why it matters: Monitors database connectivity, external service availability
Suggested fix: `GET /health` with db ping and dependency checks

**[100] Add API request duration logging**
Category: Observability
Priority: P2
Effort: S
Where: `apps/api/` — middleware
Why it matters: Identifies slow endpoints for optimization
Suggested fix: Add timing middleware logging request path, method, status, duration

**[101] Add frontend performance monitoring**
Category: Observability
Priority: P2
Effort: M
Where: `apps/web/src/app/layout.tsx`
Why it matters: Tracks Core Web Vitals and page load performance
Suggested fix: Add `web-vitals` library reporting to analytics endpoint

**[102] Add uptime monitoring**
Category: Observability
Priority: P2
Effort: S
Where: External service (UptimeRobot, Pingdom, etc.)
Why it matters: Detects outages before users report them
Suggested fix: Monitor health endpoint with 1-minute interval

**[103] Add database query logging in development**
Category: Observability
Priority: P2
Effort: S
Where: `apps/api/app/core/database.py`
Why it matters: Identifies N+1 queries and slow queries during development
Suggested fix: Enable SQLAlchemy `echo=True` when `DEBUG=true`

**[104] Add metric counters for mutations**
Category: Observability
Priority: P2
Effort: M
Where: `apps/api/app/api/v1/*.py` mutation endpoints
Why it matters: Tracks decision approvals, retirements, pricing activations over time
Suggested fix: Add Prometheus counters or StatsD metrics per endpoint

**[105] Add client-side console grouping for API calls**
Category: Observability
Priority: P2
Effort: S
Where: `apps/web/src/lib/api/client.ts` (dev mode only)
Why it matters: Easier debugging of API call sequences
Suggested fix: In development, `console.group` per API call with timing

**[106] Add deployment tagging**
Category: Observability
Priority: P2
Effort: S
Where: Build pipeline
Why it matters: Correlates errors with specific deployments
Suggested fix: Inject build SHA into `NEXT_PUBLIC_BUILD_ID` and display in help dialog

**[107] Add feature usage tracking**
Category: Observability
Priority: P2
Effort: M
Where: Key user interactions (command palette usage, decision approvals, etc.)
Why it matters: Understand which features are actually used
Suggested fix: Event tracking on key interactions (privacy-respecting, anonymous)

**[108] Add slow query alerting**
Category: Observability
Priority: P2
Effort: M
Where: Backend database monitoring
Why it matters: Prevents performance degradation from unnoticed slow queries
Suggested fix: Log queries exceeding 500ms threshold; alert on P95 > 1s

**[109] Add API deprecation headers**
Category: Observability
Priority: P2
Effort: S
Where: `apps/api/` — response headers
Why it matters: Communicates upcoming breaking changes to API consumers
Suggested fix: Add `Deprecation` and `Sunset` headers for deprecated endpoints

**[110] Add correlation between FE errors and BE logs**
Category: Observability
Priority: P1
Effort: M
Where: Both `client.ts` and backend middleware
Why it matters: Reduces mean time to resolution for production issues
Suggested fix: X-Request-ID generated on FE, logged on BE, included in error reports

---

### Testing (15 items)

**[111] Add component tests for critical pages**
Category: Testing
Priority: P1
Effort: L
Where: `/app/(dashboard)/portfolio/`, `/decisions/`, `/assets/`
Why it matters: 78+ UI files with zero test coverage
Suggested fix: Testing Library tests for rendering, interactions, error states

**[112] Add E2E tests for core workflows**
Category: Testing
Priority: P2
Effort: L
Where: `apps/web/e2e/` (create)
Why it matters: No end-to-end validation of user journeys
Suggested fix: Playwright tests: login → portfolio → asset → decision approve

**[113] Add contract tests between FE and BE**
Category: Testing
Priority: P2
Effort: M
Where: `apps/web/src/lib/api/__tests__/contracts/`
Why it matters: Frontend types and backend schemas can drift
Suggested fix: Test API responses against TypeScript interfaces using Zod

**[114] Test error boundary behavior**
Category: Testing
Priority: P1
Effort: S
Where: `apps/web/src/app/(dashboard)/error.tsx`
Why it matters: Error boundary exists but is never tested
Suggested fix: Test that throwing component renders ErrorState with retry

**[115] Add mutation flow tests**
Category: Testing
Priority: P1
Effort: M
Where: Decision approval, retirement review, pricing activation
Why it matters: Critical capital workflows have no test coverage
Suggested fix: Mock API, simulate click → loading → success → toast → refetch

**[116] Test auth flow (login → session → protected route)**
Category: Testing
Priority: P1
Effort: M
Where: Auth context + permission guard
Why it matters: Auth is critical path with complex token refresh logic
Suggested fix: Test login → token storage → session cookie → protected navigation

**[117] Add visual regression tests**
Category: Testing
Priority: P2
Effort: L
Where: `apps/web/e2e/`
Why it matters: Detect unintended UI changes across 16+ pages
Suggested fix: Playwright screenshot comparison for each page

**[118] Test seed data referential integrity**
Category: Testing
Priority: P1
Effort: S
Where: `apps/web/src/lib/mock-data/seed.test.ts` (create)
Why it matters: Seed data changes could break demo mode silently
Suggested fix: Test all cross-references (decision.productId exists in products, etc.)

**[119] Add load testing for API**
Category: Testing
Priority: P2
Effort: M
Where: `apps/api/tests/load/`
Why it matters: Unknown breaking point under concurrent load
Suggested fix: k6 or Locust script hitting key endpoints

**[120] Increase test coverage to 80%+ on critical modules**
Category: Testing
Priority: P1
Effort: M
Where: `hooks.ts` (currently only tests seed paths), `client.ts`
Why it matters: Coverage threshold exists (80%) but critical paths untested
Suggested fix: Add API-mocked tests for success/failure/retry paths

**[121] Fix pre-existing test failures**
Category: Testing
Priority: P1
Effort: S
Where: `apps/web/src/lib/hooks/use-fade-in-on-scroll.test.ts`
Why it matters: 69 test failures due to missing jsdom environment config
Suggested fix: Add `@vitest-environment jsdom` directive or fix IntersectionObserver mock

---

### Data Integrity (10 items)

**[122] Add optimistic locking for decision approvals**
Category: Data
Priority: P1
Effort: M
Where: `apps/api/app/api/v1/decisions.py`
Why it matters: Concurrent approvals could corrupt decision state
Suggested fix: Add version field; reject if version doesn't match

**[123] Validate financial calculation consistency**
Category: Data
Priority: P1
Effort: M
Where: ROI calculation across frontend and backend
Why it matters: Frontend computes ROI independently — drift from backend values
Suggested fix: Backend should be single source of truth for ROI; FE displays only

**[124] Add database constraints for financial data**
Category: Data
Priority: P1
Effort: M
Where: `apps/api/app/models/`
Why it matters: Negative costs, impossible ROI values could be stored
Suggested fix: CHECK constraints: `monthly_cost >= 0`, `roi >= 0`, `cost_coverage BETWEEN 0 AND 1`

**[125] Implement soft delete for capital decisions**
Category: Data
Priority: P2
Effort: M
Where: `apps/api/app/models/decision.py`
Why it matters: Hard deletes lose audit trail for financial decisions
Suggested fix: Add `deleted_at` timestamp; filter in queries

**[126] Add idempotency keys for mutations**
Category: Data
Priority: P1
Effort: M
Where: `apps/api/app/api/v1/decisions.py`, `pricing.py`
Why it matters: Network retries could create duplicate decisions
Suggested fix: Accept `X-Idempotency-Key` header; store and check before processing

**[127] Validate lifecycle stage transitions**
Category: Data
Priority: P1
Effort: S
Where: `apps/api/app/api/v1/lifecycle.py`
Why it matters: Invalid transitions (retired → active) should be prevented
Suggested fix: Add state machine validation: `VALID_TRANSITIONS = { "draft": ["active"], ... }`

**[128] Add audit trail for value declarations**
Category: Data
Priority: P1
Effort: M
Where: `apps/api/app/services/audit_service.py`
Why it matters: Value declarations drive ROI — changes need full history
Suggested fix: Log old value, new value, who changed, when, why

**[129] Ensure decimal precision for financial calculations**
Category: Data
Priority: P1
Effort: S
Where: `apps/api/app/models/` — column definitions
Why it matters: Float arithmetic causes rounding errors in currency
Suggested fix: Use `Numeric(12, 2)` for currency columns, not Float

**[130] Add data retention policy**
Category: Data
Priority: P2
Effort: M
Where: Backend scheduled tasks
Why it matters: Unbounded data growth; regulatory compliance
Suggested fix: Archive data older than 2 years; purge PII per policy

**[131] Validate referential integrity in API mutations**
Category: Data
Priority: P1
Effort: S
Where: `apps/api/app/api/v1/decisions.py` — create decision
Why it matters: Decision could reference non-existent product ID
Suggested fix: Validate productId exists before creating decision; return 404 if not

---

### UI Polish (items 132-135)

**[132] Add keyboard navigation for data tables**
Category: UI
Priority: P2
Effort: M
Where: Table components across pages
Why it matters: Accessibility for keyboard-only users
Suggested fix: Add arrow key navigation and Enter to open detail

**[133] Add focus indicators for interactive elements**
Category: UI
Priority: P2
Effort: S
Where: Global CSS / Tailwind config
Why it matters: Keyboard users can't see which element is focused
Suggested fix: Ensure `focus-visible:ring-2 focus-visible:ring-blue-500` on all interactive elements

**[134] Add loading indicator on route transitions**
Category: UI
Priority: P2
Effort: S
Where: `apps/web/src/app/(dashboard)/layout.tsx`
Why it matters: No feedback during client-side navigation between pages
Suggested fix: Add NProgress or similar top-bar loading indicator

**[135] Add "What's New" changelog indicator**
Category: UI
Priority: P2
Effort: M
Where: `apps/web/src/components/layout/page-header.tsx`
Why it matters: Users don't know when features are added
Suggested fix: Changelog indicator on help button, dismissible after viewing
