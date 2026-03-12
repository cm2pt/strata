# Economic Model Reference

All formulas, weights, constants, and assumptions used across the Strata Capital Intelligence Engine.

**Source of truth:** `apps/web/src/lib/engine/` + `apps/web/src/lib/metrics/canonical.ts`

---

## 1. Composite Value

**File:** `canonical.ts`

```
compositeValue = 0.7 × declaredValue + 0.3 × usageImpliedValue
```

When `declaredValue` is null or zero:

```
compositeValue = 0.3 × usageImpliedValue
```

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `VALUE_WEIGHTS.declared` | 0.70 | Owner declarations carry primary weight |
| `VALUE_WEIGHTS.usage` | 0.30 | Usage-implied value provides market-based correction |

---

## 2. Product ROI

**File:** `canonical.ts`

```
ROI = compositeValue / monthlyCost
```

Returns `null` when `monthlyCost <= 0`.

### ROI Classification Bands

| Band | Threshold | Interpretation |
|------|-----------|----------------|
| `high` | ROI ≥ 3.0 | High-value, efficient |
| `healthy` | ROI ≥ 1.5 | Justified spend |
| `underperforming` | ROI ≥ 0.5 | Needs investigation |
| `critical` | ROI < 0.5 | Capital at risk |
| `null` | ROI is null | No cost data |

---

## 3. Economic Signal Score (ESE)

**File:** `economic-signals.ts`

### Category Weights

| Category | Weight | Description |
|----------|--------|-------------|
| Cost | 0.25 | Infrastructure efficiency |
| Usage | 0.30 | Consumer adoption and engagement |
| Structural | 0.15 | Network position and blast radius |
| Decision | 0.10 | Governance linkage |
| Stability | 0.20 | Lifecycle health and freshness |

Total: 1.00

### Normalization

Min-max normalization across the full portfolio:

```
normalized = (value - min) / (max - min) × 100
```

For inverse signals: `normalized = 100 - minMaxNorm(value)`

Edge case: when `max === min`, score defaults to 50.

### Cost Sub-Signals

| Signal | Weight | Direction | Source |
|--------|--------|-----------|--------|
| Infrastructure cost | 0.10 | Inverse | `monthlyCost` |
| Storage ratio | 0.15 | Inverse | `costBreakdown.storage / monthlyCost` |
| Compute volatility | 0.30 | Inverse | `|costTrend|` |
| Cost growth velocity | 0.25 | Inverse | `costTrend` |
| Domain concentration | 0.20 | Inverse | `monthlyCost / domainTotalCost` |

### Usage Sub-Signals

| Signal | Weight | Direction | Source |
|--------|--------|-----------|--------|
| Unique consumers | 0.25 | Direct | `monthlyConsumers` |
| Executive weight | 0.20 | Direct | Executive team consumers / total consumers |
| Cross-domain density | 0.15 | Direct | `min(1, teamCount / 5)` |
| Usage trend | 0.20 | Direct | `usageTrend` |
| Centrality | 0.15 | Direct | downstream products + models + dashboards |
| Dashboard count | 0.05 | Direct | `downstreamDashboards` |

### Structural Sub-Signals

| Signal | Weight | Direction | Source |
|--------|--------|-----------|--------|
| Downstream reach | 0.40 | Direct | products + models + dashboards |
| Blast radius | 0.40 | Direct | consumers × downstream products |
| Upstream count | 0.20 | Direct | 1 (connector-based) |

### Decision Sub-Signals

| Signal | Weight | Direction | Source |
|--------|--------|-----------|--------|
| Linked decisions | 0.30 | Direct | Decisions referencing product |
| Capital events | 0.40 | Direct | Events with product ID |
| Resolution time | 0.30 | Inverse | Avg days to resolve |

### Stability Sub-Signals

| Signal | Weight | Direction | Source |
|--------|--------|-----------|--------|
| Lifecycle score | 0.40 | Direct | Ordinal: draft=1, active=3, growth=4, mature=5, decline=2, retired=0 |
| Freshness | 0.35 | Direct | `max(0, min(1, 1 - (freshnessHours/freshnessSLA - 1)))` |
| Churn volatility | 0.25 | Inverse | `|usageTrend|` |

