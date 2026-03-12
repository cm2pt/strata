# Strata — Product Architecture

## The financial operating system for enterprise data portfolios

---

## 1. PRODUCT THESIS

Enterprises spend $200B+ annually on data infrastructure. Zero of that spend is governed by the same financial discipline applied to every other capital asset.

A factory has a depreciation schedule. A patent has a valuation model. A software license has a cost center. But a data product — which may drive $50M in decisions — has nothing. No cost of ownership. No usage audit. No ROI. No retirement trigger. It exists in a financial void.

**Strata closes that void.**

It is not a catalog (Atlan, Collibra). It is not a compute platform (Snowflake, Databricks). It is not a BI tool (Tableau, Looker). It is the **financial control plane** that sits above all of them.

**The analogy:** Stripe made payments programmable by abstracting bank complexity into a developer-first API. Strata makes data capital measurable by abstracting infrastructure complexity into a CFO-legible financial interface.

**Core premise:** If you can't measure the cost, usage, and return of a data product, you cannot manage it. And if you cannot manage it, you cannot justify the next dollar of data investment.

**The shift we create:**

| Before | After |
|---|---|
| "We spent $4M on our data platform" | "We have 127 data products with a blended ROI of 3.2x" |
| "I think this dashboard is used" | "This product has 340 monthly consumers across 12 teams" |
| "We need more data engineers" | "Our top 5 data products justify $1.2M in incremental investment" |
| "Nobody retires old pipelines" | "23 products triggered retirement review this quarter" |
| "AI costs are exploding" | "Model X consumes 4 data products at $12K/month total cost" |

**The buyer:** Chief Data Officer (champion), CFO (economic buyer), VP Data Engineering (technical validator).

**The wedge:** Cost visibility. Every enterprise is bleeding money on underperforming data capital and has no way to see it. Cost visibility is the Trojan horse. ROI attribution is the expansion. Internal marketplace is the platform play.

---

## 2. CORE PERSONAS

### 2.1 CFO — "The Capital Allocator"

**Mental model:** "Data is the largest uninstrumented line item on my P&L."

**Needs:**
- Portfolio-level view of data capital by cost, value, and ROI
- Ability to compare data investment efficiency across business units
- Clear cost trends and forecasts
- Justification evidence for board-level data strategy decisions

**Key question:** "Are we getting return on our data investment?"

**Primary surfaces:** Executive Portfolio Dashboard, ROI Summary, Budget vs. Actual

---

### 2.2 Chief Data Officer — "The Portfolio Manager"

**Mental model:** "I run a portfolio of data products. Some are stars, some are dogs. I need to allocate capital accordingly."

**Needs:**
- Lifecycle health across all data products
- Identification of underperforming or declining assets
- Justification for headcount and infrastructure investment
- Governance and quality signals tied to economic impact

**Key question:** "Which data products should I invest in, maintain, or retire?"

**Primary surfaces:** Portfolio Dashboard, Lifecycle Health View, Investment Recommendations

---

### 2.3 Data Product Owner — "The P&L Owner"

**Mental model:** "I am the GM of this data product. I need to know my costs, my users, and my value."

**Needs:**
- Full financial profile of their data product(s)
- Consumer list with usage patterns
- Cost breakdown (compute, storage, pipeline, human effort)
- Ability to set and track value declarations
- Alerts on usage decline or cost spikes

**Key question:** "Is my data product healthy and worth the investment?"

**Primary surfaces:** Product Financial Profile, Subscription Management, Cost Breakdown

---

### 2.4 Business Data Consumer — "The Subscriber"

**Mental model:** "I need reliable data to make decisions. I want to know what's available, what it costs my team, and whether I can trust it."

**Needs:**
- Browse available data products with quality and cost transparency
- Subscribe/unsubscribe with clear cost implications
- Usage history and attribution for their team
- SLA visibility (freshness, completeness, accuracy)

**Key question:** "What data can I use, what does it cost my team, and can I trust it?"

**Primary surfaces:** Internal Data Marketplace, Team Usage Dashboard, SLA Monitor

---

### 2.5 AI/ML Lead — "The Model Economist"

**Mental model:** "My models consume data products. I need to understand the full cost stack — data acquisition, compute, inference — and attribute value back."

**Needs:**
- Map models to their data product dependencies
- Full cost attribution (data cost + compute cost per model)
- Value attribution from model outputs back to source data
- Impact analysis: "If this data product degrades, which models break?"

**Key question:** "What is the true cost per model, and which data products are driving the most model value?"

**Primary surfaces:** AI Cost Attribution View, Model Dependency Map, Data-to-Model Value Chain

---

## 3. PRIMARY DASHBOARDS & INTERFACES

### 3.1 Navigation Model

The product uses a **financial portfolio metaphor** throughout. The sidebar navigation (RBAC-filtered per user role):

```
[Portfolio]  [Candidates]  [Assets]  [Lifecycle]  [Decisions]  [Allocation]
[Capital Impact]  [Capital Review]  [Capital Projection]  [AI Scorecard]  [Marketplace]  [Simulate]
──────
[Setup]
```

**Portfolio** — Executive-level overview. The "Bloomberg Terminal" view.
**Candidates** — Discovery inbox. Auto-discovered product candidates with confidence scoring.
**Assets** — Browse, search, and drill into individual data products.
**Lifecycle** — Health monitoring, retirement tracking, stage management.
**Decisions** — Capital decision log. Approve, reject, delay with savings tracking.
**Allocation** — Budget allocation analysis and reallocation approval.
**Capital Impact** — Capital freed, ROI delta, event ledger. The money story.
**Capital Review** — Executive performance layer. CEI score (6 components), governance behavior, portfolio rebalance simulation, decision performance.
**Capital Projection** — 36-month forward simulation under 3 governance scenarios. Quantifies cost of inaction with scenario tables, ROI drift, liability accumulation, AI exposure risk.
**AI Scorecard** — 5-dimension risk scoring, flag for review, kill switch.
**Marketplace** — Internal subscription and discovery hub.
**Simulate** — Pricing simulation, what-if scenarios, policy activation.
**Setup** — Connector configuration (admin only).

**Secondary global elements:**
- **Command bar** (Cmd+K) — Placeholder for AI-powered search (not yet built)
- **Edge proxy** — Redirects unauthenticated users to login
- **Toast notifications** — Success/error/warning feedback on all actions
- **Permission guard** — Route-level access denied screen for unauthorized navigation
- **Org info** — Sidebar displays dynamic org name from `/org-info/` endpoint (falls back to "Strata")
- **Display config** — All UI threshold bands (ROI, trust score, confidence score, AI risk score, pricing defaults, team budget) sourced from `/display-config/` endpoint via `useDisplayConfig()` hook (falls back to seed values)

---

### 3.2 Interface Descriptions (6 Core Screens)

#### SCREEN 1: Executive Portfolio Dashboard

**Purpose:** Give CFO/CDO a single view of data as a financial portfolio.

**Layout:**

