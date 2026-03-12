# Data Coherence Contract

> Every number shown on any Strata surface must be traceable to a canonical formula,
> reconcilable to its underlying rows, and consistent across every page that displays it.

## 1. Canonical Metric Definitions

### 1.1 Portfolio Monthly Spend

```
portfolio_monthly_spend = SUM(product.monthlyCost) for ALL non-retired products
```

- **Source**: `dataProducts[].monthlyCost`
- **Provenance**: Automated (connector extraction) or Manual (user input)
- **Surfaces**: Portfolio page, Capital Review, Board View, Executive Summary, Capital Projection
- **Tolerance**: Exact (0%)

### 1.2 Product Monthly Spend

```
product_monthly_spend = product.costBreakdown.compute
                      + product.costBreakdown.storage
                      + product.costBreakdown.pipeline
                      + product.costBreakdown.humanEstimate
```

- **Source**: Cost connector extraction per platform
- **Provenance**: Automated via connector sync
- **Constraint**: `product.monthlyCost === SUM(costBreakdown components)` always

### 1.3 Composite Value

```
composite_value = 0.7 * declared_value + 0.3 * usage_implied_value

# When declared_value is null:
composite_value = 0.3 * usage_implied_value
```

- **Weights**: Configurable via `orgInfo.valueWeights` (default: "70/30 declared/usage")
- **Surfaces**: Asset detail, Portfolio, Allocation

### 1.4 Product ROI

```
product_roi = composite_value / monthly_cost    (when monthly_cost > 0)
product_roi = null                               (when monthly_cost === 0 OR composite_value === 0)
```

- **ROI Bands** (from `displayConfig.roiBands`):
  - `high`: ROI >= 3.0
  - `healthy`: 1.5 <= ROI < 3.0
  - `underperforming`: 0.5 <= ROI < 1.5
  - `critical`: ROI < 0.5

### 1.5 Portfolio Average ROI

```
portfolio_avg_roi = SUM(composite_value for all non-retired products with cost > 0)
                  / SUM(monthly_cost for all non-retired products with cost > 0)
```

- **Method**: Cost-weighted (not simple average of product ROIs)
- **Surfaces**: Portfolio Summary, Board View, Capital Review, Capital Projection
- **Constraint**: Must be identical everywhere it appears
- **Note**: Products with `lifecycleStage === "retired"` or `monthlyCost === 0` are excluded

### 1.6 Capital Freed (Run-Rate)

```
capital_freed_monthly = SUM(capital_event.amount)
                        for events WHERE event_type IN ('retirement_freed', 'cost_optimization')

capital_freed_annual = capital_freed_monthly * 12
```

- **Source**: `capitalEvents[]` created when decisions are approved
- **Surfaces**: Savings Summary, Capital Impact, Board View, Portfolio
- **Constraint**: All surfaces must show the same total
- **By-type breakdown**:
  - `retirement_freed`: Sum of amounts for retirement events
  - `cost_optimization`: Sum of amounts for optimization events

### 1.7 Capital Misallocated

```
capital_misallocated = SUM(monthly_cost) for products WHERE roi < 1.0 AND lifecycle != 'retired'
```

- **Surfaces**: Portfolio page, Board View
- **Provenance**: Derived from product ROI

### 1.8 Decision Latency

```
avg_decision_latency = AVG(resolved_at - created_at) in days
                       for decisions WHERE status IN ('approved', 'rejected')
```

- **Surfaces**: Capital Behavior, Board View

### 1.9 Capital Efficiency Index (CEI)

```
CEI = SUM(component_scores)   range: [0, 100]
```

**Components** (max weights configurable, default below):

| Component | Weight | Formula |
|-----------|--------|---------|
| roi_coverage | 20 | `(count(products with ROI > 1.0) / count(non-retired products with ROI != null)) * 20` |
| action_rate | 20 | `(count(retirement decisions with status approved OR rejected) / count(retirement decisions)) * 20` |
| savings_accuracy | 15 | `(1.0 - ABS(1.0 - avg_variance_from_projection)) * 15` |
| capital_freed_ratio | 15 | `MIN(1.0, (capital_freed_annual / portfolio_annual_spend) / 0.10) * 15` |
| value_governance | 15 | `(count(products with non-expired value declaration) / count(non-retired products)) * 15` |
| ai_exposure | 15 | `(SUM(cost for well-governed products) / portfolio_monthly_spend) * 15` |

- **Well-governed**: ROI > 1.0 AND trustScore >= 0.7

### 1.10 Automation Coverage

```
automation_coverage = fully_automated_fields / total_tracked_fields
```

- **Surfaces**: Connector Depth, Setup

### 1.11 Savings Summary

```
total_capital_freed_monthly  = SUM(amount) for ALL capital_events
pending_retirements          = COUNT(decisions WHERE type='retirement' AND status='under_review')
pending_estimated_savings    = SUM(estimated_impact) for pending retirement decisions
approved_retirements         = COUNT(decisions WHERE type='retirement' AND status='approved')
decisions_this_quarter       = COUNT(decisions WHERE created_at >= quarter_start)
```

### 1.12 Board Capital Summary

```
# Board shows the SAME totals as Capital Impact — scoped to ALL events
total_capital_freed          = capital_freed_monthly (same as 1.6)
total_capital_freed_annual   = capital_freed_annual (same as 1.6)
confirmed_savings            = SUM(amount) for events WHERE validation_status = 'confirmed'
projected_savings            = SUM(amount) for events WHERE validation_status IN ('validating','pending')
portfolio_roi_current        = portfolio_avg_roi (same as 1.5)
capital_efficiency_score     = CEI score (same as 1.9)
```

