# Persona Strategy: The Deal Anatomy

> Strata is the financial operating system for enterprise data portfolios.
> This document defines who buys, who champions, who blocks, and who makes the product impossible to remove. Every persona is evaluated against one question: does this person accelerate or obstruct a $1B outcome?

---

## 1. Executive Summary

Three sentences define the deal:

1. **The CDO lands the pilot** because she needs to prove her data organization creates measurable financial value — and Strata is the only product that gives her a number to present to the board.
2. **The CFO closes the enterprise contract** because the board deck Strata generates is the first document that has ever quantified the ROI of the company's data spend — and the CFO cannot go back to not knowing.
3. **Product Owners make it permanent** because once 50 people manage their data products through Strata daily, the switching cost exceeds the contract value.

### The Revenue Equation

```
Land (CDO)  →  Bridge (Board Deck)  →  Close (CFO)  →  Expand (Product Owners)  →  Embed (System of Record)
$100-200K        1 meeting                $500K+          50-100 seats                Benchmarking network
```

### Why This Is a $1B Outcome

- **Category creation.** Data Capital Management does not exist as a recognized enterprise function. Strata defines it. The company that defines the category owns it for a decade.
- **System-of-record stickiness.** Once Strata becomes the place where data products are valued, decisions are approved, and capital is tracked, removing it requires rebuilding institutional memory. That does not happen.
- **Network effects.** Every customer's anonymized data contributes to industry benchmarks. "Your cost-per-query is 3x the median for companies your size." Each new customer makes the platform more valuable for every existing customer.
- **Expansion math.** A mid-market enterprise has 50-200 data products. A Fortune 500 has 500-2,000. At $100-500K/yr per deployment scaling with portfolio size, the TAM is measurable in tens of billions.

---

## 2. The Buying Committee

Enterprise deals involve a committee, not an individual. Every person in this table must be addressed or the deal stalls.

| Buying Role | Persona | Title | Primary Surface | Deal Phase | Permission Count |
|---|---|---|---|---|---|
| **Economic Buyer** | Sarah Chen | CFO | `/capital-impact` | Close | 14 |
| **Champion** | Priya Patel | CDO / Head of Data | `/portfolio` | Discovery → Close | 24 |
| **Day-1 User** | David Kim | Data Product Owner | `/assets` | Pilot → Retention | 13 |
| **Financial Validator** | Michael Torres | Senior FP&A Analyst | `/allocation` | Evaluation | 9 |
| **Emerging Champion** | Nina Volkov | Head of AI & ML | `/ai-scorecard` | Expansion | 12 |
| **Governance Validator** | Elena Rodriguez | Data Governance Lead | `/lifecycle` | Evaluation | 10 |
| **Infrastructure Validator** | Alex Murphy | Data Platform Engineer | `/setup` | POC | 13 |
| **Blocker / Accelerator** | James Whitfield | COO | `/portfolio` | Close | 11 |
| **Volume User** | Amanda Liu | Marketing Analyst | `/marketplace` | Retention | 5 |

**Reading this table:** The deal moves left to right. The CDO discovers Strata, runs a pilot with Product Owners, gets validated by FP&A and Governance, passes the board deck to the CFO, the CFO signs. Post-close, Product Owners and Business Consumers drive adoption that guarantees renewal and expansion.

---

## 3. Tier 1 — Deal Makers

These are the three personas without whom there is no deal, no expansion, and no retention. The product exists for them. Everything else is scaffolding.

---

### 3a. Sarah Chen — CFO (Economic Buyer)

#### Who She Is

Reports to the CEO and the Board. Her week is consumed by budget planning, variance analysis, board preparation, and cost containment reviews. She does not log into data tools. She reads reports. She approves budgets. She kills spend that cannot be justified.

She has a team of FP&A analysts who build financial models. She has never heard of a "data catalog" and does not care about metadata governance. She cares about one thing: is spend under control and generating returns.

**What keeps her up at night:** "We are spending $15M a year on data infrastructure and I have no idea if it is working. The board is going to ask me about AI spend next quarter and I have nothing to show them."

#### What She Values

Not features. Outcomes.

- **A dollar figure for waste.** Not a percentage, not a score. A dollar amount she can put in a board slide.
- **Proof of trajectory.** Are things getting better or worse? Show her a 6-month trend line.
- **A document she can hand to the board without editing.** She does not have time to build slides. The export must look like it came from a $500/hour consultant.
- **Decision authority.** When someone proposes retiring a $140K/yr data product, she wants to approve or reject it with a single click and see the impact tracked.

#### Actions and Flows in Strata

Sarah's journey through Strata follows the financial narrative:

1. **Home: `/capital-impact`** — Her default landing page. She sees capital freed, cumulative savings chart, budget reallocated, AI spend reduced, ROI delta. Six KPI cards with CFO-friendly tooltips explaining exactly what each metric means in financial terms. CSV export of capital events.

2. **Diagnosis: `/portfolio`** — The moment that sells Strata. She sees total monthly data capital spend alongside capital waste, a portfolio health score, and the cost of inaction. The BCG-style portfolio matrix shows products plotted by cost vs. value — several are in the wrong quadrant. The decision cockpit shows pending capital decisions requiring her approval.

3. **Board Export: `/portfolio/board-view`** — One-click generation of a board-ready report. Executive summary, portfolio KPIs, ROI trends, risk exposure, retirement savings, capital allocation by domain, methodology appendix. Printable. Institutional-grade. This is the artifact that travels from CDO to CFO to board.

4. **Decisions: `/decisions`** — Capital decision log. She has `decisions:approve` permission. She approves retirements, cost investigations, AI reviews, reallocations. Each decision has an estimated impact, an owner, and a timeline.

5. **Allocation: `/allocation`** — Portfolio rebalancing view. Pareto efficiency frontier, domain heatmap, industry benchmarks. She sees where capital is concentrated and where it should be reallocated.

6. **Projection: `/capital-projection`** — 36-month forward simulation. Three scenarios: passive (do nothing), governance (current pace), active (accelerated decisions). The gap between passive and active is the cost of inaction — a number she can put in a board slide.

7. **Governance Maturity: `/capital-review`** — Capital Efficiency Index with 6-component breakdown. She sees governance score, retirement velocity, value confidence, allocation efficiency, decision velocity, impact accuracy.

#### The Aha Moment

The `/portfolio` page diagnosis. She sees "$443K/mo total spend" alongside "Capital Misallocated" and "Cost of Inaction." The portfolio matrix shows 41% of products depreciating. Three data products cost more to maintain than the revenue decisions they support. She has never seen her data spend visualized this way.

This is not a dashboard. It is a diagnosis. She came in healthy and found out she has a disease. She cannot unsee it.

#### Deal Importance

**Economic Buyer.** She signs the contract. She controls the budget. Without her approval, no deal closes above $50K. But she does not discover Strata on her own — the CDO brings it to her. The board deck is the bridge.

#### Expansion Lever

After seeing the first quarter's Capital Impact report showing $360K in annualized savings, she does three things:

1. Asks the CDO to expand Strata to all business units
2. Mandates that all new data investments go through Strata's decision workflow
3. Includes Strata metrics in the CFO quarterly board deck

This is how a $100K pilot becomes a $500K enterprise contract. The CFO does not expand because she loves the product. She expands because the numbers are now in her board materials, and she cannot present incomplete numbers.

#### Why Now

AI spending is accelerating faster than any line item in enterprise history. Every CFO is being asked by their board: "How much are we spending on AI and data, and what are we getting for it?" The current answer is a shrug and a quarterly spreadsheet. Strata is the only product that gives them a real answer in financial language they already speak.

#### Risk If Ignored

No deal. Period. If the CFO cannot answer "what is our data ROI?" using Strata within 5 minutes of logging in, the product has failed its primary mission.

---

### 3b. Priya Patel — CDO / Head of Data (Champion)

#### Who She Is

Reports to the CEO or CTO. She manages the data organization — engineers, product owners, governance teams, 40-200 people. She is accountable for data strategy but has historically had no way to prove her team's ROI to the CFO. Her budget is always on the chopping block because finance sees her team as a cost center.

She is politically sophisticated. She needs tools that make her look good to the C-suite, not tools that give her more work. She has already deployed a data catalog (Collibra, Atlan, or Alation) and it has not solved the "prove your value" problem.

**What keeps her up at night:** "My team built 40 data products but I cannot prove any of them generate business value. My budget is about to get cut because the CFO sees us as a cost center, not a value creator."

#### What She Values

- **Proof that her data organization creates measurable financial value.** Not governance maturity scores or compliance checklists. Dollar amounts.
- **A governance framework that shows maturity to leadership.** The Capital Efficiency Index gives her a single score she can track quarterly and present to the board.
- **Board credibility.** She needs to walk into a board meeting and present like a CFO presents — with financials, not technology metrics.
- **Operational control.** She needs to see which products are healthy, which are declining, which need decisions, and who owns each action.

#### Actions and Flows in Strata

Priya has the broadest permission set of any non-admin role: 24 permissions across 11 domains. She can read, write, certify products, create and approve decisions, manage candidates, simulate and activate pricing, read capital data, and export reports.

1. **Home: `/portfolio`** — Her command center. Full portfolio view with BCG matrix, cost-value trends, ESE distribution, capital flow charts. The welcome banner guides first-time setup. Priority capital actions show the top 3 things that need her attention.