```
+------------------------------------------------------------------+
|  DATA CAPITAL PORTFOLIO                   [Org-wide v]  [Q4 2026] |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  | TOTAL DATA       |  | PORTFOLIO        |  | COST TREND       | |
|  | PRODUCTS         |  | ROI              |  |                  | |
|  |     127          |  |     2.8x         |  |  [sparkline]     | |
|  | +4 this quarter  |  |  +0.3 vs Q3      |  |  $4.2M this Q   | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  | ACTIVE           |  | TOTAL CONSUMERS  |  | RETIREMENT       | |
|  | SUBSCRIPTIONS    |  |                  |  | CANDIDATES       | |
|  |     843          |  |     2,140        |  |      23          | |
|  | across 31 teams  |  | +12% vs Q3       |  |  est. $380K save | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                    |
|  PORTFOLIO MATRIX (BCG-style quadrant)                            |
|  +--------------------------------------------------------------+ |
|  |                    High Usage                                 | |
|  |        STARS              |         CASH COWS                | |
|  |   (high value,            |    (high usage,                  | |
|  |    high growth)           |     stable cost)                 | |
|  | High  ---------------------|-------------------------  Low   | |
|  | Cost  QUESTION MARKS      |         DOGS                    | |
|  |   (high cost,             |    (low usage,                   | |
|  |    low usage)             |     low value)                   | |
|  |                    Low Usage                                  | |
|  +--------------------------------------------------------------+ |
|  Each dot = 1 data product. Size = cost. Color = lifecycle stage. |
|  Click any dot to open its Financial Profile.                     |
|                                                                    |
|  COST BY BUSINESS UNIT          TOP 10 PRODUCTS BY ROI           |
|  [horizontal stacked bar]       [ranked list with ROI, cost,     |
|                                  value, consumers]               |
|                                                                    |
|  INVESTMENT RECOMMENDATIONS (AI-generated)                        |
|  +--------------------------------------------------------------+ |
|  | "3 products in Marketing BU show declining usage (-40% QoQ)  | |
|  |  with combined cost of $210K. Recommend retirement review."  | |
|  |                                                               | |
|  | "Customer 360 product has 3.8x ROI and waitlist of 4 teams.  | |
|  |  Recommend capacity investment."                              | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

**Interactions:**
- Click any metric card to drill into detail
- Click any dot in the portfolio matrix to open that product's financial profile
- Filter by business unit, lifecycle stage, cost tier, or ROI range
- Export as PDF for board presentations (one-click)
- AI Copilot: "Which products should I invest in next quarter?"

---

#### SCREEN 2: Data Product Financial Profile

**Purpose:** The "annual report" for a single data product. Full P&L visibility.

**Layout:**

```
+------------------------------------------------------------------+
|  < Back to Portfolio                                              |
|                                                                    |
|  CUSTOMER 360            [Active - Growth Stage]    [Edit] [Share]|
|  Owner: Maria Santos, Customer Analytics                          |
|  Created: Mar 2025  |  Last updated: 2 hours ago                 |
+------------------------------------------------------------------+
|                                                                    |
|  +--- FINANCIAL SUMMARY ---+  +--- LIFECYCLE STAGE -----------+ |
|  |                          |  |                                | |
|  |  Monthly Cost    $18.4K  |  |  [=====>        ] Growth      | |
|  |  Declared Value  $62K    |  |                                | |
|  |  ROI             3.4x    |  |  Draft > Active > GROWTH >    | |
|  |  Trend           +0.2x   |  |  Mature > Decline > Retire    | |
|  +--------------------------+  +--------------------------------+ |
|                                                                    |
|  COST BREAKDOWN                                                   |
|  +--------------------------------------------------------------+ |
|  |  [Donut Chart]                                                | |
|  |                                                                | |
|  |  Compute (Snowflake)     $8.2K   44%   [trend sparkline]     | |
|  |  Storage                 $2.1K   11%   [trend sparkline]     | |
|  |  Pipeline (Airflow/dbt)  $3.4K   18%   [trend sparkline]     | |
|  |  Human Effort (est.)     $4.7K   26%   [trend sparkline]     | |
|  |                                                                | |
|  |  Total                  $18.4K  100%                          | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  CONSUMER MAP                                                     |
|  +--------------------------------------------------------------+ |
|  |  340 monthly active consumers across 12 teams                 | |
|  |                                                                | |
|  |  Marketing Analytics    89 users   [========]  26%            | |
|  |  Sales Ops              72 users   [======]    21%            | |
|  |  Customer Success       58 users   [=====]     17%            | |
|  |  Data Science           45 users   [====]      13%            | |
|  |  ... 8 more teams                                             | |
|  |                                                                | |
|  |  Usage trend: [line chart, 6-month trailing]                  | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  VALUE DECLARATION                                                |
|  +--------------------------------------------------------------+ |
|  |  Declared by: VP Marketing, Dec 2025                          | |
|  |  Method: Revenue attribution                                  | |
|  |  Declared value: $62K/month                                   | |
|  |  Basis: "Drives segmentation for $740K/year campaign spend.   | |
|  |          Estimated 8% lift = $62K/month attributed value."    | |
|  |                                                                | |
|  |  Validation status: [Peer-reviewed] [CFO-acknowledged]        | |
|  |  Next review: Mar 2026                                        | |
|  |                                                                | |
|  |  [Request Re-validation]  [Update Declaration]                | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  DOWNSTREAM DEPENDENCIES                                          |
|  +--------------------------------------------------------------+ |
|  |  3 data products depend on this asset                         | |
|  |  2 ML models consume this asset                               | |
|  |  7 dashboards source from this asset                          | |
|  |  [View full dependency graph]                                 | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  SLA & QUALITY                                                    |
|  +--------------------------------------------------------------+ |
|  |  Freshness SLA: 4 hours  |  Actual: 2.3 hours  |  MEETING   | |
|  |  Completeness:  99.2%    |  Target: 99%         |  MEETING   | |
|  |  Accuracy:      97.8%    |  Target: 95%         |  MEETING   | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

**Key design decisions:**
- Cost and value are ALWAYS shown together — never cost alone
- The lifecycle stage is visual and prominent, not buried in metadata
- Consumer map makes "who depends on this" immediately visible
- Value Declaration is a first-class object — not a tag, but a structured claim with an author, method, and review cycle
- SLA is presented as a financial contract, not a technical metric

---

#### SCREEN 3: Internal Pricing Simulator

**Purpose:** Enable CDO/Finance to model internal pricing, chargeback scenarios, and investment trade-offs.

**Layout:**

