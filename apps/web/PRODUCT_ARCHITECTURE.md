# Strata — Product Architecture Document

> Living document for product discussion. Feed into ChatGPT or any LLM for strategic context.
> Location: `apps/web/PRODUCT_ARCHITECTURE.md`
> Last updated: 2026-02-23

---

## What We're Building

**Strata** is the financial operating system for enterprise data portfolios.

Not a dashboard. Not a catalog. A **decision-driving system** that makes data capital economics visible, actionable, and institutional.

### Positioning
- **Category:** Data Capital Management
- **Buyer:** CFO / CDO / VP Data
- **Wedge:** "You're spending $2M/year on data infrastructure. Do you know which products are worth it?"
- **Moat:** Decision history + benchmarking network effects
- **Target:** $1B+ company

### Core Thesis
Every enterprise has 10-100+ data products. Nobody knows which ones are worth their cost. Strata makes this visible, turns visibility into decisions, and turns decisions into institutional memory that creates switching costs.

---

## What's Built (Phase 1-4: Complete)

### Foundation Layer (Phase 1-2)
- **13 realistic data products** across 6 domains (Customer Analytics, Finance, Operations, Product, Marketing, Risk)
- **Full financial model** per product: cost breakdown (compute/storage/pipeline/human), declared value, usage-implied value, composite value (70/30 weighted), ROI
- **Lifecycle tracking:** draft → active → growth → mature → decline → retired
- **Quality metrics:** freshness, completeness, accuracy, trust score
- **Platform connectors:** Snowflake + Databricks with coverage tracking

### Design System (Phase 3)
- Token-based design system (`tokens.ts`) — cards, colors, typography, spacing
- 8+ reusable components: PageShell, Card, SectionHeader, KPICard, InsightCallout, EmptyState, LifecyclePill, ConfidenceIndicator, DecisionStatusBadge
- Consistent Inter + JetBrains Mono typography
- Print-optimized Board View with `@media print` styles

### System Layer (Phase 4)

#### Executive Intelligence ✅
On Portfolio page:
- **AI-generated Executive Summary**: 3 insights + 1 risk + 1 opportunity in plain English
- **Confidence indicator**: Based on cost coverage % + value declaration coverage %
- **"If you do nothing" projection**: 6-month scenario showing projected cost, ROI decline, wasted spend, value at risk
- **Financial impact** on every insight ($ amounts, not just text)

**Why it matters:** This is what makes a CFO check the system every Monday. It's not a dashboard — it's an advisor.

#### Decision Workflow System ✅
For every retirement candidate, cost spike, value expiration, and low-ROI asset:
- Structured Review Flow with assigned owner
- Impact estimate ($ savings or cost)
- Status tracking: Under Review → Approved / Rejected
- Resolution notes and actual impact logging

**Economic Decision Log page** (`/decisions`) — chronological record of all portfolio decisions:
- 8 seed decisions showing real decision patterns
- Financial impact tracking (estimated vs actual)
- Decision types: retirement, cost investigation, value revalidation, low ROI review
- Dual-axis filtering (by status + by type)
- Creates: audit trail, board dependency, institutional memory

**Why it matters:** Decisions move from Slack/email into the system. Once they're here, the system becomes the source of truth for data capital governance.

#### Capital Allocation View ✅
New `/allocation` screen:
- Cost by domain/team (donut chart with legend table)
- Value by domain/team (donut chart with legend table)
- ROI by domain/team (horizontal bar chart, color-coded: green ≥2x, blue ≥1x, red <1x)
- % of spend in Decline stage
- % of spend with no declared value
- **Reallocation simulator**: "What if we move 10% from lowest ROI quartile to highest?"
- Shows projected portfolio ROI impact with methodology explanation

**Why it matters:** This begins capital allocation thinking. The CFO starts asking "where should we invest in data?" — and the answer lives in the system.

#### Benchmarking Architecture ✅
Industry Benchmarks (Beta) embedded in Capital Allocation page:
- Median ROI by industry (Retail, Finance, SaaS, Healthcare)
- Typical cost per consumer range
- Median portfolio ROI
- Percentile ranges (P25, P75)
- Sample sizes for credibility

**Architecture ready for future cross-company anonymized benchmarking.** This is the long-term moat — once 50+ companies contribute anonymous data, the benchmarks become proprietary and irreplaceable.