2. **Discovery: `/candidates`** — ML discovery inbox where new data product candidates are surfaced from connected platforms. She has `candidates:promote` and `candidates:ignore` permissions. She curates what enters the portfolio.

3. **Governance: `/lifecycle`** — Health monitoring dashboard. Retirement candidates with estimated savings, cost spikes with investigation triggers, stalled drafts with zero consumers, lifecycle transition timeline. She can start retirement reviews and cost investigations in bulk.

4. **Decisions: `/decisions`** — Capital decision log. She is the only non-admin persona with both `decisions:create` AND `decisions:approve`. She creates governance decisions and approves them — or escalates to the CFO for high-impact actions.

5. **AI Governance: `/ai-scorecard`** — AI project risk scoring. She has `ai:flag` and `ai:kill_approve` permissions. She can flag AI projects for review and approve kill-switch decisions (execution requires the Head of AI).

6. **Pricing: `/simulate`** — She has `pricing:activate` — the permission to enforce pricing policies, not just model them. Only the CDO and Admin have this authority.

#### The Aha Moment

Two moments, and both are required.

**Moment 1: The Diagnosis.** Same portfolio page as the CFO, but from the opposite angle. The CFO sees waste; the CDO sees proof of value. "Customer 360 has a 3.2x ROI and 340 consumers. My team built that. Revenue Analytics Hub generates $95K/mo in declared value against $24K in cost. That is a 3.9x return." For the first time, she has numbers to defend her team's existence.

**Moment 2: The Board Deck.** She generates a board-ready report from `/portfolio/board-view`, takes it to the board meeting, and the CFO says: "What tool made this? I want it connected to our actuals." That question is the bridge from CDO experiment to CFO mandate. It is the moment the deal closes.

#### Deal Importance

**Champion.** She fights internally for Strata. She runs the pilot. She presents to the CFO. She is the person who makes the initial purchase happen and then expands it. Without a strong CDO champion, the deal dies in procurement — no matter how good the product is.

The CDO is also the most fragile link. If she leaves the company or changes roles during the sales cycle, the deal resets to zero. The product must create enough organizational value that it survives her departure.

#### Expansion Lever

She is the primary expansion driver:

1. Starts with her team (5-10 Product Owners in one business unit)
2. Proves value in one quarter with the board deck
3. Expands to all business units (50-100 Product Owners)
4. Mandates Strata for all new data product onboarding
5. Makes the board view a quarterly ritual
6. Brings in Governance Stewards and FP&A as daily users

Every step drives seat expansion and deepens integration.

#### Why Now

CDOs are under unprecedented pressure. The "data mesh" and "data-as-a-product" movements created organizational structures and job titles but no financial accountability framework. The CDO has a team, a budget, and a mandate — but no tool that translates her team's work into the financial language the CFO and board understand. Strata is that tool.

#### Risk If Ignored

The deal stalls in pilot. The CDO is doing the day-to-day work of proving Strata's value. If the governance workflows (`/lifecycle`, `/decisions`, `/candidates`) are clunky, if the board view is not impressive enough, if the portfolio diagnosis does not generate the "I need this" reaction — she cannot build the internal case. The pilot expires. The contract does not renew.

---

### 3c. David Kim — Data Product Owner (Adoption Driver)

#### Who He Is

Reports to the CDO or a domain lead. He owns 3-5 data products. His job is to manage cost, value, consumer relationships, and lifecycle transitions for his products. He is a mid-level IC or team lead — not an executive. He logs into tools every day.

Today, he tracks his products in Confluence pages, Jira tickets, and spreadsheets. Nobody has ever given him a tool designed for data product management. He is the most underserved persona in the data ecosystem.

**What keeps him up at night:** "Am I going to get blamed when my product's cost spikes? Can I prove my product is valuable before the next budget review cuts my team?"

#### What She Values

- **Visibility into product performance.** Cost trends, consumer counts, ROI, trust scores — all in one place, not scattered across 5 tools.
- **The ability to declare and defend value.** A formal mechanism to say "this product generates $62K/mo in business value" and have that number show up in the CFO's portfolio view.
- **Early warning.** Cost spike alerts, usage decline notifications, lifecycle stage changes. He wants to know before his boss asks.
- **Agency.** The ability to propose decisions (cost investigations, retirement reviews) even if he cannot approve them. He wants to be proactive, not reactive.

#### Actions and Flows in Strata

1. **Home: `/assets`** — Master product registry. Search, filter by lifecycle stage, sort by cost/ROI/consumers/ESE score. CSV export of filtered products with 12 columns.