```
+------------------------------------------------------------------+
|  PRICING SIMULATOR                                                |
+------------------------------------------------------------------+
|                                                                    |
|  SCENARIO: [New Scenario v]           [Save] [Compare] [Export]  |
|                                                                    |
|  +--- PRICING MODEL --------+  +--- PARAMETERS ---------------+ |
|  |                           |  |                               | |
|  |  ( ) Cost-plus            |  |  Markup %:       [25]        | |
|  |  (*) Usage-based          |  |  Base fee:       [$500/mo]   | |
|  |  ( ) Tiered               |  |  Per-query cost: [$0.12]     | |
|  |  ( ) Flat subscription    |  |  Free tier:      [1000 qry]  | |
|  |  ( ) Value-share          |  |                               | |
|  +---------------------------+  +-------------------------------+ |
|                                                                    |
|  SIMULATION RESULTS                                               |
|  +--------------------------------------------------------------+ |
|  |                                                                | |
|  |  Applied to: Customer 360 product                             | |
|  |                                                                | |
|  |  Current cost absorption:         $18.4K/month (central)     | |
|  |  Simulated chargeback revenue:    $22.1K/month               | |
|  |  Net position:                    +$3.7K/month surplus       | |
|  |                                                                | |
|  |  TEAM IMPACT:                                                 | |
|  |  +----------------------------------------------------------+ |
|  |  | Team              | Usage  | Charge   | vs. Budget        | |
|  |  |----------------------------------------------------------|  |
|  |  | Marketing Anlytcs  | 89 usr | $5,740   | Within budget     | |
|  |  | Sales Ops          | 72 usr | $4,640   | Within budget     | |
|  |  | Customer Success   | 58 usr | $3,740   | Over by $240      | |
|  |  | Data Science       | 45 usr | $2,900   | Within budget     | |
|  |  +----------------------------------------------------------+ |
|  |                                                                | |
|  |  BEHAVIORAL PREDICTION (AI):                                  | |
|  |  "At $0.12/query, estimated 15% reduction in casual queries.  | |
|  |   3 teams likely to optimize usage. Net cost saving: $2.1K."  | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  SCENARIO COMPARISON                                              |
|  +--------------------------------------------------------------+ |
|  |  [Bar chart comparing 3 saved scenarios side by side]         | |
|  |  Scenario A (cost-plus): $19.2K revenue, low behavioral chg  | |
|  |  Scenario B (usage):     $22.1K revenue, med behavioral chg  | |
|  |  Scenario C (tiered):    $20.8K revenue, high behavioral chg | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  [Apply to All Products]  [Apply to Selected BU]  [Draft Policy] |
+------------------------------------------------------------------+
```

**Why this screen matters:**
- Chargeback is the #1 mechanism to change behavior
- But most enterprises are afraid to implement it because they can't model the impact
- This simulator makes it safe to explore pricing without committing
- The AI behavioral prediction is the killer feature — "what happens to usage if we charge?"

---

#### SCREEN 4: Lifecycle Health View

**Purpose:** Portfolio risk dashboard. Identifies assets that need attention, investment, or retirement.

**Layout:**

```
+------------------------------------------------------------------+
|  LIFECYCLE HEALTH                         [All BUs v]  [Q4 2026] |
+------------------------------------------------------------------+
|                                                                    |
|  STAGE DISTRIBUTION                                               |
|  +--------------------------------------------------------------+ |
|  |  Draft [===]              8 products    $12K total cost       | |
|  |  Active [==========]    34 products   $142K total cost       | |
|  |  Growth [===============] 47 products   $287K total cost      | |
|  |  Mature [========]       22 products   $198K total cost       | |
|  |  Decline [====]          12 products    $87K total cost       | |
|  |  Retired [==]             4 products     $0  (savings: $64K) | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  REQUIRES ATTENTION                                               |
|  +--------------------------------------------------------------+ |
|  |  RETIREMENT CANDIDATES (usage < 20% of peak for 90+ days)    | |
|  |  +----------------------------------------------------------+ |
|  |  | Product             | Cost    | Users | Peak | Savings   | |
|  |  |----------------------------------------------------------|  |
|  |  | Legacy Campaign DB  | $14.2K  |   3   | 89   | $14.2K   | |
|  |  | Old Product Catalog | $8.7K   |   7   | 124  | $8.7K    | |
|  |  | Test Env Dataset    | $6.1K   |   0   | 45   | $6.1K    | |
|  |  |               ... 20 more                                | |
|  |  |  Total potential savings: $380K/year                      | |
|  |  +----------------------------------------------------------+ |
|  |  [Start Retirement Review]  [Export List]                     | |
|  |                                                                | |
|  |  STALLED IN DRAFT (no consumers after 60 days)                | |
|  |  +----------------------------------------------------------+ |
|  |  | Product              | Age    | Cost  | Owner            | |
|  |  |----------------------------------------------------------|  |
|  |  | New Churn Predictor   | 74d    | $3.2K | J. Park          | |
|  |  | Supplier Risk Score   | 88d    | $1.8K | A. Chen          | |
|  |  +----------------------------------------------------------+ |
|  |  [Notify Owners]                                              | |
|  |                                                                | |
|  |  COST SPIKES (>30% MoM increase)                              | |
|  |  +----------------------------------------------------------+ |
|  |  | Product              | Previous | Current | Delta        | |
|  |  |----------------------------------------------------------|  |
|  |  | Fraud Detection Feed  | $22K     | $34K    | +$12K (+55%)| |
|  |  +----------------------------------------------------------+ |
|  |  [Investigate]                                                | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  LIFECYCLE TRANSITIONS THIS QUARTER                               |
|  +--------------------------------------------------------------+ |
|  |  [Sankey diagram showing flow between stages]                 | |
|  |  Draft -> Active: 6 products                                 | |
|  |  Active -> Growth: 8 products                                | |
|  |  Growth -> Mature: 3 products                                | |
|  |  Mature -> Decline: 5 products                               | |
|  |  Decline -> Retired: 4 products (saved $64K)                 | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

**Key design principle:** Every health signal is tied to a dollar amount. "12 products in decline" is interesting. "12 products in decline costing $87K/month" demands action.

---

#### SCREEN 5: AI Cost & Model Attribution View

**Purpose:** Make the economics of AI/ML consumption visible. This is increasingly the #1 cost driver and the least understood.

**Layout:**

```
+------------------------------------------------------------------+
|  AI & MODEL ECONOMICS                                             |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  | MODELS TRACKED   |  | TOTAL DATA COST  |  | AVG COST PER    | |
|  |      24          |  | FOR AI/ML        |  | MODEL            | |
|  |                   |  |    $142K/mo      |  |    $5.9K/mo     | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                    |
|  MODEL COST STACK                                                 |
|  +--------------------------------------------------------------+ |
|  |  Model: Churn Prediction v3                                   | |
|  |  Owner: AI/ML Team - S. Kumar                                | |
|  |  +----------------------------------------------------------+ |
|  |  |  DATA PRODUCTS CONSUMED:                                  | |
|  |  |  Customer 360         $18.4K  (allocated: $4.2K)         | |
|  |  |  Transaction History  $12.1K  (allocated: $6.8K)         | |
|  |  |  Product Interactions  $8.3K  (allocated: $3.1K)         | |
|  |  |                                                           | |
|  |  |  TOTAL DATA COST (allocated):              $14.1K/mo     | |
|  |  |  TRAINING COMPUTE:                          $8.3K/mo     | |
|  |  |  INFERENCE COMPUTE:                         $3.2K/mo     | |
|  |  |  FULL MODEL COST:                          $25.6K/mo     | |
|  |  |                                                           | |
|  |  |  DECLARED VALUE:                           $89K/mo       | |
|  |  |  (Prevents est. $89K in monthly churn)                    | |
|  |  |  MODEL ROI:                                3.5x          | |
|  |  +----------------------------------------------------------+ |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  DATA-TO-MODEL DEPENDENCY MAP                                     |
|  +--------------------------------------------------------------+ |
|  |  [Visual graph: data products on left, models on right,      | |
|  |   lines showing consumption. Thickness = cost allocated.     | |
|  |   Color = health status of connection.]                       | |
|  |                                                                | |
|  |  Customer 360 ----+---> Churn Prediction v3                  | |
|  |                    +---> Upsell Recommender                   | |
|  |  Transaction Hist -+---> Churn Prediction v3                  | |
|  |                    +---> Fraud Detection v2                   | |
|  |  Clickstream ------+---> Upsell Recommender                   | |
|  |                    +---> Personalization Engine               | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  IMPACT ANALYSIS                                                  |
|  +--------------------------------------------------------------+ |
|  |  "If Customer 360 degrades or is retired:"                    | |
|  |   - Churn Prediction v3: BREAKS (primary feature source)     | |
|  |   - Upsell Recommender: DEGRADES (loses 40% of features)    | |
|  |   - Estimated business impact: $240K/month in lost value     | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## 4. THE CORE ECONOMIC ENGINE