### Final Score

```
ESE = cost × 0.25 + usage × 0.30 + structural × 0.15 + decision × 0.10 + stability × 0.20
```

Clamped to [0, 100], rounded to 2 decimal places.

### Economic Efficiency Ratio

```
normalizedCost = monthlyCost / max(allMonthlyCosts)
ratio = economicSignalScore / (normalizedCost × 100)
```

When `normalizedCost < 0.01`: ratio equals the raw signal score.

---

## 4. Capital Pressure Index (CPI)

**File:** `opportunity-cost.ts`

```
CPI = (w₁ × misallocated/total + w₂ × latency/total + w₃ × undeclared/total + w₄ × decline/total) × 100
```

| Component | Weight | Definition |
|-----------|--------|------------|
| Misallocated capital | 0.30 | Sum of monthlyCost where ESE < 35 |
| Decision latency | 0.25 | Sum of `monthlyCost × daysPending / 30` |
| Undeclared spend | 0.25 | Sum of monthlyCost where declaredValue is null/0 |
| Decline spend | 0.20 | Sum of monthlyCost where lifecycleStage = "decline" |

`total` = sum of all active (non-retired) product monthlyCost.

CPI is clamped to [0, 100].

### Configurable Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `misallocationThreshold` | 35 | ESE score below which capital is misallocated |
| `projectionMonths` | 6 | Months for compounding projection |

### Decision Latency Cost

Only counts decisions with `status === "under_review"` or `status === "delayed"`:

```
latencyCost = Σ(monthlyCost × daysPending / 30)
```

### 6-Month Compounding Loss

Bottom quartile cost projected forward using average cost growth velocity:

```
loss = Σ(m=0 to 5) bottomQuartileCost × (1 + avgGrowthRate)^m
```

where `avgGrowthRate = max(0, avgCostTrend / 100)`.

---

## 5. Pareto Frontier

**File:** `frontier.ts`

### Dominance Definition

Product A dominates product B iff:
- `A.score ≥ B.score` AND `A.cost ≤ B.cost`
- AND at least one is strictly better (`>` or `<`)

A product is on the frontier iff no other product dominates it.

### Inefficiency Gap

Euclidean distance in normalized space:

```
normalizedScoreDiff = (frontierScore - productScore) / 100
normalizedCostDiff = (productCost - frontierCost) / max(productCost, frontierCost, 1)
distance = sqrt(normalizedScoreDiff² + normalizedCostDiff²)
```

Only frontier points within 10 score points below the product are considered as nearest (prevents matching to a much lower-scoring frontier point).

### Portfolio Efficiency Score

```
frontierEfficiencyRatio = avg(score / cost) across frontier products
theoreticalTotalScore = totalCost × frontierEfficiencyRatio
portfolioEfficiency = (actualTotalScore / theoreticalTotalScore) × 100
```

Clamped to [0, 100].

### Reallocation Potential

```
reallocationPotential = Σ(costReductionToFrontier) for all non-frontier products
```

---

## 6. Value Attribution

**File:** `value-attribution.ts`

### Direct Attribution (60%)

When an event has a direct product link:

```
directAmount = eventAmount × 0.60
```

### Indirect Attribution (40%)

Remaining 40% distributed across same-domain products:

```
usageComponent = usageScore × 0.25
structuralComponent = structuralScore × 0.15
weight_i = usageComponent_i + structuralComponent_i
amount_i = indirectPool × (weight_i / totalWeight)
```

If no same-domain products exist, the direct product absorbs all 100%.

### Unlinked Events

Events with no product link distributed across ALL active products by ESE score:

```
weight_i = economicSignalScore_i / Σ(economicSignalScore)
amount_i = eventAmount × weight_i
```

### Impact Accuracy

For products with resolved decisions:

```
expectedVsRealizedRatio = Σ(actualImpact) / Σ(estimatedImpact)
impactAccuracyScore = max(0, min(1, 1 - |1 - ratio|))
```