2. **Deep Dive: `/assets/[id]`** — The product profile, where he spends most of his time. Six tabs:
   - **Overview:** Description, business context, platform metadata
   - **Consumers:** Usage breakdown by team, adoption curve
   - **Economics:** Cost trend chart (6 months), value declaration form, depreciation schedule
   - **Lifecycle:** Stage transitions, historical events
   - **Data Sources:** Upstream lineage
   - **Lineage:** Downstream dependencies

3. **Discovery: `/candidates`** — Promote or ignore new data products discovered by the ML engine. He decides what enters the formal portfolio.

4. **Decisions: `/decisions`** — Creates cost investigations, value revalidations, retirement proposals. Has `decisions:create` but NOT `decisions:approve` — his proposals escalate to the CDO or CFO.

5. **Marketplace: `/marketplace`** — Browses and subscribes to other teams' data products. Has `marketplace:subscribe`.

6. **Pricing: `/simulate`** — Models pricing impacts before proposing changes. Has `pricing:simulate` but NOT `pricing:activate`. He can model but not enforce.

#### The Aha Moment

He opens `/assets/[id]` for his flagship product — Customer 360 — and sees, for the first time, the composite value next to the cost. The ROI is 3.2x. The consumer count is 340 across 8 departments. The lifecycle stage is "Growth" with an upward trend.

He has never had a single number that defends his product's existence. Now he does.

Alternatively: he sees his secondary product's usage trending down. The lifecycle stage shows "Decline." Before the CDO or CFO asks about it, he proactively creates a cost investigation decision. He looks responsible, not negligent.

#### Deal Importance

**Day-1 User.** He is not in the buying committee. He does not influence the purchase decision. But he IS the adoption metric. If 12 Product Owners are using Strata daily, the renewal is automatic — because removing Strata means removing the system they use to manage their products. If zero Product Owners are using it, the CDO cannot justify expansion and the contract does not renew.

Adoption is not a nice-to-have. It is the mechanism by which a pilot becomes an enterprise contract.

#### Expansion Lever

Seat expansion is the primary volume driver. Every data product in the enterprise should have an owner in Strata. If the company has 200 data products across 10 business units, that is 50-100 Product Owner seats. If it has 2,000, that is 500+.

The more products managed in Strata, the harder it is to rip out. This is the stickiness mechanism: not a technical integration, but an organizational dependency. Removing Strata means Product Owners lose their operating environment, value declarations disappear, and the CFO's board report goes blank.

#### Why Now

The "data-as-a-product" organizational model is being adopted widely. Companies are hiring Data Product Owners, Data Product Managers, and Domain Data Leads. But these people have no tooling designed for them. They use Confluence for documentation, Jira for governance tasks, spreadsheets for cost tracking, and Slack for consumer support. That is five tools doing what one should.

#### Risk If Ignored

Low adoption, high churn. The CDO bought Strata, but if Product Owners find it adds work without giving them value, they will not use it. Usage data goes stale. Value declarations expire. The portfolio view becomes inaccurate. The CFO stops trusting the numbers. The contract does not renew.

The Product Owner is where the value chain starts. If the bottom of the pyramid does not use the tool, the top of the pyramid sees bad data.

---

## 4. Tier 2 — Deal Accelerators

These personas do not make or break the deal, but they accelerate it, reduce procurement friction, or unlock expansion into new budget lines.

---

### 4a. Michael Torres — FP&A Analyst (Financial Validator)

#### Who He Is

Reports to the CFO. He is the analyst who builds financial models, validates vendor claims, and prepares the cost-benefit analysis that the CFO uses to approve purchases. He is detail-oriented, skeptical of vendor marketing, and will ask "how do you calculate this?" about every number on the screen.

**What keeps him up at night:** "Can I build a defensible model for data spend optimization? Will the CFO ask me a question about these numbers that I cannot answer?"

#### Actions in Strata

- **Home: `/allocation`** — Pareto efficiency frontier, domain heatmap, ROI-by-domain charts, reallocation simulator, industry benchmarks. This is his primary analytical workspace.
- **Modeling: `/simulate`** — Pricing scenario simulation: usage-based, cost-plus, tiered, flat, value-share. Has `pricing:simulate` but NOT `pricing:activate`.
- **Projection: `/capital-projection`** — 36-month forward modeling across three governance scenarios (passive, governance, active).
- **Tracking: `/capital-impact`** — Financial effects tracking with CSV export. Has `capital:export`.

#### The Aha Moment

The `/allocation` page's industry benchmarks show that the company's data spend allocation is 2x the industry median in one domain and 0.5x in another. He has never had benchmarking data for data infrastructure spend. This is the kind of insight that makes a financial analyst become an advocate.

#### Deal Importance