### 4.1 How Cost is Calculated

Cost is computed from three layers, assembled automatically where possible and estimated where not:

**Layer 1: Infrastructure Cost (automated)**
- Snowflake: query cost, storage cost, warehouse credits attributed to each data product
- Databricks: cluster cost, storage, job compute attributed per product
- Cloud storage: S3/GCS/ADLS cost per product
- Source: Direct API integration with billing APIs

**Layer 2: Pipeline Cost (semi-automated)**
- dbt: Model run frequency, compute per run, attributed per product
- Airflow/Dagster: DAG cost allocated by data product lineage
- Source: Orchestrator metadata + cost allocation rules

**Layer 3: Human Cost (estimated, owner-declared)**
- Engineering hours per product (owner declares, system tracks over time)
- Analyst hours for maintenance and support
- Source: Owner input, validated by manager, benchmarked against actuals

**Total Cost of Ownership (TCO) = Infrastructure + Pipeline + Human**

Cost is computed monthly and trended over time. Cost anomalies (>30% MoM change) trigger alerts.

### 4.2 How Value is Declared and Validated

Value cannot be purely automated. It requires human judgment with system accountability. The system implements a **Value Declaration Protocol:**

**Step 1: Declaration**
- A business stakeholder (not the data team) declares the value of a data product
- They select a method: Revenue Attribution, Cost Avoidance, Efficiency Gain, Compliance Requirement, or Strategic Enabler
- They write a plain-English justification with a dollar figure

**Step 2: Peer Review**
- A second stakeholder (or the CDO) reviews and acknowledges the declaration
- They can challenge, adjust, or approve

**Step 3: System Validation**
- The system checks: Does usage support this claim? (A product declared at $500K value with 3 users is flagged)
- Usage-weighted value score supplements declared value

**Step 4: Periodic Re-validation**
- Every 6 months, declarations must be re-validated or they decay
- If a declaration expires without renewal, the product is flagged

**Value Types:**
- **Declared Value:** Business stakeholder's claim (structured, auditable)
- **Usage-Implied Value:** System-computed from consumption patterns, consumer seniority, and decision frequency
- **Composite Value Score:** Weighted blend of declared + usage-implied (configurable weights)

### 4.3 How ROI is Computed

```
ROI = Composite Value / Total Cost of Ownership

Where:
  Composite Value = (w1 * Declared Value) + (w2 * Usage-Implied Value)
  Total Cost = Infrastructure + Pipeline + Human

Default weights: w1 = 0.7, w2 = 0.3 (configurable per org)
```

ROI is computed monthly and displayed as a trailing 3-month average to smooth volatility.

**ROI Bands:**
- **>3x:** High performer — invest more
- **1-3x:** Healthy — maintain
- **0.5-1x:** Underperforming — review and optimize
- **<0.5x:** Candidate for retirement or restructuring

### 4.4 How Unused Assets are Detected

The system monitors three signals:

1. **Usage Decay:** Monthly active consumers < 20% of 6-month peak, sustained for 90+ days
2. **Query Silence:** Zero queries in 30 days (for products with historical activity)
3. **Consumer Churn:** >50% of subscribed teams have stopped querying in 60 days

When any signal fires, the product enters **Decline** stage automatically and the owner receives an alert with the subject line: *"[Product Name] may no longer be needed — review recommended."*

### 4.5 How Retirement is Triggered

Retirement is never automatic. It follows a structured protocol:

1. **System flags** the product as a retirement candidate (based on signals above)
2. **Owner reviews** within 14 days (or escalated to CDO)
3. **Dependency check** runs automatically — any downstream products or models that depend on this asset are identified and their owners notified
4. **Retirement decision** is made by owner + CDO with sign-off
5. **Grace period** of 30 days where the product is marked "Retiring" — consumers are notified
6. **Retirement** — pipelines are stopped, storage is archived (not deleted), cost savings are logged

**Every retirement produces a "Savings Report"** — the dollar amount saved is attributed to the CDO's portfolio performance.

---

## 5. COMPETITIVE DIFFERENTIATION

### 5.1 vs. Snowflake Marketplace

Snowflake Marketplace is an **external** data exchange. It helps you buy/sell data across companies. Strata manages **internal** data economics. Snowflake doesn't know what a data product costs your organization, who uses it, or what it's worth. Strata connects *to* Snowflake (as one of many infrastructure sources) but operates at a completely different abstraction layer.

**In one line:** Snowflake Marketplace = external data commerce. Strata = internal data economics.

### 5.2 vs. Databricks Unity Catalog

Unity Catalog is a **governance and access control** layer. It manages who *can* access data. Strata manages who *does* access data, what it *costs*, and what it's *worth*. Unity Catalog is a prerequisite for good data management — Strata turns that management into financial accountability. They are complementary, not competitive.

**In one line:** Unity Catalog = access governance. Strata = economic governance.

### 5.3 vs. Atlan / Collibra

Atlan and Collibra are **data catalogs with governance workflows**. They answer "what data do we have and who is responsible?" Strata answers "what does our data cost, what is it worth, and where should we invest?" Catalogs are descriptive. Strata is prescriptive and economic. Catalogs are used by data teams. Strata is used by CFOs and CDOs.

**In one line:** Catalogs = "what exists." Strata = "what it's worth."

### 5.4 vs. Microsoft Fabric

Fabric is an **end-to-end analytics platform** — compute, storage, BI, all integrated. It's infrastructure. Strata doesn't replace infrastructure. It sits above Fabric (and Snowflake, and Databricks, and all of them) as a financial abstraction layer. Fabric has some cost management features, but they are per-workspace cost tracking, not per-data-product economic analysis.

**In one line:** Fabric = unified analytics infrastructure. Strata = financial operating system across all infrastructure.

### 5.5 The Moat

| Category | Existing Players | Strata |
|---|---|---|
| Knows what data exists | Yes (catalogs) | Yes (inherits) |
| Knows who can access it | Yes (governance) | Yes (inherits) |
| Knows what it costs | No (infrastructure billing only) | **Yes (product-level TCO)** |
| Knows what it's worth | No | **Yes (value declarations)** |
| Computes ROI | No | **Yes (cost vs. value)** |
| Recommends retirement | No | **Yes (lifecycle engine)** |
| Models pricing/chargeback | No | **Yes (simulator)** |
| Attributes AI costs to data | No | **Yes (model attribution)** |

---

## 6. IMPLEMENTATION STATUS

This section tracks what has been built, what is partially implemented, and what remains in the pipeline. Last updated: February 2026.

### 6.1 Architecture & Infrastructure — BUILT