**Why it matters:** "Your portfolio ROI is 2.8x vs. industry median of 2.2x" is a sentence that gets shown to boards.

#### Expanded Board Mode ✅
5 clean, numbered slides at `/portfolio/board-view`:
1. **Portfolio Summary** — 6 KPIs + key AI insight
2. **ROI Trend** — Cost vs Value chart + monthly ROI progression table + trend callout
3. **Risk Exposure** — Value at Risk, Wasted Spend projection, Cost Spikes; expiring declarations list; risk insight
4. **Retirement Savings** — Completed retirements (actual savings) + Pending reviews (estimated savings)
5. **Capital Allocation Summary** — Domain allocation table with cost/% of total/value/ROI; opportunity insight

Printable. Elegant. Confidence % in header. If this works, the product becomes embedded in quarterly board reporting.

#### Pricing Strategy Tool ✅
Upgraded from calculator to strategy tool at `/simulate`:
- **Adoption impact estimate slider** (0-40% range — price ↑ → usage ↓)
- **Revenue neutrality target toggle** (adjusts charges to exactly match product cost)
- **Behavioral risk indicator** (color-coded: high/moderate/low with contextual advice)
- **Draft pricing policy export** button
- Three model types: per-query, per-consumer, flat-fee

**Why it matters:** Pricing simulation becomes pricing strategy. When a CDO exports a "Draft Internal Pricing Policy" and brings it to a governance meeting, the system is embedded in the organization.

#### Switching Cost Infrastructure ✅
Already in the data model and seed data:
- **ROI history**: Monthly snapshots per product and portfolio-level, never overwritten (6 months of history)
- **Value declaration versioning**: Full version history with change notes, declared-by attribution
- **Decision log persistence**: Chronological institutional memory
- **Policy configuration**: 7 organizational policies across 4 categories (valuation weights, thresholds, review cycles)

**Why it matters:** Once policies and decisions live here, switching becomes painful. This is the behavioral lock-in layer.

---

### All Screens

| Screen | Route | Purpose | Status |
|--------|-------|---------|--------|
| **Portfolio** | `/portfolio` | Executive dashboard with KPIs, BCG matrix, cost/value trend, Executive Intelligence | ✅ Complete |
| **Assets** | `/assets` | Searchable/filterable table of all 13 products | ✅ Complete |
| **Asset Detail** | `/assets/[id]` | Deep-dive per product (economics, consumers, quality, lifecycle) | ✅ Complete |
| **Lifecycle** | `/lifecycle` | Health monitoring, retirement candidates, cost spikes, stalled drafts | ✅ Complete |
| **Marketplace** | `/marketplace` | Browse/subscribe to published data products | ✅ Complete |
| **Pricing Strategy** | `/simulate` | Pricing/chargeback modeling with adoption impact + behavioral risk | ✅ Complete |
| **Decisions** | `/decisions` | Economic Decision Log — chronological audit trail | ✅ Complete |
| **Allocation** | `/allocation` | Capital allocation with reallocation simulator + benchmarks | ✅ Complete |
| **Setup** | `/setup` | Platform connectors, teams, ROI configuration | ✅ Complete |
| **Board View** | `/portfolio/board-view` | 5-slide print-optimized executive summary | ✅ Complete |

---

## Data Model Architecture

### Core Entity: DataProduct (65+ fields)
```
DataProduct
├── Identity (id, name, domain, businessUnit, owner, platform)
├── Economics (monthlyCost, costBreakdown, declaredValue, usageImpliedValue, compositeValue, roi, roiBand)
├── Usage (monthlyConsumers, totalQueries, consumerTeams, usageTrend, peakConsumers)
├── Quality (freshnessHours, freshnessSLA, completeness, accuracy, trustScore)
├── Marketplace (isPublished, isCertified, subscriptionCount)
├── Value (valueDeclaration with method, basis, status, review cycle)
├── Dependencies (downstreamProducts, downstreamModels, downstreamDashboards)
└── Flags (isRetirementCandidate, hasCostSpike, hasUsageDecline)
```