---

## 2. Reconciliation Rules

### R1: Portfolio Cost = Sum of Product Costs
```
portfolio_summary.totalCost === SUM(dataProducts[i].monthlyCost)
Tolerance: 0%
```

### R2: Product Cost = Sum of Cost Breakdown
```
FOR EACH product:
  product.monthlyCost === SUM(product.costBreakdown.*)
  Tolerance: 0%
```

### R3: Portfolio ROI = Weighted ROI
```
portfolio_summary.averageROI === canonical_portfolio_roi(dataProducts)
Tolerance: ±0.01
```

### R4: Capital Freed = Sum of Capital Events
```
capital_impact.totalCapitalFreed === SUM(capital_events.amount)
savings_summary.totalCapitalFreedMonthly === SUM(capital_events.amount)
board_summary.totalCapitalFreed === SUM(capital_events.amount)
Tolerance: 0%
```

### R5: ROI Shown Everywhere Matches
```
portfolio_summary.averageROI
  === capital_impact.portfolioRoiCurrent
  === board_summary.portfolioRoiCurrent
  === portfolio_rebalance.currentBlendedRoi
  === capital_projection.currentSnapshot.averageRoi
Tolerance: ±0.01
```

### R6: CEI Score Matches
```
capital_efficiency.score
  === board_summary.capitalEfficiencyScore
  === capital_projection.currentSnapshot.ceiScore
Tolerance: ±0.1
```

### R7: Total Products Matches
```
portfolio_summary.totalProducts
  === dataProducts.length
  === portfolio_rebalance.totalProducts (non-retired only)
Tolerance: 0
```

### R8: Consumer Total Matches
```
portfolio_summary.totalConsumers === SUM(dataProducts[i].monthlyConsumers)
Tolerance: 0
```

### R9: Decision Capital Events Reference Valid Products
```
FOR EACH capital_event:
  event.productId must exist in dataProducts[] OR be a known legacy product
  event.decisionId must exist in decisions[]
  event.amount === corresponding decision.capitalFreed
```

### R10: Time Series Alignment
```
portfolio_cost_trend months === portfolio_roi_history months
capital_freed_by_month entries sum === total_capital_freed
```

---

## 3. Known Gaps

All gaps from the pre-sprint baseline have been resolved. Seed data now derives
all summary values from the canonical metrics layer (`canonical.ts`).

### Resolved (Sprint 1)

| Gap ID | Resolution |
|--------|-----------|
| G-001 | `portfolioSummary.averageROI` now computed via `computePortfolioSummary()` (cost-weighted) |
| G-002 | `boardCapitalSummary` now computed via `computeBoardSummary()` — same total as capitalImpact |
| G-003 | `portfolioRebalance` now computed via `computePortfolioRebalance()` — uses eligible products |
| G-004 | Same as G-003 — totalProducts now matches eligible products with cost > 0 and non-null ROI |
| G-005 | `portfolioSummary.totalConsumers` now summed from product consumers via canonical |
| G-006 | All ROI surfaces now use the same `computePortfolioROI()` formula |
| G-007 | Capital projection base values are narrative (36-month forward simulation) — documented separately |
| G-008 | Capital projection ROI is forward-modeled, not identical to current snapshot — acceptable |
| G-009 | CEI `ai_exposure` now uses canonical `computePortfolioMonthlySpend()` ($171,400) |
| G-010 | CEI `capital_freed_ratio` now uses canonical annual spend ($2,056,800) |
| G-011 | Capital event ce-004 now correctly references `dp-legacy-1` |
| G-012 | `portfolioSummary.productsWithValue` now uses `countProductsWithValue()` (excludes null/0) |
| G-013 | `portfolioSummary.costCoverage` now uses `computeCostCoverage()` (cost-weighted) |
| G-014 | Rebalance quartiles now computed via canonical sort — correct ROI ordering |

### Remaining

| Gap ID | Description | Severity |
|--------|-------------|----------|
| G-007 | `capitalProjection.currentSnapshot.totalCost` ($9.5M) is a forward-model base, not derived from current portfolio monthly cost | LOW (by design) |
| G-008 | `capitalProjection.currentSnapshot.averageRoi` (2.7) differs from current portfolio ROI — expected for 36-month forward model | LOW (by design) |

---

## 4. Provenance Requirements

Every metric displayed must carry:

```typescript
interface MetricProvenance {
  /** The canonical formula used */
  formula: string;
  /** Source systems that contribute data */
  sources: Array<{
    platform: string;       // 'snowflake' | 'databricks' | 's3' | 'power_bi' | 'manual'
    extractionMethod: string; // 'automated' | 'inferred' | 'manual'
    lastSync: string;       // ISO timestamp
    confidence: number;     // 0-1
  }>;
  /** When this metric was last computed */
  computedAt: string;
  /** Whether a manual override is in effect */
  isOverridden: boolean;
}
```

---

## 5. Implementation

The canonical metrics layer lives in:
```
apps/web/src/lib/metrics/canonical.ts
```

All seed data generators, UI components, and API endpoints must use this layer
for derived values. No page-local calculations of portfolio-level metrics.

Reconciliation tests live in:
```
apps/web/src/lib/metrics/__tests__/reconciliation.test.ts
```