| Component | Technology | Status |
|---|---|---|
| Frontend | Next.js 16 (Turbopack), React, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts | Running |
| Backend API | FastAPI, Python 3.14, SQLAlchemy async (asyncpg) | Running |
| Database | PostgreSQL 16, Alembic migrations (8 migration files) | Running |
| Auth | JWT access tokens (15 min) + refresh token rotation (max 5/user) | Running |
| RBAC — Backend | 15 roles, 32 permissions, `require_permission()` on every endpoint (50 RBAC tests) | Running |
| RBAC — Frontend | Three-layer enforcement: sidebar filtering, route-level `<PermissionGuard>`, component-level button visibility | Running |
| Containerization | Docker Compose (db + api + web) | Running |
| CI/CD | GitHub Actions — backend pytest (158 tests) + frontend vitest, >=70% coverage | Running |
| Demo Mode | Frontend seed-data fallback for reads when API is unavailable; mutation buttons disabled with tooltip via `canMutate` gate; all UI thresholds from `useDisplayConfig()` with seed fallback | Running |
| Audit Logging | AuditLog table for compliance tracking | Running |
| Toast Notifications | Lightweight context-based toast system (success/error/warning) on all actions | Running |

### 6.2 Database Schema — 39 Tables Across 15 Model Files

**Core domain models (all built):**

- **Organizations & Users:** `organizations`, `business_units`, `teams`, `users`, `user_org_roles`, `refresh_tokens`
- **Data Products:** `data_products` (with lifecycle stage, economics, quality scores, `retired_at`, `capital_freed_monthly`), `cost_breakdowns`, `consumer_teams`, `data_product_tags`, `data_product_dependencies`
- **Value Declarations:** `value_declarations`, `value_declaration_versions` (structured claims with author, method, review cycle)
- **Time Series:** `cost_monthly`, `usage_monthly`, `roi_monthly`, `portfolio_monthly` (with `capital_freed_cumulative`, `budget_reallocated`, `decisions_executed`)
- **Connectors:** `connector_configs`, `connector_runs`, `source_assets`, `asset_mappings`, `usage_events`, `cost_events`
- **Decisions:** `decisions` (with `capital_freed`, `projected_savings_monthly`, `projected_savings_annual`, `delay_reason`, `delayed_until`, `impact_validation_status`, `validation_start_date`, `validation_window_days`, `actual_savings_measured`, `variance_from_projection`, `impact_confidence_score`), `decision_comments`, `decision_actions`, `decision_economic_effects`
- **Discovery:** `product_candidates`, `candidate_members` (confidence scoring, evidence streams)
- **Capital Events:** `capital_events` (append-only financial ledger: retirement_freed, cost_optimization, reallocation, pricing_revenue, ai_spend_reduced)
- **Pricing:** `pricing_policies` (versioned, draft/active/retired), `pricing_usage_deltas`
- **AI Scorecard:** `ai_project_scorecards` (5-dimension risk scoring, composite score, kill-switch flag)
- **Config & Marketplace:** `policy_configs`, `notifications`, `benchmark_data`, `marketplace_subscriptions`
- **Graph:** `edges` (dependency graph between assets)
- **Audit:** `audit_logs`

### 6.3 API Endpoints — 62+ Endpoints Across 20 Routers

| Router | Endpoints | Status |
|---|---|---|
| **Auth** (`/auth`) | register, login, demo-login, refresh, logout, /me, demo-personas | Built |
| **Portfolio** (`/portfolio`) | summary, cost-trend, roi-history, executive-summary | Built |
| **Assets** (`/assets`) | CRUD, metrics per asset | Built |
| **Decisions** (`/decisions`) | CRUD, approve-retirement, delay-retirement, savings-summary, `/{id}/impact-report`, run-validation-sweep, `GET /{id}`, `GET /{id}/comments`, `POST /{id}/comments`, `GET /{id}/actions`, `GET /{id}/economic-effects` | Built |
| **Candidates** (`/candidates`) | list, detail, promote, ignore, ingest, generate | Built |
| **Connectors** (`/connectors`) | CRUD, test, run | Built |
| **Marketplace** (`/marketplace`) | products list, subscribe, unsubscribe | Built |
| **Allocation** (`/allocation`) | summary, approve-reallocation, `portfolio-rebalance` | Built |
| **Pricing** (`/pricing`) | CRUD for pricing policies | Built |
| **AI Scorecard** (`/ai-scorecard`) | list scorecards, create, detail | Built |
| **Capital Impact** (`/capital-impact`) | summary (aggregates capital events, decisions, ROI delta) | Built |
| **Capital Efficiency** (`/capital-efficiency`) | org-level KPI score (0-100) with 6-component breakdown (configurable weights from policy_configs) | Built |
| **Capital Behavior** (`/capital-behavior`) | 5 governance hygiene metrics: decision velocity, value coverage, review overdue, enforcement rate, impact confirmation + composite health score | Built |
| **Enforcement** (`/enforcement`) | run-sweep (automated governance trigger rules) | Built |
| **Board** (`/board`) | capital-summary (structured JSON for executive export) | Built |
| **Lifecycle** (`/lifecycle`) | transitions per product | Built |
| **Benchmarks** (`/benchmarks`) | industry benchmarks | Built |
| **Simulate** (`/simulate`) | pricing simulation engine | Built |
| **Notifications** (`/notifications`) | list notifications, `PATCH /{id}/read`, `POST /mark-all-read` | Built |
| **Org Info** (`/org-info`) | org name, team/user/role counts, value weights | Built |
| **Display Config** (`/display-config`) | UI threshold bands (ROI, trust, confidence, risk, pricing defaults, budget) | Built |
| **Capital Projection** (`/capital-projection`) | 36-month deterministic forward simulation under 3 governance scenarios (Passive, Governance, Active Capital). Returns scenario arrays, drift deltas, liability estimates, current snapshot | Built |
| **Value** (`/value`) | value declaration management | Built |

### 6.4 Frontend Screens — 18 Pages

| Screen | Route | Vision Screen | Status |
|---|---|---|---|
| Login | `/login` | — | Built (15 persona demo selector) |
| Portfolio Dashboard | `/portfolio` | Screen 1 (Executive Portfolio) | Built — KPI cards, cost trends, ROI history, BCG matrix, executive intelligence |
| Board View | `/portfolio/board-view` | — | Built — 6-slide Kanban (Portfolio, Discovery, Decisions, Capital Impact, Lifecycle, Allocation) |
| Asset List | `/assets` | — | Built — search, filter, sort by cost/value/ROI |
| Asset Detail | `/assets/[id]` | Screen 2 (Financial Profile) | Built — cost breakdown donut, consumer map, value declaration, SLA, dependencies |
| Candidate List | `/candidates` | — | Built — confidence scoring, est. cost column, promote/ignore actions |
| Candidate Detail | `/candidates/[id]` | — | Built — evidence breakdown, member assets, promote/retire action bar |
| Decisions | `/decisions` | — | Built — approve/reject/delay workflow, cumulative savings tracker, Impact Accuracy KPI, impact validation status badges, projected vs actual comparison, "View" navigates to decision detail |
| Decision Detail | `/decisions/[id]` | — | Built — full audit trail, impact verification report (cost trend chart, narrative, confidence score), economic effects table (capital freed, cost saved), comments section, activity timeline, action buttons (approve/reject/delay) |
| Lifecycle | `/lifecycle` | Screen 4 (Lifecycle Health) | Built — stage distribution, retirement candidates, "Start Retirement Review" |
| Allocation | `/allocation` | — | Built — reallocation simulator, approve reallocation |
| Capital Impact | `/capital-impact` | — | Built — KPI row (6 cards), cumulative capital freed chart, capital by type, recent events |
| Capital Review | `/capital-review` | — | Built — 5 sections: Capital Overview (4 KPIs), CEI Score (6-component breakdown + trend), Decision Performance (top actions table), Portfolio Rebalance (quartile analysis), Governance Behavior (5 hygiene metrics) |
| Capital Projection | `/capital-projection` | — | Built — 36-month forward simulation: Scenario Comparison Table, ROI Drift Chart (3 lines), Liability Accumulation (stacked area), AI Exposure Risk (dual-axis), Decision Velocity Impact (3 KPIs) |
| AI Scorecard | `/ai-scorecard` | Screen 5 (AI Cost Attribution) | Built — risk table, radar charts, flag/kill buttons |
| Marketplace | `/marketplace` | — | Built — browse & subscribe to published products |
| Simulate | `/simulate` | Screen 3 (Pricing Simulator) | Built — pricing models, simulation results, "Activate as Policy" |
| Setup | `/setup` | — | Built — connector configuration onboarding |
| Home | `/` | — | Built — marketing landing page (hero, platform pillars, executive proof, differentiation, footer) with Deep Navy / Off White palette |

