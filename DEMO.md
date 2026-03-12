# Strata — Demo Script

> **Apex Global Group** — a 120K-employee financial services multinational with 7 divisions, 65 business units, 220 teams across 9 regions. 280 data products, ~$9.5M monthly data spend.

---

## Prerequisites

```bash
# Start everything (first time: builds containers)
docker compose up --build

# Wait for healthy output:
#   api-1  | INFO: Uvicorn running on http://0.0.0.0:8000
#   web-1  | Ready on http://localhost:3000
```

Open **http://localhost:3000** in your browser. Login credentials: all users use password `demo123`.

---

## Act 1 — Enterprise Portfolio at Scale (2 min)

**Login:** Pick the **CFO** persona (`cfo@apex.demo` / `demo123`).

**Navigate:** You land on the **Portfolio** page.

**What to notice:**
- **280 data products** across Snowflake and Databricks — this is a real enterprise portfolio, not a toy dataset
- ~$9.5M monthly spend, ~2.7x average ROI, ~12,000 consumers
- Lifecycle distribution spans all stages: draft, active, growth, mature, decline
- Cost-value trend chart over 6 months shows portfolio health trajectory
- Products span 7 divisions: Global Markets, Retail Banking, Wealth Management, Insurance, Technology & Operations, Risk & Compliance, Corporate Functions

> "This is the financial operating system for a $9.5 million monthly data portfolio. Every product has a cost, a declared value, and a measured ROI — across 7 divisions and 9 regions."

---

## Act 2 — The Flagship: Customer 360 (1 min)

**Navigate:** Click into **Customer 360 Platform** (Retail Banking division).

**What to notice:**
- **$82K/mo cost, $310K/mo value, 3.8x ROI** — the flagship product
- 1,240 consumers across 18 teams, trust score 0.97
- Cost trend shows a historical spike (resolved via cost investigation)
- Pricing policy activated — generating usage-based revenue
- 3 value declaration versions showing value growth over time

> "Customer 360 is the crown jewel — 3.8x ROI, 1,240 consumers, pricing policy active. It went through a cost investigation and came out stronger."

---

## Act 3 — The AI-Heavy Spender (1 min)

**Navigate:** Go back to Portfolio. Click into **Global Demand Forecast** (Global Markets division).

**What to notice:**
- **$145K/mo cost, $520K/mo value, 3.6x ROI** — AI/ML intensive
- 380 consumers, runs on Databricks
- Cost investigation currently **under review** — model retraining caused a spike
- AI Scorecard flags it as **medium risk** due to high compute cost
- Feeds 8 downstream products — killing it would cascade

> "This is the most expensive AI product. It delivers $520K in value but has an active cost investigation. The AI Scorecard flagged it. The decision engine will determine its fate."

---

## Act 4 — The Retirement Candidate (1.5 min)

**Navigate:** Click into **Legacy CRM Extract** (Technology & Operations division).

**What to notice:**
- **$67K/mo cost, $8K/mo implied value, 0.12x ROI** — burning cash
- Consumers dropped from 890 to 12 — a 98.6% decline
- Trust score 0.58, lifecycle stage: Decline
- Retirement decision is **under review** with $67K/mo projected savings
- 3 remaining consumers need migration to Customer 360

> "Legacy CRM Extract costs $67K/month to serve 12 people. That is $5,583 per consumer. The retirement decision is under review — approving it frees $67K immediately."

---

## Act 5 — Decision Engine at Scale (1.5 min)

**Switch user:** Stay as **CFO**.

**Navigate:** Click **Decisions** in the sidebar.

**What to notice:**
- **45 decisions** across 8 types: retirement, cost investigation, value revalidation, low ROI review, pricing activation, AI project review, capital reallocation, portfolio change
- Mix of statuses: ~18 under review, ~15 approved, ~8 rejected, ~4 delayed
- Cumulative savings tracker aggregates all approved retirements
- Filter by type or status to focus the conversation

**Action:** Find the **Legacy CRM Extract retirement** decision. Click **Approve**. Confirm.

**Result:**
- Decision status changes to **Approved**
- Product moves to **Retired** lifecycle stage
- Capital event created (type: retirement_freed, $67K)
- Cumulative savings tracker updates

> "45 decisions in flight. One approval just freed $67K per month. The system logged the capital event, retired the product, and updated every metric. This is a financial decision engine, not a dashboard."

---

## Act 6 — Audit Trail Deep Dive (1 min)

