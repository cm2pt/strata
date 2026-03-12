# Strata — Quality Gates

> CI checks, release checklist, and local development standards.
> Reviewed: 2026-02-25

---

## 1. CI Pipeline Gates (GitHub Actions)

### Current State

| Gate | Status | Config |
|------|--------|--------|
| Backend pytest | ✅ Active | Python 3.12, SQLite in-memory |
| Backend coverage (80%) | ✅ Active | `pytest --cov --cov-fail-under=80` |
| Frontend vitest | ✅ Active | Node.js 20 |
| Frontend coverage | ✅ Active | Via vitest config |
| TypeScript typecheck | ❌ Missing | — |
| ESLint | ❌ Missing | — |
| Dependency audit | ❌ Missing | — |
| Security scan (SAST) | ❌ Missing | — |
| Docker build test | ❌ Missing | — |
| Bundle size check | ❌ Missing | — |

### Recommended CI Pipeline

```yaml
# .github/workflows/ci.yml — recommended additions
jobs:
  frontend-quality:
    steps:
      # 1. Type check (MUST PASS — catches runtime crashes)
      - run: npx --package=typescript tsc --noEmit --project apps/web/tsconfig.json

      # 2. Lint (MUST PASS — catches code quality issues)
      - run: npx next lint --dir apps/web/src

      # 3. Unit tests with coverage (MUST PASS — 80% threshold)
      - run: npx vitest run --coverage
        working-directory: apps/web

      # 4. Bundle size check (WARN only — tracks regressions)
      - run: npx next build
        working-directory: apps/web
      - uses: andresz1/size-limit-action@v1  # or similar

  security:
    steps:
      # 5. npm audit (MUST PASS for critical/high)
      - run: npm audit --audit-level=high
        working-directory: apps/web

      # 6. pip audit (MUST PASS for critical/high)
      - run: pip install pip-audit && pip-audit
        working-directory: apps/api

      # 7. SAST scan (SHOULD PASS — may have false positives initially)
      - uses: returntocorp/semgrep-action@v1
        with:
          config: p/typescript p/python p/security-audit

  backend-quality:
    steps:
      # 8. Type check (mypy or pyright)
      - run: mypy app/ --ignore-missing-imports
        working-directory: apps/api

      # 9. Lint (ruff)
      - run: ruff check app/
        working-directory: apps/api

      # 10. Tests with coverage (existing)
      - run: pytest --cov --cov-fail-under=80

  docker:
    steps:
      # 11. Build Docker images (MUST PASS — catches Dockerfile issues)
      - run: docker compose build --no-cache
```

### Gate Severity Levels

| Level | Action | Examples |
|-------|--------|---------|
| 🔴 **MUST PASS** | Blocks merge to main | TypeScript, tests, lint, security critical/high |
| 🟡 **SHOULD PASS** | Warning comment on PR | SAST scan, bundle size |
| 🟢 **INFORMATIONAL** | Logged for tracking | Coverage delta, dependency age |

---

## 2. Pre-Merge Checklist (Pull Requests)

### Automated Checks (enforced by CI)

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `vitest run` passes all tests
- [ ] `pytest --cov-fail-under=80` passes
- [ ] `npm audit --audit-level=high` reports no critical/high vulnerabilities
- [ ] `pip-audit` reports no critical/high vulnerabilities
- [ ] No new `any` types introduced (grep check)
- [ ] No new `console.log` statements in production code

### Manual Review Checklist

**Code Quality:**
- [ ] New files follow existing patterns (hooks, tokens, shared components)
- [ ] No duplicated logic — uses `useMutation` hook for mutations
- [ ] Error states handled (loading → skeleton, error → ErrorState, empty → EmptyState)
- [ ] New pages use `PageHeader` + `PageShell` layout
- [ ] Functions have JSDoc comments for public APIs
- [ ] No magic numbers — use named constants

**Security:**
- [ ] No secrets, tokens, or API keys in code or comments
- [ ] User input is validated before use
- [ ] API mutations check `canMutate` guard
- [ ] New endpoints have `require_permission()` decorator
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Error messages don't leak internal details to client

**Performance:**
- [ ] Charts/heavy components use `next/dynamic` with `ssr: false`
- [ ] Lists with 50+ items use virtualization
- [ ] No unnecessary re-renders (memo, useCallback where appropriate)
- [ ] Images use `next/image` with appropriate sizing

