# Strata UX/UI Audit

> Comprehensive audit of all routes, components, workflows, and interaction patterns.
> Performed: 2026-02-25

---

## Executive Summary

Strata's UX has been significantly standardized (PageHeader, skeleton loading, ErrorState, EmptyState, demo mode banner, command palette, grouped sidebar). The remaining issues fall into three categories: **dead buttons** (controls that render but do nothing), **inconsistent error/empty states**, and **accessibility gaps**. This document ranks every finding by severity and provides fix prescriptions.

---

## Severity Definitions

| Level | Meaning |
|-------|---------|
| 🔴 **Critical** | Crashes, data loss, or completely broken workflows |
| 🟠 **High** | Dead buttons, misleading UI, or broken user expectations |
| 🟡 **Medium** | Inconsistency, missing feedback, or polish issues |
| 🟢 **Low** | Accessibility, documentation, or minor style issues |

---

## Findings

### 🔴 Critical

| # | Issue | Page(s) | Fix |
|---|-------|---------|-----|
| 1 | No route-level error boundary — unhandled JS errors show white screen | All `/dashboard/*` | Add `error.tsx` in `(dashboard)` layout |

### 🟠 High — Dead Buttons

| # | Issue | Page(s) | Fix |
|---|-------|---------|-----|
| 2 | HelpCircle button in PageHeader has no `onClick` | Every page (16+) | Wire to open a help drawer or link to docs |
| 3 | "Revalidate" button (value declaration) — no handler | `/assets/[id]` | Wire to `apiPost("/products/{id}/value/revalidate")` + toast |
| 4 | "Edit" button (value declaration) — no handler | `/assets/[id]` | Wire to `apiPost("/products/{id}/value")` + toast |
| 5 | "Declare Value" button — no handler | `/assets/[id]` (no value) | Wire to `apiPost("/products/{id}/value/declare")` + toast |
| 6 | "Start Retirement Review" button — no handler | `/assets/[id]` (retirement candidate) | Wire to `apiPost("/decisions")` retirement type + toast + redirect |
| 7 | "Dismiss" button (retirement candidate) — no handler | `/assets/[id]` (retirement candidate) | Wire to `apiPatch("/products/{id}")` dismiss + toast |
| 8 | "How this is calculated →" link — no handler | `/assets/[id]` (2 instances) | Wire to open an explanation tooltip or dialog |
| 9 | "Export Summary" button — no handler | `/simulate` | Wire to `toastWarning("Export coming soon")` or generate CSV |
| 10 | "Save Scenario" button — no handler | `/simulate` | Wire to `apiPost("/simulations/save")` + toast |
| 11 | "Add Connector" button — no handler | `/setup` | Wire to `toastWarning("Connector wizard coming soon")` |
| 12 | "Sync Now" button — no handler | `/setup` | Wire to `apiPost("/connectors/{id}/sync")` + toast |
| 13 | "Settings" icon button — no handler | `/setup` | Wire to `toastWarning("Connector settings coming soon")` |
| 14 | "Connect Platform" button — no handler | `/setup` | Wire to `toastWarning("Connector wizard coming soon")` |
| 15 | "Manage" button (Teams & Users) — no handler | `/setup` | Wire to `toastWarning("Team management coming soon")` |
| 16 | "Manage" button (Roles & Permissions) — no handler | `/setup` | Wire to `toastWarning("Role management coming soon")` |
| 17 | "Configure" button (ROI Configuration) — no handler | `/setup` | Wire to `toastWarning("ROI configuration coming soon")` |

### 🟡 Medium — Inconsistent States & Patterns