**Technical Evaluator (Financial).** He validates Strata's numbers against internal financial data. If the numbers do not reconcile, he kills the deal quietly by telling the CFO "the methodology is not sound." If they do reconcile, he becomes an advocate.

The `MetricProvenanceDrawer` (available on portfolio, capital-impact, and capital-review pages) and the `MethodologyAppendix` in the board view exist specifically for this persona. Every number must be traceable to its formula, its inputs, and its assumptions.

#### Risk If Ignored

The deal gets stuck in financial validation. The FP&A analyst asks "how do you calculate composite value?" and if the answer is not immediately transparent — visible in a single click — the deal stalls for weeks while they "validate the methodology."

---

### 4b. Nina Volkov — Head of AI (Emerging Power Center)

#### Who She Is

Reports to the CDO or CTO. She oversees AI/ML investments — model training costs, feature store spend, inference infrastructure. AI is the fastest-growing cost center in most enterprises and the least governed. She has budget authority for AI spend but limited visibility into which models are actually generating business value.

**What keeps her up at night:** "We are spending $500K/month on AI infrastructure and I cannot tell the CFO which models are actually generating revenue."

#### Actions in Strata

- **Home: `/ai-scorecard`** — Risk scoring dashboard. Composite risk scores, at-risk project count, potential savings, project-level risk factors (NVIDIA sprawl, model retraining costs, underutilized inference). Flag and kill-switch buttons.
- **Decisions: `/decisions`** — Creates AI cost optimization decisions. Has `decisions:create`.
- **Impact: `/capital-impact`** — Views AI-specific capital events (`ai_spend_reduced` event type).

She holds a unique permission: `ai:kill_execute`. No other persona — not even the CFO or CDO — can terminate an AI project's funding. This is by design. The Head of AI is the only person with sufficient technical context to make that call safely.

#### The Aha Moment

The AI Scorecard shows 3 AI projects with "high" or "critical" risk levels, burning $50K/month combined, with zero documented business value. She has suspected this but never had the data to act on it. The risk project cards give her the ammunition to propose specific, defensible actions.

#### Deal Importance

**Influencer trending toward Champion.** As AI spend accelerates past 20% of total data spend in many enterprises, the Head of AI is becoming a second economic buyer. She can independently champion Strata for the AI governance use case — a separate budget line, a separate justification, a separate expansion vector.

#### Expansion Lever

AI governance is a greenfield expansion vector. The initial Strata deal might cover the data portfolio broadly, but the Head of AI can justify a separate budget line for AI capital management. This is especially true as regulatory pressure around AI spending increases (EU AI Act, SEC disclosure requirements, board-level AI oversight mandates).

---

### 4c. Elena Rodriguez — Data Governance Steward (Operational Backbone)

#### Who She Is

Reports to the CDO. She is the compliance and certification authority. She certifies data products as governance-compliant, enforces data policies, and reviews lifecycle transitions. She is process-oriented, detail-driven, and allergic to ambiguity.

**What keeps her up at night:** "Are we compliant? Can I prove it? If an auditor asks, do I have documentation?"

#### Actions in Strata

- **Home: `/lifecycle`** — Health monitoring dashboard. Retirement candidates, cost spikes, stalled drafts, lifecycle transition timeline. Her operational command center.
- **Certification: `/assets`** — Has `products:certify` — a critical gatekeeping permission. Only she and the CDO can mark a product as governance-compliant. This badge appears on product cards across the marketplace and asset views.
- **Decisions: `/decisions`** — Creates governance decisions (`decisions:create`), but cannot approve them. Her proposals escalate to the CDO or CFO.
- **Discovery: `/candidates`** — Evaluates new product candidates for governance readiness.

#### Deal Importance

**Influencer (Governance).** She is the person who validates that Strata's governance model matches the enterprise's existing policy framework. If she says "this tool supports our governance requirements," the deal accelerates. If she says "this would require us to change our processes," the deal stalls.

#### Expansion Lever

Drives compliance-related seat expansion. Every department that needs governance coverage needs stewards with Strata access. As the company matures its data governance practice, the number of stewards grows from 1-2 to 5-10 across business units.

---

## 5. Tier 3 — Supporting Cast

These roles matter for retention and operational depth. They do not drive deal closure, but they drive daily adoption and prevent operational gaps. Serve them well; do not build for them specifically.