**Accessibility:**
- [ ] Interactive elements have `aria-label` or visible text
- [ ] Focus management is correct for dialogs/modals
- [ ] Color is not the only indicator (shapes, text accompany color)
- [ ] Keyboard navigation works for all interactive elements

**Testing:**
- [ ] New utility functions have unit tests
- [ ] New hooks have integration tests
- [ ] Critical user flows have at least smoke tests
- [ ] Test coverage does not decrease

---

## 3. Release Checklist

### Pre-Release

| # | Check | Command / Action | Owner |
|---|-------|-----------------|-------|
| 1 | All CI gates green on main | Check GitHub Actions | DevOps |
| 2 | No critical/high vulnerabilities | `npm audit` + `pip-audit` | Security |
| 3 | TypeScript clean | `npx tsc --noEmit` | Frontend |
| 4 | All tests pass | `vitest run` + `pytest` | QA |
| 5 | Manual smoke test on staging | Walk through DEMO.md script | QA |
| 6 | Environment variables documented | Compare `.env.example` with deployment config | DevOps |
| 7 | Database migrations tested | `alembic upgrade head` on staging | Backend |
| 8 | JWT secret is NOT default | Verify `jwt_secret != "dev-secret-change-in-production"` | Security |
| 9 | DEMO_MODE is false | Verify `demo_mode=false` in production env | DevOps |
| 10 | CORS origins restricted | Verify `cors_origins` lists only production domains | Security |
| 11 | Security headers active | Verify with `curl -I` or securityheaders.com | Security |
| 12 | Docker images use production builds | Verify `npm run build && npm start`, not `npm run dev` | DevOps |

### Post-Release

| # | Check | Action | Owner |
|---|-------|--------|-------|
| 1 | Health check passes | `curl /health` returns 200 | DevOps |
| 2 | Login flow works | Manual login + verify JWT | QA |
| 3 | Permission enforcement | Test restricted endpoint with viewer role | QA |
| 4 | No console errors | Check browser console on all main pages | QA |
| 5 | Error monitoring active | Verify error tracking receives test error | DevOps |
| 6 | Metrics flowing | Check dashboard for request rate, latency, error rate | DevOps |

### Rollback Criteria

Immediate rollback if any of:
- 5xx error rate > 1% for 5 minutes
- Login flow broken
- Database migration fails
- Security header scan fails
- Zero successful API responses for 2 minutes

---

## 4. Local Development Checklist

### First-Time Setup

```bash
# 1. Clone and install
git clone <repo> && cd strata
npm install                                    # root workspace
cd apps/web && npm install && cd ../..
cd apps/api && pip install -e ".[dev]" && cd ../..

# 2. Environment
cp apps/api/.env.example apps/api/.env         # Edit with local values
# For demo mode (no backend): leave NEXT_PUBLIC_API_URL unset
# For full stack: set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# 3. Database (if running backend)
docker compose up -d db
cd apps/api && alembic upgrade head && cd ../..

# 4. Verify
cd apps/web && npx tsc --noEmit                # Should be 0 errors
cd apps/web && npx vitest run                  # Should pass 34+ tests
```

### Before Every Commit

```bash
# Run from apps/web/
npx --package=typescript tsc --noEmit          # Type safety
npx vitest run                                  # Tests pass
# Optionally: npx next lint --dir src          # Lint check
```

### Before Every PR

```bash
# All of the above, plus:
npm audit --audit-level=high                   # No critical vulnerabilities
# Check for common issues:
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v ".d.ts"
grep -r "(seed as any)" src/ --include="*.ts"  # Should be 0 (tracked for reduction)
grep -r "catch (e: any)" src/ --include="*.ts" --include="*.tsx"  # Should be 0
```

### Code Style Standards

| Rule | Standard | Rationale |
|------|----------|-----------|
| Imports | Grouped: react → next → external → internal → types | Readability |
| Components | One component per file; co-locate helpers | Maintainability |
| Hooks | Prefix with `use`; return `{ data, loading, error }` pattern | Consistency |
| Error handling | `catch (e: unknown)` with `instanceof Error` narrowing | Type safety |
| Mutations | Use `useMutation` hook; check `canMutate` first | No boilerplate duplication |
| Loading states | `KPISkeleton` / `CardSkeleton` / `TableSkeleton` | No "Loading..." text |
| Empty states | `EmptyState` component with icon + description + optional action | Consistent UX |
| Error states | `ErrorState` component with retry button | Consistent UX |
| Page layout | `PageHeader` + `PageShell` wrapper | Consistent structure |
| Formatting | Prettier defaults (via editor); no trailing semicolons in config | Clean diffs |
| Naming | camelCase for variables/functions; PascalCase for components/types | Convention |

