# Capital Hierarchy — UI Information Architecture

> Every section on the Portfolio page must answer: "What decision should I make next and what's the capital impact?"

---

## Visual Priority (top to bottom)

| Priority | Component | What it shows | Typography |
|----------|-----------|---------------|------------|
| 1 | **CapitalHeader** | Monthly Data Capital Spend (hero), Misallocated, Freed, Decision Latency, Board Snapshot | `text-4xl font-mono` hero, `text-lg font-mono` secondary |
| 2 | **CapitalActions** | 3-5 action cards with $ impact, confidence, approver, CTA | `typography.valueMono` for amounts |
| 3 | **DecisionCockpit** | Decision Queue table + Coverage & Auditability sidebar | `typography.tableMono` for figures |
| 4 | **InactionCost** | Projected spend + liability if no action taken | `text-2xl font-mono` amber |
| 5 | **CapitalFlowChart** | Monthly spend, misallocation, freed, recovered (bar chart) | Chart axis via `chartAxis` tokens |
| 6 | **BCGMatrix** | Usage vs. cost scatter (financial labels mode) | `text-[10px]` quadrant labels |
| 7 | **CostValueTrend** | 6-month cost vs. composite value trend | Demoted, full-width |
| 8 | **Retirement / Top Performers** | Supporting lists | Standard table text |

---

## Capital Metrics — Where Each Is Computed

All metrics are computed client-side in `src/lib/hooks/use-capital-model.ts`.

| Metric | Source Hooks | Computation |
|--------|-------------|-------------|
| `monthlyCapitalSpend` | `usePortfolioSummary` | `summary.totalCost` |
| `capitalMisallocated` | `useDataProducts` | Sum `monthlyCost` where `roiBand === 'critical'` OR (`declaredValue === null` AND `roi < 1.0`) |
| `capitalFreedLast90d` | `useDecisions` | Sum `capitalFreed` from decisions resolved within 90 days |
| `capitalFreedRunRate` | `useDecisions` | Sum `projectedSavingsMonthly` from recent resolved decisions |
| `capitalFreedOneTime` | Derived | `capitalFreedLast90d - capitalFreedRunRate` (floored at 0) |
| `decisionLatencyMedianDays` | `useDecisions`, `useCapitalBehavior` | Median of `resolvedAt - createdAt` days; fallback to `avgDecisionVelocityDays` |
| `boardSnapshotCostDelta` | `useExecutiveSummary` | `projectedMonthlyCost - currentMonthlyCost` |
| `boardSnapshotRoiDelta` | `useExecutiveSummary` | `projectedROI - currentROI` |
| `capitalActions` | Multiple | 4 action cards: retire (decisions), reallocate (rebalance), price (policies), review AI (scorecards) |
| `decisionQueue` | `useDecisions`, `useDataProducts` | Map `under_review` decisions to rows with SLA computation |
| `capitalFlowData` | `usePortfolioCostTrend`, `useCapitalImpact` | Merge monthly cost with freed-by-month lookup |
| `costCoverage` | `usePortfolioSummary` | Direct passthrough |
| `valueCoverage` | `useDataProducts`, `usePortfolioSummary` | `productsWithValue / totalProducts` |
| `confidenceLevel` | `useExecutiveSummary` | Direct passthrough |
| `decisionProvenance` | `useDecisions` | Fraction of decisions with both `assignedTo` and `impactBasis` |

---

## Formatting Rules

| Range | Format | Example |
|-------|--------|---------|
| >= $1M | `$X.XM` | `$1.2M` |
| >= $1K | `$X.XK` | `$32.2K` |
| < $1K | `$X` | `$850` |
| ROI | `X.Xx` | `2.1x` |
| Percentages | `XX%` | `85%` |
| Days | `X days` | `16 days` |

All currency formatting via `formatCurrency(value, true)` from `src/lib/format.ts`.

---

## Color Semantics

| Color | Token | Meaning | Use |
|-------|-------|---------|-----|
| Teal | `brand.accentGreen` / `#0F766E` | Capital freed, positive outcome | Freed amounts, positive deltas |
| Amber | `brand.alertAmber` / `#B45309` | At risk, misallocated, warning | Misallocation, SLA warnings, inaction |
| Red | `brand.riskRed` / `#7F1D1D` | Liability, cost, negative | Cost bars, overdue SLA, loss projections |
| Blue | `#2563EB` | Recovered / pricing revenue | Recovered bar in capital flow chart |
| Navy | `brand.deepNavy` / `#0B1220` | Authority, board-level | Board Snapshot pill background |
| Gray | `brand.graphite` / `#1A2332` | Neutral primary text | Hero metric, standard labels |

---

## SLA Thresholds (Decision Queue)

| Days Since Created | Status | Color |
|-------------------|--------|-------|
| 0-10 | `on_track` | Green |
| 11-14 | `at_risk` | Amber |
| 15+ | `overdue` | Red |

---

## Component Inventory

### New Components

| Component | File | Props |
|-----------|------|-------|
| `CapitalHeader` | `src/components/portfolio/capital-header.tsx` | `{ model: CapitalModel }` |
| `CapitalActions` | `src/components/portfolio/capital-actions.tsx` | `{ actions: CapitalActionCard[] }` |
| `DecisionCockpit` | `src/components/portfolio/decision-cockpit.tsx` | `{ model: CapitalModel; className? }` |
| `InactionCost` | `src/components/portfolio/inaction-cost.tsx` | `{ model: CapitalModel }` |
| `CapitalFlowChart` | `src/components/charts/capital-flow-chart.tsx` | `{ data: CapitalFlowDataPoint[]; height? }` |

### Modified Components

| Component | Changes |
|-----------|---------|
| `BCGMatrix` | Added `showFinancialLabels` (financial quadrant labels) and `lowConfidenceIds` (dashed amber ring) props |
| `ExecutiveIntelligence` | Deprecated — kept for board-view, replaced by DecisionCockpit on Portfolio page |

### Composition Hook

| Hook | File | Returns |
|------|------|---------|
| `useCapitalModel` | `src/lib/hooks/use-capital-model.ts` | `{ data: CapitalModel \| null; loading: boolean }` |

Consumes 10 existing hooks internally. All capital metrics are derived client-side via `useMemo`.