| Persona | Title | Home | Buying Role | Why They Matter | Seats |
|---|---|---|---|---|---|
| Alex Murphy | Data Platform Engineer | `/setup` | Tech Evaluator (Infra) | The 48-hour onboarding rule depends on this person successfully connecting Snowflake/Databricks/BigQuery. If connectors fail during POC, the deal stalls. | 1-3 |
| Amanda Liu | Marketing Analyst | `/marketplace` | End User | She does not influence the purchase, but her usage data proves Strata's value. 200 consumers subscribing through the marketplace is a powerful retention signal. | 50-500 |
| James Whitfield | COO | `/portfolio` | Blocker / Accelerator | Read-only executive view. If the COO sees the board view and is impressed, the deal accelerates. If not, it stalls. No middle ground. | 1-3 |
| Liam O'Brien | Senior Data Engineer | `/candidates` | Pipeline Builder | Feeds the discovery engine by promoting candidates from connected platforms. Important for data quality but not for deal dynamics. | 5-20 |
| Taylor Jackson | DataOps Lead | `/setup` | Platform Health | Monitors connector health, sync frequency, operational reliability. Procurement checkbox: "do you support our infrastructure?" | 1-3 |
| Raj Mehta | Senior ML Engineer | `/marketplace` | ML Consumer | Overlaps with Business Consumer for marketplace use, overlaps with Head of AI for scorecard. Feature engineering use case. | 10-50 |
| Robert Frost | External Auditor | `/portfolio` | Compliance | Read-only access to portfolio, capital impact, and decisions. Regulatory checkbox. Not a purchase motivation, but a procurement requirement. | 1-2 |

**Seat math:** Tier 3 personas represent the volume play. A single enterprise deployment could have 1-3 executives, 5-20 engineers, and 50-500 business consumers. The long tail of consumers is where per-seat pricing compounds.

---

## 6. The Persona Interaction Model

Strata's stickiness comes from being the connective tissue between personas. No single persona can use the product in isolation — each one's output feeds another's input. This is by design. A product that requires cross-functional collaboration is exponentially harder to remove than one used by a single team.

### 6a. The Capital Decision Loop (Core Workflow)

This is the central multi-persona workflow. Every governance action flows through it.

```
CDO (Priya) or Governance Steward (Elena)
    │
    ├─ Identifies retirement candidate, cost spike, or governance issue
    │  on /lifecycle or /candidates
    │
    ├─ Creates a capital decision (decisions:create)
    │  Decision appears in /decisions queue with estimated impact
    │
    ├─ CFO (Sarah) reviews and approves or rejects (decisions:approve)
    │  She sees estimated impact, owner, timeline, linked products
    │
    ├─ Product Owner (David) executes the decision
    │  He sees it linked to his product on /assets/[id]
    │  He implements the retirement, optimization, or restructuring
    │
    └─ Impact materializes on /capital-impact
       CFO sees cumulative capital freed
       CDO sees governance maturity improve on /capital-review (CEI score)
       FP&A exports data for financial models
```

**Why this matters for the deal:** The decision loop creates organizational dependency. Once the CFO is approving capital decisions through Strata, removing the tool means removing the governance workflow. That is not a tool decision; it is an operational risk.

### 6b. The AI Governance Loop

```
Head of AI (Nina) or CDO (Priya)
    │
    ├─ Flags AI project on /ai-scorecard (ai:flag)
    │
    ├─ Head of AI approves kill-switch (ai:kill_approve)
    │  Only Nina and Admin have this permission
    │
    ├─ Head of AI executes kill (ai:kill_execute)
    │  Only Nina has this — not even the CFO
    │
    └─ Capital event created as "ai_spend_reduced"
       Shows on /capital-impact
       CFO sees savings from AI governance
```

**Why this matters:** The AI governance loop is a separate value proposition that can justify a separate budget line. It is also a competitive moat — no other product gives the Head of AI a formal kill-switch workflow with financial impact tracking.

### 6c. The Product Discovery Loop

```
Data Engineer (Liam) or CDO (Priya) or Product Owner (David)
    │
    ├─ Reviews candidates on /candidates
    │  ML pipeline surfaces new data product candidates from connected platforms
    │
    ├─ Promotes candidate (candidates:promote)
    │  Candidate becomes a formal product in /assets
    │
    ├─ Product Owner claims ownership
    │  Populates metadata, consumers, SLAs
    │
    ├─ Declares value on /assets/[id] Economics tab
    │  Value feeds into composite value calculation
    │
    └─ ROI computed and visible to CFO on /portfolio
       New product appears in portfolio matrix
       CDO sees portfolio growing with measured value
```

**Why this matters:** The discovery loop means Strata is not just a reporting tool — it is the pipeline through which data products enter the enterprise portfolio. Removing Strata means losing the intake process.

### 6d. The Board Reporting Loop (Viral Mechanism)