---

## 5. Test Coverage Requirements

### Current Coverage

| Area | Files | Tests | Coverage |
|------|-------|-------|----------|
| Format utilities | `format.ts` | 34 tests | ~95% |
| Auth context | `context.tsx` | 8 tests | ~80% |
| API client | `client.ts` | 4 tests | ~60% |
| Hooks | `hooks.ts` | 4 tests | ~30% |
| Components | 50+ files | 0 tests | 0% |
| Pages | 16+ files | 0 tests | 0% |

### Target Coverage (Next Quarter)

| Area | Target | Priority |
|------|--------|----------|
| Utility functions | 95% | P0 — catches data formatting bugs |
| Custom hooks | 80% | P0 — catches data fetching issues |
| Shared components | 70% | P1 — catches UI regressions |
| Page-level smoke tests | 50% | P1 — catches integration issues |
| E2E flows (Playwright) | 5 critical flows | P2 — catches full-stack regressions |

### Critical Test Scenarios (must exist)

| # | Scenario | Type | Files |
|---|----------|------|-------|
| 1 | `formatROI(null)`, `formatROI(undefined)` return "—" | Unit | `format.test.ts` ✅ |
| 2 | `formatCurrency(0)` returns "$0" not "—" | Unit | `format.test.ts` ✅ |
| 3 | `useData` shows error state when API fails (not seed data) | Integration | `hooks.test.ts` ❌ |
| 4 | Auth login flow sets tokens and cookie | Integration | `context.test.ts` ✅ |
| 5 | Permission gate hides restricted buttons | Component | Missing ❌ |
| 6 | KPICard renders with all variant props | Component | Missing ❌ |
| 7 | Portfolio page renders with seed data | Smoke | Missing ❌ |
| 8 | Decision approval workflow | E2E | Missing ❌ |
| 9 | Command palette search + navigation | Component | Missing ❌ |
| 10 | Error boundary catches and displays errors | Component | Missing ❌ |

---

## 6. Monitoring Gates (Production)

### Required Dashboards

| Dashboard | Metrics | Alert Threshold |
|-----------|---------|----------------|
| **API Health** | Request rate, latency p50/p95/p99, error rate | Error rate > 1% for 5min |
| **Auth** | Login success/failure rate, token refresh rate | Failure rate > 10% for 5min |
| **Database** | Connection pool usage, query latency, deadlocks | Pool exhaustion > 80% |
| **Frontend** | Core Web Vitals (LCP, FID, CLS), JS error rate | LCP > 4s or error rate > 0.5% |
| **Business** | Active users, decisions created, capital freed | Anomaly detection |

### Required Alerts

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| API down | Health check fails 3× consecutive | 🔴 P0 | PagerDuty + Slack |
| High error rate | 5xx > 1% for 5 min | 🔴 P0 | PagerDuty + Slack |
| Auth failure spike | Login failures > 50/min | 🟠 P1 | Slack |
| Slow API | p95 latency > 2s for 10 min | 🟡 P2 | Slack |
| Certificate expiry | SSL cert expires in < 14 days | 🟠 P1 | Email + Slack |
| Dependency vulnerability | Critical CVE in npm/pip | 🟠 P1 | Slack |
| Database disk | > 80% capacity | 🟡 P2 | Slack |

---

## 7. Definition of Done

A feature/fix is "done" when ALL of the following are true:

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | Code compiles with zero TypeScript errors | CI: `tsc --noEmit` |
| 2 | All existing tests pass | CI: `vitest run` + `pytest` |
| 3 | New code has tests (unit for utils, smoke for pages) | Code review |
| 4 | No new `any` types (use `unknown` + narrowing) | Code review + grep |
| 5 | Loading/error/empty states handled | Code review |
| 6 | Accessibility basics met (aria-labels, keyboard nav) | Code review |
| 7 | No secrets in code | Code review + git-secrets |
| 8 | PR description includes "What" and "Why" | PR template |
| 9 | Demo mode works (no crashes without API) | Manual test |
| 10 | Production mode works (no silent mock data) | Manual test |
