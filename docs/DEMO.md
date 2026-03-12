# Strata — 3-Minute Board Demo Script

> A fast-paced walkthrough designed for CFOs, CDOs, and Data Product Owners.
> Works entirely in demo mode (no backend required).
> Every number is traceable, reconciled, and consistent across all surfaces.

---

## Pre-flight Checklist

```bash
# Start the app in demo mode (no API URL)
npm run dev
# Open http://localhost:3000
```

Ensure:
- No `NEXT_PUBLIC_API_URL` is set (amber "Demo Mode" banner should appear)
- Browser window at 1440×900 or larger for best presentation
- Verify data coherence: open `/demo/qa` — all reconciliation rules should show green

### Data Coherence Verification

Before every board demo, visit `/demo/qa` to confirm:
- All reconciliation rules pass (green badges)
- Cross-surface values match (ROI, Capital Freed, CEI are identical everywhere)
- Product integrity audit shows 100% pass rate

---

## Act 1: "Where does our data money go?" (60 seconds)

**Page: Portfolio** (`/portfolio`)

1. **Land on Portfolio** — point out the KPI row:
   - **$443K/mo** total portfolio spend ($5.3M/yr)
   - **Portfolio ROI** — cost-weighted across 41 data products
   - **Capital Freed** — realized monthly savings from governance actions
   - **41 products** across Snowflake, Databricks, S3, Power BI

2. **Scroll down** — highlight the portfolio distribution:
   - "These are our 41 data products. Color = lifecycle stage. Size = cost."
   - Point out the biggest spender: **Real-Time Clickstream** at $32K/mo
   - Point out the compliance outlier: **Regulatory Compliance Feed** — low cost, extreme ROI

3. **Click into Customer 360** (or any product) — lands on Asset Detail:
   - "Every product has a cost, a declared value, an ROI, and a trust score."
   - Point at the Cost Breakdown donut
   - Point at the Value Declaration card — "peer-reviewed and CFO-acknowledged"

**Key message**: *"We know exactly what we spend and what we get back — for every product."*

---

## Act 2: "What should we do about it?" (60 seconds)

**Page: Decisions** (`/decisions`)

1. **Navigate to Decisions** (sidebar → Govern → Decisions):
   - "This is the capital decision queue. 16 decisions — retirements, cost investigations, AI reviews, value revalidations."
   - Point at pending vs. approved counts in KPI row

2. **Click a pending decision** — show the decision detail:
   - Impact estimate (monthly and annualized savings)
   - Approval workflow status
   - Impact validation status (confirmed / validating / pending)

3. **Highlight anchor narratives**:
   - **AI Feature Store** (dec-014): "AI governance caught $3.2K/mo in unused feature tables"
   - **Real-Time Clickstream** (dec-013): "Cost spike alert found $4.8K/mo in over-provisioned nodes"
   - **Legacy HR Data Extract** (dec-012): "Usage collapsed to 8 users — retirement under review"

4. **Navigate to Lifecycle** (sidebar → Govern → Lifecycle):
   - "Lifecycle shows which products need attention — cost spikes, declining usage, stalled products."
   - Point at the Retirement Candidates section
   - Point at Cost Spikes section (Real-Time Clickstream, API Usage Analytics)

**Key message**: *"Every dollar decision has a workflow, an owner, and a projected impact."*

---

## Act 3: "How much have we saved?" (60 seconds)

**Page: Capital Impact** (`/capital-impact`)

1. **Navigate to Capital Impact** (sidebar → Optimize → Capital Impact):
   - "**$29.9K/mo freed** — that's $359K annualized from 6 capital events."
   - Point at the cumulative capital freed chart — "Growing every month"
   - Point at the 6-month projection — "$180K in 6 months if run-rate continues"
   - Capital by type: retirement_freed + cost_optimization