### 6.5 Key Workflows — End-to-End

**Discovery → Decision → Capital Impact (fully wired):**

1. **Discovery Inbox:** Connector ingests source assets → CandidateGenerator scores candidates across 4 evidence streams (Snowflake warehouse, dbt lineage, Power BI datasets, consumer overlap) → Candidates appear with confidence scores and estimated monthly cost
2. **Promote Winner:** Candidate with high confidence (e.g., 95%) → "Promote to Data Product" → Creates a new DataProduct with economics, owner, lifecycle stage
3. **Flag for Retirement:** Candidate with low confidence (e.g., 25%) → "Start Retirement Review" → Creates Decision(type=retirement) with estimated savings
4. **Decision Workflow:** Decision moves through `under_review` → `approved` / `rejected` / `delayed` → Approval triggers: product retired, CapitalEvent created, savings logged
5. **Capital Impact Dashboard:** Aggregates all CapitalEvents, shows total capital freed, ROI delta, decisions executed, cumulative savings over time

**Pricing Activation (fully wired):**
- Simulate page → run pricing model → "Activate as Policy" → creates PricingPolicy(active) + Decision + CapitalEvent

**AI Kill Switch (fully wired):**
- AI Scorecard page → 5-dimension scoring → "Flag for Review" → creates Decision → "Kill Project" → retires product, creates CapitalEvent(ai_spend_reduced)

**Capital Governance Mode (fully wired):**

1. **Decision Impact Verification:** After any decision is approved, a 60-day validation window starts automatically. The engine computes actual_savings_measured vs projected, variance, and confidence score (0-100). Status progresses: `pending` → `validating` → `confirmed` (≥80% realized) or `underperforming` (<50%). Endpoint: `GET /decisions/{id}/impact-report` returns projected vs actual, cost trend graph, variance %, confidence, and narrative summary.
2. **Capital Allocation Engine:** `GET /allocation/portfolio-rebalance` computes bottom/top quartile ROI products, capital concentration index, and simulates the effect of moving 20% of bottom-quartile spend to top-quartile. Returns current vs projected blended ROI and efficiency delta.
3. **Enforcement Triggers:** `POST /enforcement/run-sweep` scans all products against 3 automated rules: (a) ROI < 0.5x for 3 consecutive months → auto-creates `low_roi_review` decision, (b) usage decay > 60% sustained 90 days → auto-creates `retirement` decision, (c) cost spike > 40% MoM → auto-creates `cost_investigation` decision. Each trigger creates decision + notification + audit log. Duplicate prevention ensures no product gets flagged twice.
4. **Capital Efficiency Score:** `GET /capital-efficiency/` computes org-level KPI (0-100) from 6 configurable-weight components: ROI coverage (% products with ROI > 1), action rate (% retirements actioned), savings accuracy (projected vs actual variance), capital freed ratio (freed / total spend), value governance (% products with current value declarations), and AI exposure (% spend in well-governed products). Weights are stored in `policy_configs` and sum to 100. Includes trend and benchmark comparison.
5. **Capital Behavior Metrics:** `GET /capital-behavior/` computes 5 governance hygiene indicators from existing tables: avg decision velocity (days), value declaration coverage (%), review overdue rate (%), enforcement trigger rate (%), and impact confirmation rate (%). Returns a composite governance health score (0-100).
5. **Board Capital Summary:** `GET /board/capital-summary` returns structured JSON for executive slide export: total capital freed, confirmed vs projected savings, underperforming decisions, portfolio ROI delta, capital efficiency score, top 5 capital actions this quarter.

**Capital Drift & Liability Projection (fully wired):**

1. **Snapshot Collection:** `GET /capital-projection/` queries 10+ tables to build current-state snapshot (total cost, value, ROI, AI spend, decline metrics, decision velocity, value coverage, enforcement rate, retirement backlog, CEI score, pricing revenue, capital freed).
2. **36-Month Simulation:** Three deterministic scenarios using module-level constants (no randomness): Passive (unchecked growth), Governance (retirements + optimizations at current velocity), Active Capital (full governance + AI kills + pricing + reallocation).
3. **Derived Metrics:** Capital liability = cumulative cost delta (passive vs active). Missed capital freed = capital freed delta. Drift deltas at 12/24/36 month marks.
4. **Frontend Visualization:** 5 sections — Scenario Comparison Table, ROI Drift Chart (3-line divergence), Liability Accumulation (stacked area with 4 liability components), AI Exposure Risk (dual-axis: spend vs governance), Decision Velocity Impact (3 KPIs). Institutional voice throughout.

### 6.6 Seeder & Demo Data

**Backend seeder** (`apps/api/app/seed/multinational_seeder.py`) provisions:
- 1 organization (Apex Global Group) with 8 business units and 25+ teams
- 15 demo users across 15 RBAC roles
- 280 data products with full economics (cost breakdowns, value declarations, quality scores, consumers, dependencies) — ~$9.5M monthly spend
- 6 months of time-series data (cost, usage, ROI, portfolio monthly)
- 20+ product candidates (from DiscoveryReplayConnector)
- 3 mock connectors (Snowflake, Databricks, Custom)
- Decisions, capital events, pricing policies, AI scorecards, notifications, benchmarks

**Demo data packs** (`infra/demo-data/`) for connector replay:
- Snowflake warehouse metadata
- Databricks Unity Catalog metadata
- dbt manifest + run results
- Power BI workspace metadata

**Frontend seed** (`apps/web/src/lib/mock-data/seed.ts`) mirrors backend data for offline demo mode. Includes `orgInfo` (org name, team/user/role counts, value weights) for sidebar and setup page fallback.

### 6.7 Component Library — 40+ Components

**Design system** built on shadcn/ui + Tailwind:
- **UI primitives:** Button, Card, Badge, Dialog, Dropdown, Input, Select, Table, Tabs, Tooltip, ScrollArea, Avatar, Progress, Command
- **Shared domain components:** PageShell, KPICard, LifecyclePill, CoverageBar, InsightCallout, EmptyState, ConfidenceIndicator, DecisionStatusBadge, SectionHeader, Toast
- **Auth components:** PermissionGuard (route-level), RequirePermission / RequireAnyPermission (component-level)
- **Charts:** BCGMatrix, CostValueTrend, CostBreakdownDonut, UsageTrendChart
- **Layout:** Sidebar (RBAC-filtered navigation), Topbar (user menu)

