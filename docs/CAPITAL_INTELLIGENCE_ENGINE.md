# Capital Intelligence Engine (CIE)

Architecture reference for Strata's economic analysis layer.

**Source:** `apps/web/src/lib/engine/`
**Tests:** `apps/web/src/lib/engine/__tests__/engine-reconciliation.test.ts`
**API hooks:** `apps/web/src/lib/api/hooks.ts`

---

## Engine Overview

The CIE computes portfolio-level economic intelligence from raw data product metadata. It takes three inputs — products, decisions, and capital events — and produces six analysis surfaces that interconnect through shared signal scores.

```
DataProducts + Decisions + CapitalEvents
         │
         ▼
┌─────────────────────────┐
│  E1: Economic Signals   │  ← Per-product score (0-100)
│      (ESE)              │
└──────────┬──────────────┘
           │ signalResults
     ┌─────┼──────┬──────────┬──────────┐
     ▼     ▼      ▼          ▼          ▼
   ┌────┐┌────┐┌──────┐┌──────────┐┌──────────┐
   │ E2 ││ E3 ││  E4  ││    E5    ││    E6    │
   │OppC││Fron││ValAt ││ ValInfer ││ Learning │
   │ost ││tier││trib  ││  ence   ││   Loop   │
   └────┘└────┘└──────┘└──────────┘└──────────┘
```

All engines are **deterministic** (same inputs produce same outputs) and **stateless** (no caching, no side effects). Scores are **portfolio-relative** — adding or removing products shifts all scores because normalization bounds change.

---

## E1: Economic Signal Engine (ESE)

**File:** `economic-signals.ts`
**Export:** `computeEconomicSignals(products, decisions, capitalEvents) → EconomicSignalResult[]`

Computes a composite economic signal score (0-100) per product by aggregating five signal categories:

| Category | Weight | Direction | What it measures |
|----------|--------|-----------|------------------|
| Cost | 0.25 | Inverse (lower cost = better) | Infrastructure cost, volatility, growth velocity, concentration |
| Usage | 0.30 | Direct (higher = better) | Consumers, executive weight, cross-domain density, trend, centrality |
| Structural | 0.15 | Direct | Downstream reach, blast radius, upstream system count |
| Decision | 0.10 | Mixed | Linked decisions, capital events, resolution time (inverse) |
| Stability | 0.20 | Mixed | Lifecycle stage, freshness SLA, churn volatility (inverse) |

### Normalization

All raw signals are normalized to 0-100 using **min-max normalization** across the portfolio:

```
score = (value - min) / (max - min) × 100
```

For inverse signals (where lower is better): `score = 100 - minMaxNorm(value)`

When all values are equal (`max === min`), the score defaults to 50.

### Sub-signals

**Cost (5 sub-signals):**
- `infraCostMonthly` — raw monthly cost (inverse, weight 0.10)
- `storageCostRatio` — storage / total cost (inverse, weight 0.15)
- `computeVolatility` — |costTrend| (inverse, weight 0.30)
- `costGrowthVelocity` — costTrend (inverse, weight 0.25)
- `costConcentrationInDomain` — product cost / domain total (inverse, weight 0.20)

**Usage (6 sub-signals):**
- `uniqueConsumers` — monthlyConsumers (weight 0.25)
- `executiveConsumerWeight` — fraction of consumers in executive teams (weight 0.20)
- `crossDomainDensity` — team count / 5, capped at 1.0 (weight 0.15)
- `usageFrequencyTrend` — usageTrend % (weight 0.20)
- `dependencyCentrality` — downstream products + models + dashboards (weight 0.15)
- `downstreamDashboardCount` — dashboard count (weight 0.05)

**Structural (3 sub-signals):**
- `downstreamReach` — total downstream count (weight 0.40)
- `blastRadiusEstimate` — consumers × downstream products (weight 0.40)
- `upstreamSystemCount` — 1 per product (weight 0.20)

**Decision (3 sub-signals):**
- `linkedDecisionsCount` — decisions referencing this product (weight 0.30)
- `capitalEventsInfluenced` — events with this product ID (weight 0.40)
- `timeToDecisionDays` — avg resolution days, inverse (weight 0.30)

**Stability (3 sub-signals):**
- `lifecycleStageScore` — ordinal: draft=1, active=3, growth=4, mature=5, decline=2, retired=0 (weight 0.40)
- `freshnessScore` — 0-1 SLA compliance (weight 0.35)
- `churnVolatility` — |usageTrend|, inverse (weight 0.25)

### Economic Efficiency Ratio

```
economicEfficiencyRatio = economicSignalScore / (normalizedCost × 100)
```

where `normalizedCost = monthlyCost / maxCost` across the portfolio. Products with near-zero cost use the raw signal score.

### Portfolio Summary