2. **Navigate to Capital Review** (sidebar → Measure → Capital Review):
   - "Capital Efficiency Index — a single number (0-100) that summarizes our data governance maturity."
   - Point at the CEI score and 6-component breakdown
   - "ROI coverage, action rate, savings accuracy, capital freed ratio, value governance, AI exposure"

3. **Toggle Explainability Mode** (top bar → beaker icon):
   - "Every KPI has a provenance drawer — click the beaker to see the canonical formula, source systems, and reconciliation rules."
   - Click a KPI provenance button → MetricProvenanceDrawer opens
   - "This is how we prove every number. No black boxes."

4. **Navigate to Simulate** (sidebar → Optimize → Simulate):
   - "Before we charge teams for data, we model the behavioral impact."
   - Click **Run Simulation** — show the team impact table

**Key message**: *"We don't just cut costs — we track, verify, and project every dollar."*

---

## Closing Points

| Persona | What they saw | What they care about |
|---------|--------------|---------------------|
| **CFO** | $30K/mo freed, ROI delta, 6-month projection, 41 products | "Is data spend under control?" |
| **CDO** | CEI score, governance health, explainability, compliance feed | "Are we governing data like a portfolio?" |
| **Data Product Owner** | Asset profile, cost breakdown, consumer map, provenance | "How is my product performing?" |

---

## Credibility Notes

These details help when a board member asks "Is this real?":

- **41 data products** across 4 platforms (Snowflake, Databricks, S3, Power BI)
- **$443K/mo portfolio** ($5.3M annualized) — realistic for mid-to-large enterprise
- **Cost-weighted ROI** — not a simple average; expensive products weigh more
- **6 capital events** totaling $29.9K/mo saved — each traceable to a specific decision
- **CEI score** computed from 6 components with documented formulas
- **Every KPI has provenance** — canonical formula, source systems, automation coverage
- **All numbers reconcile** — visit `/demo/qa` to verify in real-time
- **DATA_COHERENCE_CONTRACT.md** documents every formula and reconciliation rule

---

## Demo Mode Notes

- The amber banner at the top confirms demo mode is active
- All buttons that require an API are disabled with tooltip: *"API unavailable in offline demo mode"*
- Coming-soon features show a warning toast instead of doing nothing
- All data is seeded from `src/lib/mock-data/seed.ts` — no network calls
- Use **⌘K** (Cmd+K) to search across pages, assets, and decisions
- Toggle **Explainability Mode** (beaker icon) to reveal metric provenance on all KPIs
- Visit `/demo/qa` for the hidden coherence verification dashboard

---

## Bonus: Command Palette

Press **⌘K** at any point to demonstrate global search:
- Type "Customer" → shows Customer 360 asset
- Type "Retire" → shows retirement decisions
- Type "Portfolio" → navigates to Portfolio page
- Type "AI Feature" → shows AI Feature Store asset

This works on every page, every time.

---

## Anchor Narratives — Walkthrough Stories

Use these product stories when drilling into specific assets during Q&A:

| Product | Story | Key Numbers |
|---------|-------|-------------|
| **Customer 360** | Flagship product. Highest consumer count. Revenue attribution validated. | $18.4K/mo, 340 users, 3.2x ROI |
| **AI Feature Store** | Core ML platform. AI governance review found savings. | $28.5K/mo, 85 users, 3.1x ROI |
| **Regulatory Compliance Feed** | Must-have for compliance. Extreme ROI from penalty avoidance. | $9.8K/mo, 42 users, 13.6x ROI |
| **Real-Time Clickstream** | Cost spike alert. Streaming costs under investigation. | $32.4K/mo, 120 users, 2.0x ROI |
| **Legacy HR Data Extract** | Usage collapsed. Retirement under review. | $11.6K/mo, 8 users, 0.12x ROI |
| **Executive Dashboard Feed** | Low cost, high visibility. CFO uses daily. | $4.2K/mo, 28 users, 8.8x ROI |
| **ESG Metrics Platform** | Just onboarded. No value declaration yet. | $7.5K/mo, 15 users, draft stage |