```
CDO (Priya) generates board view on /portfolio/board-view
    │
    ├─ Sections auto-populated from portfolio data:
    │  Executive Summary, Portfolio KPIs, ROI Trends,
    │  Risk Exposure, Retirement Savings, Capital Allocation,
    │  Capital Impact, Methodology Appendix
    │
    ├─ CDO prints or exports PDF
    │
    ├─ Presents at board meeting
    │
    └─ CFO (Sarah) says: "What tool made this?"
       │
       └─ Deal expands from CDO pilot ($100K) to CFO mandate ($500K+)
```

**Why this matters:** The board deck is the single most important feature in Strata. It is not technically impressive. It is commercially decisive. The board deck is how a product sells itself inside the organization without a salesperson in the room.

---

## 7. The Expansion Playbook

Revenue does not come from a single transaction. It comes from a land-and-expand motion where each phase creates the conditions for the next.

### Phase 1: Land (Month 0)

**Who:** CDO pilots with 5-10 Product Owners in one business unit.
**Contract:** $100-200K/yr.
**What happens:** Product Owners onboard their data products. Connectors pull cost and usage data from Snowflake/Databricks. The portfolio view starts populating.
**Success metric:** 5+ Product Owners logging in weekly.

### Phase 2: Prove (Months 1-3)

**Who:** CDO, Product Owners, FP&A Analyst.
**What happens:** Product Owners populate value declarations. Cost trends stabilize. The CDO generates the first board view. The CFO sees it for the first time. The FP&A Analyst validates the methodology using provenance drawers and the economic model documentation.
**Success metric:** First board deck presented. CFO engaged.

### Phase 3: Expand Horizontally (Months 4-6)

**Who:** CDO expands to all business units. Product Owners: 10 → 50-100. Business Consumers discover the marketplace.
**What happens:** The portfolio grows from one BU to the full enterprise. Seat count increases. The board deck becomes a quarterly ritual. Cross-domain benchmarking becomes possible.
**Contract:** Expansion to $300-500K/yr.
**Success metric:** 50+ active users. Portfolio covers 80%+ of data spend.

### Phase 4: Expand Vertically (Months 6-12)

**Who:** Head of AI adopts `/ai-scorecard`. Governance Stewards adopt `/lifecycle`. External Auditor gets read-only access.
**What happens:** New use cases emerge. AI governance becomes a separate value proposition. Compliance requirements drive steward seats. The permission model justifies tiered pricing.
**Contract:** Expansion to $500K-1M/yr.
**Success metric:** 3+ distinct use cases (portfolio management, AI governance, compliance).

### Phase 5: Embed (Months 12+)

**Who:** The entire data organization plus Finance.
**What happens:** Strata becomes the system of record for data economics. The board expects quarterly capital reports from Strata. The CFO mandates that all new data investments go through the decision workflow. The benchmarking network effect activates: "Your cost-per-query is 3x the median for companies your size." Removing Strata would mean rebuilding institutional memory, governance workflows, and board reporting from scratch. That does not happen.
**Contract:** $1M+/yr, multi-year.
**Success metric:** Strata metrics in board materials. Decision workflow mandatory for new investments.

---

## 8. Anti-Personas: Who Not to Sell To

Time is the scarcest resource. These disqualification criteria save months of wasted sales cycles.

### 1. The Data Engineer Who Wants a Catalog

If the primary buyer asks about data discovery, lineage visualization, data quality scoring, or metadata management, they want Collibra, Atlan, or Alation. They are evaluating the wrong category. Walk away politely and send them a referral.

**Signal:** "Can Strata replace our data catalog?" The answer is no, and explaining why burns a sales cycle.

### 2. The CDO Who Has No CFO Relationship

The expansion path requires the CDO to present the board deck to the CFO. If the CDO cannot get the CFO to look at a dashboard — if the CFO does not know the CDO's name — the viral mechanism breaks. The deal stays a $50K pilot forever.

**Signal:** Ask "Have you presented data spend to the CFO or board before?" If the answer is "no" or "not directly," the expansion path is blocked.

### 3. Companies with Less Than $2M Annual Data Spend

The value proposition requires enough portfolio complexity to create meaningful waste. A company with 5 data products and $500K/year in data spend will not have a "diagnosis moment." The numbers will be too small to generate urgency.

**Signal:** Ask "How many data products or datasets does your team maintain?" If the answer is under 20, the portfolio is too small.

### 4. The "Just Give Me an API" Technical Buyer

If the evaluation is driven by a data engineer who wants to integrate Strata into their CI/CD pipeline or embed it in their developer workflow, they are evaluating the wrong category. Strata is an executive operating system, not a developer tool.

**Signal:** The first question is about API documentation or webhook support, not about financial visibility.

### 5. Companies with a Mature FinOps Practice for Cloud