`computePortfolioSignalSummary()` returns: average, median, Q1/Q3 thresholds, highest/lowest product and score.

---

## E2: Opportunity Cost Model

**File:** `opportunity-cost.ts`
**Export:** `computeOpportunityCost(products, decisions, signalResults) → OpportunityCostResult`

Quantifies the cost of inaction and capital misallocation.

### Capital Misallocated

Sum of monthly costs for products with `economicSignalScore < 35` (configurable threshold).

### Bottom Quartile Locked Capital

Monthly cost locked in the bottom 25% of products by ESE score.

### Decision Latency Cost

For each pending decision (`status === "under_review" || status === "delayed"`):

```
latencyCost += productMonthlyCost × (daysPending / 30)
```

Each month of delay costs the full monthly spend.

### Capital Pressure Index (CPI)

Composite 0-100 score:

```
CPI = (0.30 × misallocated/total + 0.25 × latency/total + 0.25 × undeclared/total + 0.20 × decline/total) × 100
```

| Component | Weight | Source |
|-----------|--------|--------|
| Misallocated capital | 0.30 | Products below ESE threshold |
| Decision latency | 0.25 | Cost × time from unresolved decisions |
| Undeclared spend | 0.25 | Products with null/zero declared value |
| Decline stage spend | 0.20 | Products in decline lifecycle |

### Per-Product Breakdown

Each product gets: `isMisallocated`, `isBottomQuartile`, `latencyCostContribution`, `scoreGap` (distance to median), `estimatedMonthlyWaste` (gap × cost).

---

## E3: Portfolio Frontier (Pareto Analysis)

**File:** `frontier.ts`
**Export:** `computePortfolioFrontier(products, signalResults) → FrontierResult`

Computes the Pareto frontier on the `economicSignalScore × monthlyCost` plane.

### Pareto Frontier Definition

A product is on the frontier if **no other product** has both:
- Higher economic signal score AND
- Lower monthly cost

Products on the frontier represent the most efficient capital deployment — they deliver the most economic signal per dollar spent.

### Dominance Check

Product A dominates product B if:
- `A.score >= B.score` AND `A.cost <= B.cost`
- AND at least one dimension is strictly better

### Per-Product Metrics

- `isOnFrontier` — boolean
- `inefficiencyGap` — Euclidean distance to nearest frontier point (normalized)
- `costReductionToFrontier` — dollars needed to reduce cost to frontier efficiency
- `nearestFrontierProductId` — the frontier point this product should aspire to

### Portfolio-Level Metrics

- `reallocationPotential` — sum of all cost reductions needed
- `portfolioEfficiencyScore` — 0-100, ratio of actual total score to theoretical frontier-efficient total
- `portfolioOptimizationPotential` — theoretical score gain if all products matched frontier efficiency

---

## E4: Value Attribution Engine

**File:** `value-attribution.ts`
**Export:** `computeValueAttribution(products, decisions, capitalEvents, signalResults) → AttributionResult`

Traces capital event impact back to upstream products.

### Attribution Logic

**When event has a direct product link (60/40 split):**
1. **60%** goes directly to the linked product
2. **40%** is distributed across same-domain products weighted by:
   - Usage score × 0.25 (usage weight)
   - Structural score × 0.15 (structural weight)
3. If no same-domain products exist, the direct product absorbs all 100%

**When event has no product link:**
- Distributed across ALL active products proportional to their ESE score

### Per-Product Outputs

- `validatedCapitalImpact` — total attributed capital (monthly)
- `eventsAttributed` — count of events that contributed
- `expectedVsRealizedRatio` — actual / estimated impact for resolved decisions
- `impactAccuracyScore` — `1 - |1 - expectedVsRealizedRatio|` clamped to [0, 1]
- `eventBreakdown[]` — per-event detail with weight, amount, method

### Portfolio-Level Outputs

- `totalAttributed` — sum of all attribution
- `totalCapitalEvents` — sum of all event amounts
- `attributionCoverage` — `totalAttributed / totalCapitalEvents` (0-1)

---

## E5: Value Inference Engine

**File:** `value-inference.ts`
**Export:** `computeValueInference(products, decisions, signalResults) → ValueInferenceResult`

Estimates product value from observable signals, independent of manual declarations.

### Inference Signals

| Signal | Weight | Source |
|--------|--------|--------|
| Executive usage | 0.20 | Fraction of consumers in executive teams |
| Cross-domain integration | 0.15 | Team diversity (teams / 5, capped at 1) |
| Dependency centrality | 0.20 | Downstream products + models + dashboards |
| Decision linkage | 0.10 | Count of linked decisions |
| Consumer scale | 0.15 | Monthly consumer count |
| Stability | 0.10 | ESE stability sub-score |
| Cost as proxy | 0.10 | Monthly cost (higher cost = higher inferred value) |

### Value Curve