Default: 0.50 when no resolved decisions exist.

---

## 7. Value Inference

**File:** `value-inference.ts`

### Signal Weights

| Signal | Weight | Source |
|--------|--------|--------|
| Executive usage | 0.20 | ESE executive consumer weight |
| Cross-domain integration | 0.15 | ESE cross-domain density |
| Dependency centrality | 0.20 | ESE dependency centrality |
| Decision linkage | 0.10 | Count of linked decisions |
| Consumer scale | 0.15 | Monthly consumer count |
| Stability | 0.10 | ESE stability score |
| Cost as proxy | 0.10 | Monthly cost |

### Value Curve

```
base  = $10,000/year
max   = $6,000,000/year
range = max - base = $5,990,000

low  = base + range × (composite/100) × 0.20
mid  = base + range × (composite/100) × 0.50
high = base + range × (composite/100) × 1.00
```

### Confidence

```
base            = 0.30
signalDiversity = (nonZeroSignals / totalSignals) × 0.30
manualBoost     = 0.15 (if declaredValue exists and > 0)
confidence      = min(0.95, base + signalDiversity + manualBoost)
```

A signal is "non-zero" if its normalized score > 10.

### Blended Monthly Value

With manual declaration:
```
blended = inferredMonthly × (1 - confidence × 0.3) + declaredMonthly × (confidence × 0.3)
```

Without:
```
blended = inferredMonthly
```

### Mismatch Detection

Flagged when `declaredValue / (inferredAnnualMid / 12)` exceeds 1.5 or falls below 0.5.

---

## 8. Learning Loop

**File:** `learning-loop.ts`

### Projection Accuracy

```
accuracyRatio = actualImpact / estimatedImpact
absoluteError = |1 - accuracyRatio|
portfolioAccuracy = max(0, min(1, 1 - avg(absoluteError)))
```

Default: 0.50 when no resolved decisions with impact data exist.

### Domain Trajectory

```
if growthCount > declineCount + 0.5 × matureCount → "improving"
if declineCount > growthCount                     → "declining"
else                                               → "stable"
```

### Owner Value Inflation

Flagged when:
- Average accuracy ratio < 0.70 (over-estimates by 30%+)
- At least 2 resolved decisions with impact data

### Value Inflation Severity

```
ratio = declaredValue / (inferredMid / 12)
severity = ratio > 3 ? "high" : ratio > 2 ? "medium" : "low"
```

### Weight Adjustment Triggers

| Condition | Suggestion |
|-----------|------------|
| Portfolio accuracy < 60% with 3+ decisions | Reduce decision weight 0.10 → 0.05 |
| > 30% products have cost volatility > 15% | Increase cost weight 0.25 → 0.30 |

### Confidence Reduction

For products owned by flagged value inflators:
```
adjustedConfidence = currentConfidence × 0.80
```

---

## Assumptions and Limitations

1. **Executive detection** uses keyword matching on team names (`"cfo"`, `"vp "`, `"chief"`, etc.). No IAM integration.

2. **Cross-domain density** approximated by team count / 5. True cross-domain would require team-to-domain mapping.

3. **Upstream system count** is always 1 per product. Expandable when lineage provides multi-source tracing.

4. **Decision latency** uses `Date.now()` for elapsed time, making it non-deterministic across runs (intentional — latency is a real-time metric).

5. **Value curve constants** ($10K base, $6M max) are enterprise-calibrated estimates. Adjustable per deployment.

6. **Freshness SLA compliance** formula: `max(0, min(1, 1 - (freshnessHours/freshnessSLA - 1)))`. A product exactly at SLA scores 1.0; double the SLA scores 0.0.

7. **Portfolio-relative scoring** means absolute score comparisons across different portfolio snapshots are not meaningful. A score of 60 in a 50-product portfolio means something different than 60 in a 200-product portfolio.

8. **Retired products** are excluded from all engines except ESE (which scores them for historical reference but downstream engines filter them out).