| # | Issue | Page(s) | Fix |
|---|-------|---------|-----|
| 18 | Inline "No data" fallback instead of EmptyState | `/capital-impact` (line 70-76) | Replace with `<ErrorState>` or `<EmptyState>` |
| 19 | Inline "No rebalance data" div instead of EmptyState | `/capital-review` (line 408-410) | Replace with `<EmptyState>` |
| 20 | Inline "No behavior data" div instead of EmptyState | `/capital-review` (line 487-489) | Replace with `<EmptyState>` |
| 21 | Inline "No trend data" div instead of EmptyState | `/capital-review` (line 252) | Replace with `<EmptyState>` |
| 22 | Empty chart fallback text inconsistent across pages | `/capital-impact`, `/capital-review` | Standardize to EmptyState with chart icon |
| 23 | Deprecated `topbar.tsx` still exists | `components/layout/` | Delete file |
| 24 | Settings icon button in `/setup` missing `aria-label` | `/setup` | Add `aria-label="Connector settings"` |
| 25 | KPI Info button in `kpi-card.tsx` missing `aria-label` | All pages with KPIs | Add `aria-label="More info"` |
| 26 | Toast dismiss button missing `aria-label` | Global (toast.tsx) | Add `aria-label="Dismiss"` |
| 27 | NotificationBell button missing `aria-label` | Every page | Add `aria-label="Notifications"` |
| 28 | HelpCircle button in PageHeader missing `aria-label` | Every page | Add `aria-label="Help"` |

### 🟢 Low — Polish & Documentation

| # | Issue | Page(s) | Fix |
|---|-------|---------|-----|
| 29 | No DEMO.md board demo script | Docs | Create `DEMO.md` with 3-minute walkthrough |
| 30 | Tables don't use typography tokens for headers | Multiple | Could standardize but not blocking |

---

## Implementation Priority

### Immediate (this session)

1. **Error boundary** (`error.tsx`) — prevents white-screen crashes
2. **Fix HelpCircle** — dead on every single page
3. **Wire all dead buttons** — 16 dead controls across 3 pages
4. **Inline error/empty states** — replace with shared components
5. **Delete `topbar.tsx`** — dead code cleanup
6. **Aria-labels** — 5 icon buttons across shared components
7. **DEMO.md** — board demo script

### Future

- Sortable table columns (except assets page which already has it)
- Typography token usage in table headers
- Help drawer/documentation system (for HelpCircle)

---

## Route Coverage Matrix

| Route | PageHeader | Skeleton | ErrorState | EmptyState | Breadcrumbs | Dead Buttons |
|-------|-----------|----------|------------|------------|-------------|--------------|
| `/portfolio` | ✅ | ✅ | ✅ | N/A | N/A | 0 |
| `/portfolio/board-view` | ✅ | ✅ | ✅ | N/A | ✅ | 0 |
| `/decisions` | ✅ | ✅ | N/A | ✅ | N/A | 0 |
| `/decisions/[id]` | ✅ | ✅ | ✅ | N/A | ✅ | 0 |
| `/assets` | ✅ | ✅ | N/A | ✅ | N/A | 0 |
| `/assets/[id]` | ✅ | ✅ | N/A | N/A | ✅ | **6** |
| `/candidates` | ✅ | ✅ | N/A | ✅ | N/A | 0 |
| `/candidates/[id]` | ✅ | ✅ | ✅ | N/A | ✅ | 0 |
| `/lifecycle` | ✅ | ✅ | N/A | N/A | N/A | 0 (fixed) |
| `/capital-impact` | ✅ | ✅ | ⚠️ inline | ⚠️ inline | N/A | 0 |
| `/capital-review` | ✅ | ✅ | N/A | ⚠️ inline | N/A | 0 |
| `/capital-projection` | ✅ | ✅ | N/A | N/A | N/A | 0 |
| `/ai-scorecard` | ✅ | ✅ | N/A | N/A | N/A | 0 |
| `/allocation` | ✅ | ✅ | N/A | N/A | N/A | 0 |
| `/marketplace` | ✅ | ✅ | N/A | ✅ | N/A | 0 |
| `/simulate` | ✅ | ✅ | N/A | ✅ | N/A | **2** |
| `/setup` | ✅ | ✅ | N/A | N/A | N/A | **7** |

**Total dead buttons remaining: 15** (down from 17+ before lifecycle fix)