Composite score (0-100) maps to annual value bands:

```
base = $10,000 (minimum annual value)
max  = $6,000,000 (maximum annual value)
range = max - base

low  = base + range × scoreRatio × 0.20
mid  = base + range × scoreRatio × 0.50
high = base + range × scoreRatio × 1.00
```

A product scoring 80/100 would get: low ~$966K, mid ~$2.4M, high ~$4.8M/year.

### Confidence Score

```
confidence = BASE(0.30) + signalDiversity(0-0.30) + manualDeclarationBoost(0.15)
```

- `signalDiversity` = fraction of signals with normalized score > 10, scaled by 0.30
- Manual declaration adds 0.15 confidence boost
- Maximum confidence: 0.95

### Blended Monthly Value

When a manual declaration exists:
```
blended = inferredMonthly × (1 - confidence × 0.3) + declaredMonthly × (confidence × 0.3)
```

Without declaration: `blended = inferredMonthly`

### Value Mismatches

Products where `declaredValue / inferredMid > 1.5` or `< 0.5` are flagged. `inflationRatio > 1` means declared exceeds inferred (possible inflation).

---

## E6: Learning Loop

**File:** `learning-loop.ts`
**Export:** `computeLearningLoop(products, decisions, signalResults, inferredValues?) → LearningLoopResult`

Tracks system accuracy and suggests improvements.

### 1. Projection Accuracy

For each resolved decision with both `estimatedImpact` and `actualImpact`:
```
accuracyRatio = actual / estimated   (1.0 = perfect)
absoluteError = |1 - accuracyRatio|  (0 = perfect)
```

Portfolio accuracy: `1 - average(absoluteError)` across all resolved decisions.

### 2. Domain Efficiency Trends

Per-domain: product count, average ESE score, total cost, average ROI.

Trajectory classification:
- **Improving:** growth-stage products outnumber decline + half of mature
- **Declining:** decline-stage products outnumber growth-stage
- **Stable:** everything else

### 3. Owner Accuracy

Per product owner: average accuracy ratio across resolved decisions. Flagged as `isValueInflator` if average accuracy < 0.70 with 2+ samples (consistently over-estimates by 30%+).

### 4. Value Inflation Detection

When `inferredValues` map is provided, flags products where `declaredValue / inferredMid > 1.5`:
- Severity: `> 3x = high`, `> 2x = medium`, `> 1.5x = low`

### 5. Weight Adjustment Suggestions

- If portfolio accuracy < 60%: suggest reducing decision weight (0.10 → 0.05)
- If > 30% of products have high cost volatility: suggest increasing cost weight (0.25 → 0.30)

### 6. Confidence Adjustments

For owners flagged as value inflators, reduce confidence by 20% on their products.

---

## API Hooks

**File:** `apps/web/src/lib/api/hooks.ts`

| Hook | Returns |
|------|---------|
| `useEconomicSignals()` | ESE results + portfolio summary |
| `useOpportunityCost()` | Opportunity cost + CPI |
| `usePortfolioFrontier()` | Frontier analysis |
| `useValueAttribution()` | Capital event attribution |
| `usePortfolioOptimization()` | Combined: signals + opportunity cost + frontier |

All hooks use dynamic imports (`import("@/lib/engine")`) and compute results from the canonical seed data arrays: `dataProducts`, `decisions`, `capitalEvents`.

---

## Reconciliation Tests

**File:** `engine-reconciliation.test.ts` — 33 tests across 7 groups

| Group | Tests | What it validates |
|-------|-------|-------------------|
| E1 | 5 | Score ranges 0-100, determinism, summary consistency, efficiency > 0 |
| E2 | 6 | CPI 0-100, misallocated ≤ total, undeclared/decline spend matches source |
| E3 | 6 | Frontier gap=0 for frontier products, no domination, efficiency 0-100 |
| E4 | 4 | Coverage 0-1, attributed ≤ events, per-product count, accuracy 0-1 |
| E5 | 5 | Confidence 0-1, value bands ordered, blended ≥ 0, mismatch ratios valid |
| E6 | 5 | Accuracy 0-1, domain coverage, counts sum, valid decision refs, severity |
| E7 | 2 | ESE scores consistent across frontier, product counts match across engines |

---

## Design Principles

1. **No hardcoded scores.** Every metric is computed from source data fields.
2. **Portfolio-relative normalization.** Min-max across the current set means scores shift as the portfolio changes. This is intentional — economic position is relative.
3. **Configurable weights.** All weight constants are exported and modifiable. The Learning Loop suggests adjustments.
4. **Deterministic.** Same inputs always produce same outputs. No randomness, no Date.now() in scoring (only in latency cost, which uses current time intentionally).
5. **Active-only.** All engines filter to `lifecycleStage !== "retired"` except ESE (which scores all products, including retired, for historical reference).