### 6.8 Auth & Security

**Backend enforcement:**
- JWT access tokens (configurable expiry, default 15 min)
- Refresh token rotation with hashed storage (bcrypt), max 5 per user
- Rate limiting on auth endpoints (10 req/min login, 5 req/min register)
- Secure cookie flags (SameSite=Strict, Secure on HTTPS)
- `require_permission()` decorator on every API endpoint (50 RBAC tests verify this)
- 15 roles with 32 granular permissions (e.g., `decisions:approve`, `ai:kill_execute`, `pricing:activate`)
- Org-level data isolation
- Audit logging of all state-changing actions

**Frontend enforcement (four layers):**
- **Layer 1 — Sidebar filtering:** Nav items filtered by `ROUTE_PERMISSIONS` mapping — users only see routes their role can access (`lib/auth/permissions.ts`, `components/layout/sidebar.tsx`)
- **Layer 2 — Route-level guard:** `<PermissionGuard>` in dashboard layout intercepts navigation to restricted routes, shows "Access Restricted" screen with role name, missing permission, and redirect button (`components/auth/permission-guard.tsx`)
- **Layer 3 — Component-level visibility:** Action buttons (Approve, Reject, Delay, Flag, Kill, Promote, Activate) hidden for users without the required permission using `hasPermission()` hook from `useAuth()` context
- **Layer 4 — Mutation gating (`canMutate`):** All write-action buttons are disabled when the API is unavailable (`NEXT_PUBLIC_API_URL` not set). Buttons show `title="API unavailable in offline demo mode"`. No mutation ever silently falls back to local simulation — every API error surfaces a toast notification. See `lib/api/client.ts` for the `canMutate` constant and `useMutation<T>` hook.
- **Layer 5 — Configurable thresholds (`useDisplayConfig`):** All UI classification thresholds (ROI bands, trust score bands, confidence score bands, AI risk score bands, pricing simulation defaults, team budget threshold) are sourced from the `/display-config/` API endpoint. Every threshold falls back to a seed value when the API is unavailable. Zero inline magic numbers in page components.
- **Toast notifications:** All actions surface success/error feedback via lightweight toast system (`components/shared/toast.tsx`). Zero silent catch blocks — every mutation path uses `toastError(msg)` on failure.
- **Edge proxy:** `proxy.ts` checks `dao_session` cookie and redirects unauthenticated users to `/login`
- **403 error handling:** API client surfaces "Permission denied" errors to users via toast notifications

---

## 7. WHAT REMAINS — PIPELINE

### 7.1 Not Yet Built (from original roadmap)

These features from the original vision have **not** been implemented:

| Feature | Original Phase | Notes |
|---|---|---|
| **Real connector integrations** (live Snowflake/Databricks API calls) | Phase 1 | Framework exists (DiscoveryReplayConnector), but connectors replay demo data — no live infrastructure API calls |
| **Automated cost ingestion** from billing APIs | Phase 1 | Cost data is seeded, not pulled from real billing systems |
| **Query log ingestion** (who queries what) | Phase 2 | Usage data is seeded, not sourced from real query logs |
| **Value Declaration workflow** (peer review, CFO sign-off, periodic re-validation) | Phase 2 | Value declarations exist as data objects but the multi-step review workflow (peer review → CFO acknowledgment → 6-month re-validation) is not implemented |
| **AI Copilot** (natural language queries) | Phase 3 | Not built — no LLM integration |
| **Cost anomaly alerting** (automated detection + notifications) | Phase 3 | Notification model exists, but automated anomaly detection logic is not implemented |
| **Subscription management** (formal subscribe/unsubscribe with cost implications) | Phase 4 | MarketplaceSubscription model exists, basic subscribe endpoint exists, but team-level cost attribution on subscribe is not wired |
| **Chargeback reports** (per-team cost allocation exportable to finance) | Phase 4 | Pricing simulation runs, policies can be activated, but no export-to-finance integration |
| **External API** for integrating signals into Slack/Jira | Phase 4 | Not built |
| **Command bar** (Cmd+K search) | UX | Not built |
| **Context switcher** (Org/BU/Team scope) | UX | RBAC controls role-based visibility (15 roles, sidebar filtering, route guard), but no dynamic BU/Team scope switcher in the UI |
| **PDF export** for board presentations | UX | Not built |

### 7.2 Partially Built

| Feature | What Exists | What's Missing |
|---|---|---|
| **Connector framework** | DiscoveryReplayConnector replays demo data packs; connector CRUD + test + run endpoints | Live API adapters for Snowflake, Databricks, dbt Cloud, Power BI |
| **Lifecycle engine** | Stage distribution visible, retirement review creates decisions | Automated stage transitions based on usage decay thresholds (currently manual) |
| **Marketplace** | Browse published products, subscribe/unsubscribe wired to `POST /marketplace/subscribe` with toast feedback | No cost-per-subscription, no SLA contracts, no team-level chargeback |
| **Notifications** | Model + list endpoint + seeded data | No real-time delivery (email, Slack), no automated trigger rules |
| **Benchmarks** | Model + endpoint + seeded industry data | No cross-customer anonymous benchmarking (network effect) |

### 7.3 Planned Next

Remaining work to complete the capital governance validation loop:

- **Cron/scheduler for enforcement sweep** — currently manual via `POST /enforcement/run-sweep`, needs automated periodic execution
- **Cron/scheduler for validation sweep** — currently manual via `POST /decisions/run-validation-sweep`, needs daily automated execution
- **Impact report detail UI** — display projected vs actual savings, cost trend chart, confidence score, and narrative summary on a dedicated decision detail page (inline impact status badges now appear on the Decisions page)
- **Board export UI** — render `/board/capital-summary` JSON as printable slide/PDF

### 7.4 Future Roadmap (Beyond Current Plan)

**Near-term (next to build):**
- Live Snowflake connector (billing API + query log ingestion)
- Automated lifecycle stage transitions (usage decay → decline → retirement flag)
- Value declaration review workflow (peer review + expiry)
- Email/webhook notifications on capital events and retirement triggers

**Medium-term:**
- Databricks live connector
- dbt Cloud connector
- Multi-org support
- Chargeback export to ERP/finance tools

**Long-term:**
- AI Copilot (LLM-powered natural language queries over economic data)
- Cross-customer benchmarking (anonymous, aggregate)
- External marketplace features
- Real-time streaming cost attribution

---

## 8. 12-MONTH MVP ROADMAP (Original Vision)

*The phases below represent the original product roadmap. See Section 6 for current implementation status and Section 7 for remaining pipeline items.*

### Phase 1: Foundation (Months 1-3) — "See the Cost"

**Build:**
- Snowflake cost connector (automated cost ingestion per query, per table, per warehouse)
- dbt metadata connector (model lineage, run costs)
- Data product registry (manual creation, owner assignment, basic metadata)
- Cost dashboard: Per-product cost breakdown, trend, anomaly detection
- Basic portfolio view: All products, sorted/filtered by cost

**Why this first:** Cost visibility is the universal pain point. Every CDO can sell "I can show you where your $4M is going" to their CFO. This is the wedge.

**Do NOT build:**
- Value declarations (too early — users need cost context first)
- Internal marketplace (requires critical mass of products)
- AI attribution (too advanced for v1 users)
- Chargeback/pricing simulation (need usage data first)
- Automated lifecycle management (need history first)