**Navigate:** Click **View** on an approved decision (e.g., **Customer 360 cost investigation** or **Fraud Detection cost investigation**).

**What to notice:**
- Full audit trail: who created the decision, who commented, who approved, when
- **Impact verification report** — projected vs actual savings with validation status badges
- **Economic effects table** — capital freed and cost saved breakdowns
- **Comments section** — every stakeholder deliberation preserved
- KPI row: estimated vs actual impact, capital freed, annual savings, confidence score

> "Every dollar of capital freed traces back to a decision. Every decision traces back to evidence and deliberation. This is the audit trail a board needs."

---

## Act 7 — Capital Impact Dashboard (1 min)

**Navigate:** Click **Capital Impact** in the sidebar.

**What to notice:**
- ~$180K cumulative capital freed from approved retirements and optimizations
- Capital by type: retirement_freed, cost_optimization, reallocation, pricing_revenue, ai_spend_reduced
- 20 capital events in the audit trail
- Cumulative area chart shows savings growing month over month
- ROI delta shows how decisions improved portfolio returns

> "Every decision flows through to real financial metrics. The board sees $180K in capital freed — not just dashboards, but traced capital events."

---

## Act 8 — Capital Review: The Executive Layer (2 min)

**Navigate:** Click **Capital Review** in the sidebar.

**What to notice:**

**Section 1 — Capital Overview:** Total Capital Freed (monthly + annual), Confirmed vs Projected Savings, Portfolio ROI with delta, Capital Efficiency Score (55-70 range — room for improvement).

**Section 2 — Capital Efficiency Index:** CEI computed from 6 weighted components — ROI Coverage, Action Rate, Savings Accuracy, Capital Freed Ratio, Value Governance, AI Exposure. Each with a progress bar and explanation.

**Section 3 — Decision Performance:** Approved, Pending, Underperforming counts. Top capital actions table with validation status badges (Confirmed / Validating / Underperforming / Pending).

**Section 4 — Portfolio Rebalance:** Bottom quartile products consuming budget vs top quartile. The monthly movable amount and efficiency delta from rebalancing.

**Section 5 — Governance Behavior:** Health Score with 5 metrics — Decision Velocity, Value Coverage, Review Overdue Rate, Enforcement Rate, Impact Confirmed Rate.

> "The CEI tells you how efficiently capital is governed. Governance Behavior tells you if the org is following through. At 280 products, these scores matter — they show whether the portfolio is being actively managed or drifting."

---

## Act 9 — AI Risk Governance (1 min)

**Switch user:** Log in as **CDO** (`cdo@apex.demo` / `demo123`).

**Navigate:** Click **AI Scorecard** in the sidebar.

**What to notice:**
- **12 AI projects** scored on 5 dimensions (cost, value, confidence, ROI, dependency risk)
- 6 high-risk, 2 critical (flagged for review)
- 2 projects have been **killed** — approved kill decisions freed their capital
- Color-coded risk levels with **Flag for Review** and **Kill Project** actions

> "The AI Scorecard identifies projects burning cash without delivering value. Two have already been killed, freeing capital. Six more are flagged. This is how you govern AI spend at scale."

---

## Act 10 — Discovery at Enterprise Scale (1 min)

**Navigate:** Click **Candidates** in the sidebar.

**What to notice:**
- 8 product candidates discovered across multiple platforms
- Mix of types: Semantic Product, dbt Product, Usage Bundle, Certified Asset
- Confidence scores from 30% to 95% — multi-source evidence scoring
- Source asset counts, consumer counts, estimated costs

> "The system crawled Snowflake, Databricks, dbt, and Power BI across 9 regions and found 8 candidates. High-confidence candidates get promoted. Low-confidence candidates get flagged for retirement."

---

## Act 11 — RBAC at Scale (30 sec)

**Switch user:** Log in as **Consumer** (`consumer@apex.demo` / `demo123`).

**What to notice:**
- Sidebar shows only **Portfolio** and **Marketplace** — 50 users, 15 roles, 32 permissions
- Navigate to `/decisions` — "Access Restricted" with role name and missing permission
- Notification bell shows events relevant to the consumer role

> "50 personas, 15 roles, 32 permissions. The consumer sees the marketplace. The CFO sees capital decisions. The CDO manages lifecycle. Same API enforces it everywhere."

---

## Act 12 — Capital Pressure: The Cost of Inaction (2 min)

**Navigate:** Click **Capital Projection** in the sidebar.