If they already use CloudHealth, Kubecost, Apptio, or a similar tool for infrastructure cost management, they may believe Strata overlaps. It does not — Strata governs the business value of data products, not the infrastructure cost of cloud resources. But explaining this distinction requires education, and education burns sales cycles in early-stage go-to-market.

**Signal:** "We already have FinOps tooling." Defer these prospects until the category is established enough that the distinction is obvious.

---

## 9. Permission Architecture as Deal Hierarchy

An insight from the codebase: the permission model encodes the commercial hierarchy. The number and type of permissions a persona holds reveals their importance to the deal.

| Persona | Permissions | Key Exclusive Authorities |
|---|---|---|
| CDO | 24 | `pricing:activate`, `products:certify` (shared with Steward), `decisions:create` + `decisions:approve` (only dual-authority role) |
| CFO | 14 | `decisions:approve` (shared with CDO), `capital:export` |
| Product Owner | 13 | `products:write`, `candidates:promote` |
| Head of AI | 12 | `ai:kill_execute` (exclusive — no other role has this) |
| Governance Steward | 10 | `products:certify` (shared with CDO) |
| FP&A Analyst | 9 | `capital:export`, `pricing:simulate` |
| Platform Admin | 13 | `connectors:write`, `connectors:run`, `users:write` |
| Business Consumer | 5 | `marketplace:subscribe` |

**Reading this table:**

- **Approval authority** (`decisions:approve`) is held by only the CFO and CDO. These are the personas who must be sold to.
- **Activation authority** (`pricing:activate`) is held by only the CDO. The CDO is the operational hub.
- **Kill authority** (`ai:kill_execute`) is held by only the Head of AI. She owns the AI governance use case exclusively.
- **Read-only personas** (Consumer, Auditor, Executive Sponsor) need to be served but not sold to. They are adoption metrics, not deal drivers.

The permissions that require approval authority map to the personas who write the check. The permissions that are operational map to the personas who drive daily adoption. The permissions that are read-only map to the personas who generate usage metrics that justify renewal.

---

## 10. Appendix: Full Permission Matrix

32 permissions across 15 roles. Checked (x) indicates the role holds the permission.

| Permission | CFO | Exec Sponsor | FP&A | CDO | Prod Owner | Gov Steward | Platform Admin | Data Eng | DataOps | Head AI | Data Sci | Consumer | Auditor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| connectors:read | | | | x | x | | x | x | x | | | | |
| connectors:write | | | | | | | x | | x | | | | |
| connectors:run | | | | | | | x | x | x | | | | |
| candidates:read | x | | | x | x | x | x | x | | x | x | | |
| candidates:promote | | | | x | x | | x | x | | | | | |
| candidates:ignore | | | | x | x | | x | x | | | | | |
| products:read | x | x | x | x | x | x | x | x | x | x | x | x | x |
| products:write | | | | x | x | | | | | | | | |
| products:certify | | | | x | | x | | | | | | | |
| marketplace:read | x | x | | x | x | x | | x | | | x | x | |
| marketplace:subscribe | | | | | x | | | | | | x | x | |
| decisions:read | x | x | | x | x | x | | | | x | | | x |
| decisions:create | | | | x | x | x | | | | x | | | |
| decisions:approve | x | | | x | | | | | | | | | |
| decisions:execute | | | | | | | | | | | | | |
| pricing:simulate | x | | x | x | x | | | | | | | | |
| pricing:activate | | | | x | | | | | | | | | |
| ai:read | x | x | | x | | | | | | x | x | | |
| ai:flag | | | | x | | | | | | x | x | | |
| ai:kill_approve | | | | x | | | | | | x | | | |
| ai:kill_execute | | | | | | | | | | x | | | |
| capital:read | x | x | x | x | | | | | | x | | | x |
| capital:export | x | x | x | x | | | | | | | | | |
| portfolio:read | x | x | x | x | x | x | x | x | x | x | x | x | x |
| lifecycle:read | x | x | x | x | x | x | x | x | x | x | x | | x |
| allocation:read | x | x | x | x | | | | | | | | | |
| notifications:read | x | x | x | x | x | x | x | x | x | x | x | x | |
| users:read | | | | x | | | x | | | | | | |
| users:write | | | | | | | x | | | | | | |
| audit:read | x | x | x | x | | x | x | | x | | | | |

**Permission totals:** CDO (24), Platform Admin (13), Product Owner (13), CFO (14), Head of AI (12), Executive Sponsor (11), Governance Steward (10), FP&A (9), Data Engineer (10), DataOps (8), Data Scientist (9), Consumer (5), Auditor (6).

---

*This document is the go-to-market lens on Strata's persona model. Every claim maps to a specific product surface, a specific permission gate, and a specific deal dynamic. Update it as design partner feedback refines the personas and the expansion playbook.*