### Phase 2: Usage & Value (Months 4-6) — "See the Demand"

**Build:**
- Snowflake query log ingestion (who queries what, how often)
- Consumer mapping: Teams and users mapped to data products
- Usage dashboard: Per-product consumers, frequency, trends
- Value Declaration module: Structured form for business stakeholders to declare value
- Basic ROI computation: Declared value / TCO
- Product Financial Profile page (Screen 2)

**Why this second:** Now you have both sides of the equation — cost AND value. ROI becomes computable. CDOs can have the "is this worth it?" conversation with evidence.

### Phase 3: Intelligence (Months 7-9) — "Act on Insights"

**Build:**
- Lifecycle engine: Automated stage assignment based on usage + cost trends
- Retirement detection: Flag candidates, trigger review workflows
- Lifecycle Health View (Screen 4)
- Cost anomaly alerts and notifications
- AI Copilot v1: Natural language queries across all economic data ("What are my most expensive products with declining usage?")
- Databricks connector (second platform)
- Executive Portfolio Dashboard (Screen 1) with BCG matrix

**Why this third:** With 6+ months of cost and usage data, the system can now generate intelligence. Lifecycle management becomes data-driven. The product shifts from "reporting" to "recommending."

### Phase 4: Platform (Months 10-12) — "Change Behavior"

**Build:**
- Internal Pricing Simulator (Screen 3)
- Subscription management: Teams can formally subscribe/unsubscribe from data products
- Basic chargeback reports: Per-team cost allocation exportable to finance systems
- AI Cost Attribution View (Screen 5)
- API for integrating economic signals into existing tools (Slack alerts, Jira tickets)
- Role-based views (CFO sees portfolio, Product Owner sees their P&L, Consumer sees their usage)

**Why this last:** Behavioral change (chargeback, subscriptions, retirement) requires trust in the data. After 9 months of accurate cost and usage tracking, the system has earned the right to influence behavior.

### What Must NOT Be Built in Year 1

- Full ERP integration (SAP, Oracle chargeback connectors) — too slow, too custom
- External data marketplace features — different product entirely
- Data quality management — other tools do this; integrate, don't rebuild
- ETL/pipeline building — infrastructure, not financial OS
- Access control / permissions management — Unity Catalog / Collibra territory
- Custom ML models for value prediction — premature, need 2+ years of data

---

## 9. UX PRINCIPLES

### 9.1 Financial Clarity
Every screen answers a financial question. "What does this cost?" "What is it worth?" "Should we invest or divest?" No screen exists purely for technical metadata.

### 9.2 Zero Technical Jargon for Executives
The CFO never sees "table," "schema," "pipeline," "DAG," or "warehouse." They see "data product," "cost," "value," "consumers," and "return." Technical details exist but are progressive-disclosure — only visible when a technical user drills in.

### 9.3 Visual Asset Portfolio Model
Data products are visualized as a financial portfolio throughout. BCG matrix, stage distributions, investment bands. The entire mental model is borrowed from asset management, not IT service management.

### 9.4 Investment vs. Return Framing
Every cost display is accompanied by a value display. The system never shows cost in isolation — that creates fear. It always shows cost *in context of return* — that creates clarity.

### 9.5 AI Assistant Embedded Everywhere
The AI Copilot is not a chatbot page. It is a contextual panel available on every screen. On the Portfolio Dashboard, it suggests investment moves. On the Product Profile, it explains cost anomalies. On the Lifecycle View, it recommends retirements. It speaks in CFO language, not SQL.

### 9.6 Progressive Disclosure
- **Level 1 (CFO):** Portfolio metrics, ROI bands, investment recommendations
- **Level 2 (CDO):** Lifecycle stages, retirement candidates, cost trends per BU
- **Level 3 (Product Owner):** Full cost breakdown, consumer details, SLA metrics
- **Level 4 (Engineer):** Query-level cost, pipeline run details, infrastructure attribution

### 9.7 Action-Oriented Design
Every insight has a corresponding action button. "23 retirement candidates" has [Start Retirement Review]. "Cost spike detected" has [Investigate]. "Value declaration expiring" has [Renew]. The product doesn't just inform — it drives decisions.

---

## 10. WHAT MAKES THIS VENTURE-SCALE

1. **Universal wedge:** Every enterprise with a data platform has the cost visibility problem. TAM is every Snowflake, Databricks, and cloud data warehouse customer — tens of thousands of enterprises.

2. **Land with CDO, expand to CFO:** The CDO buys it to justify their budget. The CFO adopts it to manage data as a capital line item. This creates executive-level entrenchment.

3. **Data flywheel:** The more data products registered, the better the benchmarks ("Your Customer 360 costs 2.3x the industry median"). Cross-company benchmarks become a network-effect moat.

4. **Platform expansion:** Internal marketplace with subscriptions, chargeback integration with ERP, and API-driven economic signals create deep integration and switching costs.

5. **AI tailwind:** Every enterprise is suddenly spending 5-10x more on data for AI/ML. The "what does my AI actually cost?" question is urgent and unanswered. Strata is the only product positioned to answer it.

6. **Pricing power:** Value-based pricing tied to data spend under management. If you manage $10M in data costs, you pay $100K/year. As data spend grows, so does the product's revenue.

---

## 11. WHAT MAKES THIS FAIL

1. **Integration hell:** If connectors to Snowflake, Databricks, dbt, etc. are brittle or require heavy setup, enterprises won't adopt. The first 10 minutes must show value. If deployment takes 6 weeks, it's dead.

2. **Cost-only trap:** If the product only shows cost without value, it becomes "the tool that makes everyone feel bad about data spending." CDOs will hate it. Value declarations must be simple and rewarding to create.

3. **CFO doesn't care:** If the product looks like a technical dashboard, the CFO will never log in. The design must be obsessively financial and executive-grade from day one. One "schema" or "pipeline" on the CFO view and you've lost them.

4. **Chicken-and-egg on value:** Value declarations require business stakeholders to participate. If they don't, ROI can't be computed, and the product is just a cost tracker. The product must make value declaration effortless and incentivized (gamification, recognition, portfolio performance scores).

5. **Category confusion:** If the market thinks this is "another data catalog," it's dead on arrival. Positioning must be aggressively financial: "The P&L for your data capital." Never "data governance." Never "data management."

6. **Single-platform lock-in:** If v1 only works with Snowflake, enterprises with multi-platform environments (Snowflake + Databricks + Fabric) will see it as limited. Multi-platform support by month 9 is essential.

7. **No behavioral change:** If the product generates reports that nobody acts on, it becomes shelfware. The lifecycle engine, retirement workflows, and chargeback simulation must create measurable behavioral change within 6 months of adoption. Success metric: "How many data products were retired and how much was saved?"

---

## 12. SUCCESS METRICS (Internal Product KPIs)

| Metric | Target (Year 1) |
|---|---|
| Time to first cost insight | < 30 minutes from connector setup |
| Data products registered per customer | > 50 in first 90 days |
| Value declarations created | > 30% of products have declarations by month 6 |
| Executive dashboard weekly active users | > 3 C-level users per customer |
| Retirement savings identified | > $200K per customer per year |
| Net Revenue Retention | > 130% (expansion through more products, more BUs) |
| Integration setup time | < 2 hours for Snowflake, < 4 hours for multi-platform |

---

*Strata: Making data capital visible, accountable, and investable.*