**What to notice:**
- **KPI Row** — Current portfolio ROI (2.7x), $9.5M monthly spend, AI exposure ($185K), and projected 36-month passive liability
- **Scenario Comparison Table** — 12-month projection under Passive, Governance, and Active modes side by side with delta column
- **ROI Drift Chart** — 3 lines diverging over 36 months: passive erodes, governance holds, active improves
- **Liability Accumulation Chart** — Stacked area showing where liability accumulates (AI exposure, decline waste, missed retirements, governance erosion)
- **AI Exposure Risk** — AI spend growing 8%/month vs governance score eroding under passive management
- **Decision Velocity Impact** — Current 24-day velocity vs 14-day optimal, with ROI and capital freed delta

> "If we do nothing for 36 months, the portfolio accumulates millions in capital liability. Full active capital management closes it entirely. This is not a dashboard — it's a forcing function."

---

## Key Messages

1. **Enterprise scale.** 280 products, 7 divisions, 9 regions, $9.5M monthly spend. This is not a prototype — it is the operating system for a multinational data portfolio.

2. **6 anchor narratives.** Customer 360 (the flagship), Global Demand Forecast (the AI spender), Fraud Detection (the compliance mandate), Legacy CRM (the retirement candidate), Regulatory Reporting (the mandatory cost), Marketing Attribution (the growth star). Every narrative traces through discovery, decisions, capital impact, and governance.

3. **Decisions are financial.** 45 decisions across 8 types. Every approval creates a capital event. Every rejection has an audit trail. ~$180K freed in 6 months.

4. **The loop closes at scale.** Discovery feeds candidates, candidates become products or retirements, retirements free capital, capital impact is measured, governance scores track follow-through. At 280 products, this loop is the difference between managed and unmanaged.

5. **Deterministic and reproducible.** Every number is seeded from a single integer (42). Run the demo twice — same data, same narratives, same dollar amounts. No randomness during the presentation.

---

## Offline Demo Mode

The frontend can run **without** the backend API. When `NEXT_PUBLIC_API_URL` is not set (or the API is unreachable), the app operates in **offline demo mode**:

- **Read-only data** loads from built-in seed files (`lib/mock-data/seed.ts`) — all dashboards, charts, and tables render normally.
- **Mutation buttons are disabled** with the tooltip: *"API unavailable in offline demo mode"*. This applies to every action button across all screens (Subscribe, Approve, Reject, Promote, Flag, Kill, Activate, Ignore, etc.).
- **Toast notifications** fire on all API errors — the UI never silently swallows a failure.
- **Org metadata** (org name, team count, user count, role count) is sourced from the `/org-info/` API endpoint when available, and falls back to seed data when not.
- **Display thresholds** (ROI bands, trust score bands, confidence score bands, AI risk score bands, pricing defaults, budget cap) are sourced from the `/display-config/` API endpoint when available, and fall back to seed defaults when not. All color-coding and classification across 7 pages uses these configurable thresholds — zero hardcoded magic numbers.

> This means you can demo the full UI on a laptop with no Docker, no database, and no API — just `npm run dev`. Every workflow screen renders. Action buttons show as disabled with a clear explanation.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No candidates after "Run Discovery" | Check API logs: `docker compose logs api`. Ensure demo data mounted at `/demo-data`. |
| Login fails | API must be running on port 8000. Check `docker compose ps`. |
| "Loading..." forever | Check browser console for CORS errors. Verify `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`. |
| Candidate costs show $0 | Run Discovery again — cost events need to be ingested first. |
| Buttons missing on a page | Check your role — action buttons are permission-gated. Log in as `admin@demo.com` to see everything. |
| Buttons disabled ("API unavailable") | This is correct behavior in offline demo mode. Set `NEXT_PUBLIC_API_URL` and start the API to enable mutations. |
| "Access Restricted" screen | Your role lacks the permission for that route. Switch to a role with access or use admin. |
| Seeder slow on first run | First run creates ~280 products + time series. Target is < 2 min. If slower, check DB connection latency. |
| Only 13 products visible | Wipe the database volume (`docker compose down -v`) and restart to re-seed with the multinational dataset. |

## Local Development (without Docker)

```bash
# Terminal 1 — API
cd apps/api
pip install -e .
alembic upgrade head
python -m app.seed.multinational_seeder --seed 42
uvicorn app.main:app --reload

# Terminal 2 — Web
cd apps/web
npm install
npm run dev
```

API: http://localhost:8000 | Web: http://localhost:3000