### System Entities (Phase 4)
```
Decision
├── type (retirement | cost_investigation | value_revalidation | low_roi_review)
├── status (under_review | approved | rejected)
├── Financial impact (estimated + actual)
├── Lifecycle (initiatedBy, assignedTo, createdAt, resolvedAt)
└── Resolution notes

ROIHistoryPoint (never overwrite, append-only)
├── month, roi, cost, compositeValue

ValueDeclarationVersion (full version history)
├── version, declaredBy, method, value, basis, changeNote

ExecutiveSummary
├── confidenceLevel (based on data coverage)
├── insights[] (type: insight | risk | opportunity)
├── doNothingProjection (6-month inaction scenario)

BenchmarkDataPoint
├── industry, medianROI, medianCostPerConsumer, percentile ranges

PolicyConfig (switching cost anchor)
├── category (valuation | lifecycle | cost | governance)
├── currentValue, updatedBy, updatedAt
```

---

## Strategic Architecture Decisions

### 1. Confidence Level
Every number shown to executives includes a confidence indicator based on:
- % of costs tracked by connectors
- % of products with active value declarations
- Number of expiring declarations

This prevents "garbage in, garbage out" and builds trust.

### 2. Composite Value Formula
`Composite Value = (0.7 × Declared Value) + (0.3 × Usage-Implied Value)`

Weights are configurable via Policy Configuration. This creates a standardized way to value data capital that doesn't exist in the market.

### 3. Decision Audit Trail
Every financial decision (retire, investigate, revalidate) is logged with:
- Who initiated it
- Who owns it
- Estimated $ impact
- Actual $ impact (when resolved)
- Resolution notes

This creates institutional memory that survives employee turnover.

### 4. "If You Do Nothing" Projection
Shows what happens if no decisions are made for 6 months:
- Cost growth from unoptimized products
- ROI decline from expiring value declarations
- Wasted spend from decline-stage products
- Value at risk from governance gaps

This creates urgency without being alarmist.

### 5. Reallocation Modeling
"What if we move 10% from lowest ROI quartile to highest?"
- Identifies bottom quartile products (reallocation candidates)
- Identifies top quartile products (investment targets)
- Projects portfolio ROI improvement
- Transparent methodology shown to user

This shifts the conversation from "costs" to "investment allocation."

### 6. Behavioral Risk in Pricing
Price changes don't happen in a vacuum:
- Adoption impact slider models usage decline from price increases
- Revenue neutrality mode constrains charges to exactly match cost
- Risk indicator categorizes each scenario (high/moderate/low)
- Contextual advice for each risk level

This elevates pricing from math to strategy.

---

## Tech Stack
- **Framework:** Next.js 16 (App Router, "use client")
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 + shadcn/ui + custom design tokens
- **Charts:** Recharts (PieChart, BarChart, AreaChart, ScatterChart)
- **Fonts:** Inter + JetBrains Mono
- **State:** Local React state (no global store needed for MVP)
- **Data:** Mock seed data (designed for easy API swap)
- **Routing:** File-based with (dashboard) layout group
- **Build:** Turbopack, all routes compile clean

---

## Competitive Moat Layers

| Layer | What | Lock-in |
|-------|------|---------|
| **Data** | Cost/value/usage data from connectors | Hard to recreate |
| **Decisions** | Audit trail of every portfolio decision | Institutional memory |
| **Policies** | Custom valuation rules, thresholds, review cycles | Configuration investment |
| **Benchmarks** | Cross-company anonymized comparisons | Network effects |
| **History** | ROI trends, value declaration versions | Time-series data |
| **Workflows** | Decision review processes embedded in governance | Process dependency |
| **Board Reporting** | Quarterly slides pulled from system | Executive dependency |

---

## Open Questions for Product Discussion

1. **Pricing model**: Per-product? Per-user? Platform fee + consumption?
2. **Benchmarking opt-in**: How do we incentivize companies to share anonymized data?
3. **AI depth**: Should Executive Intelligence use actual LLM calls or remain rule-based?
4. **Multi-org**: When do we add team/BU-level portfolio views?
5. **Integrations priority**: Snowflake/Databricks first, then what? (dbt, Airflow, Monte Carlo?)
6. **Self-serve onboarding**: Can a CDO connect and get value in <1 hour?
7. **Policy Configuration UI**: Currently policies exist as seed data — should we build a dedicated settings UI for policy management?
8. **Alert System**: When should the system proactively notify (email/Slack) vs. wait for the user to check?
9. **API-first**: Should there be a public API for programmatic access to portfolio metrics?

---

*This document is auto-maintained alongside the codebase. Last updated: 2026-02-25.*
