# Strata — UX Specification

## 1. NAVIGATION MAP

### Primary Navigation (Left Sidebar — RBAC-filtered)

```
┌─────────────────────┐
│  ◆ Strata     │  ← Logo + org name
│                      │
│  ▸ Portfolio         │  ← Default landing (executive dashboard)
│  ▸ Candidates        │  ← Discovery inbox
│  ▸ Assets            │  ← Browse all data products
│  ▸ Lifecycle         │  ← Health, retirement, stage management
│  ▸ Decisions         │  ← Capital decision log
│  ▸ Allocation        │  ← Budget allocation + reallocation
│  ▸ Capital Impact    │  ← Capital freed, ROI delta, event ledger
│  ▸ Capital Review    │  ← Executive performance layer (CEI, governance, rebalance)
│  ▸ AI Scorecard      │  ← AI project risk assessment + kill switch
│  ▸ Marketplace       │  ← Internal subscribe/discover
│  ▸ Simulate          │  ← Pricing simulator
│                      │
│  ─────────────────── │
│  ▸ Setup             │  ← Connectors, teams, users
│                      │
│  ─────────────────── │
│  [User avatar]       │
│  Role: CFO           │
│  [Cmd+K Search]      │
│  [Sign out]          │
└─────────────────────┘
```

> **Implementation note:** The sidebar uses `ROUTE_PERMISSIONS` from `lib/auth/permissions.ts` to filter nav items. Only routes the current user has permission to access are rendered. Each nav item maps to a backend permission string (e.g. `/decisions` → `decisions:read`). See `components/layout/sidebar.tsx`.

### RBAC Visibility (Implemented — 15 roles, 32 permissions)

The table below shows the **5 primary demo personas**. The platform has 15 roles total (see `apps/api/app/auth/rbac.py` for the full matrix).

| Screen         | Permission Required  | Admin | CFO | CDO | Product Owner | Consumer |
|---------------|---------------------|-------|-----|-----|---------------|----------|
| Portfolio      | `portfolio:read`     | ✅    | ✅  | ✅  | ✅            | ✅       |
| Candidates     | `candidates:read`    | ✅    | —   | ✅  | ✅            | —        |
| Assets         | `products:read`      | ✅    | ✅  | ✅  | ✅            | —        |
| Lifecycle      | `lifecycle:read`     | ✅    | —   | ✅  | ✅            | —        |
| Decisions      | `decisions:read`     | ✅    | ✅  | ✅  | ✅            | —        |
| Decision Detail| `decisions:read`     | ✅    | ✅  | ✅  | ✅            | —        |
| Allocation     | `allocation:read`    | ✅    | ✅  | ✅  | —             | —        |
| Capital Impact | `capital:read`       | ✅    | ✅  | ✅  | —             | —        |
| Capital Review | `capital:read`       | ✅    | ✅  | ✅  | —             | —        |
| AI Scorecard   | `ai:read`            | ✅    | —   | ✅  | —             | —        |
| Marketplace    | `marketplace:read`   | ✅    | —   | ✅  | ✅            | ✅       |
| Simulate       | `pricing:simulate`   | ✅    | —   | ✅  | —             | —        |
| Setup          | `connectors:read`    | ✅    | —   | —   | —             | —        |

**Action-level permissions (buttons hidden when lacking):**
| Action | Permission | Available to |
|--------|-----------|-------------|
| Approve/Reject/Delay Decision | `decisions:approve` | admin, cfo, executive_sponsor |
| Promote Candidate | `candidates:promote` | admin, cdo, product_owner, governance_steward |
| Flag AI Project | `ai:flag` | admin, cdo, head_of_ai |
| Kill AI Project | `ai:kill_execute` | admin, cdo |
| Activate Pricing Policy | `pricing:activate` | admin, cdo |
| Start Retirement Review | `decisions:create` | admin, cfo, cdo, product_owner |

**Route-level guard:** If a user navigates directly to a restricted URL, the `<PermissionGuard>` component shows an "Access Restricted" screen with the user's role, the required permission, and a redirect button. See `components/auth/permission-guard.tsx`.

---

## 2. COPY STYLE GUIDE

### Tone
- **Executive-calm:** Confident but not loud. Bloomberg, not Jira.
- **Financial-first:** "Investment", "return", "portfolio" — not "pipeline", "table", "schema"
- **Action-oriented:** Every insight ends with a verb — "Review", "Investigate", "Simulate"
- **Honest about gaps:** "Coverage: 72% — some costs estimated" not hidden or ignored

### Vocabulary Translation

| Technical (NEVER use for CFO/CDO) | Financial (ALWAYS use) |
|---|---|
| Table / Dataset | Data Product |
| Schema | Domain |
| Query count | Usage (consumers) |
| Pipeline | Production process |
| DAG | Dependency chain |
| Warehouse credits | Compute cost |
| S3 bucket | Storage cost |
| Row count | Volume |
| Freshness SLA | Delivery reliability |
| Data quality score | Trust score |

### Microcopy Patterns

**KPI Cards:**
- Label: "Portfolio ROI" (not "Return on Investment ratio")
- Value: "2.8x" (not "2.8134x" or "280%")
- Trend: "+0.3 vs last quarter" (human relative, not absolute)
- Action: "View breakdown →"

**Empty States:**
- Headline: What's missing ("No data products yet")
- Explanation: Why it matters ("Once connected, you'll see cost and usage for every data product")
- Action: Single clear CTA ("Connect your first platform →")

**Tooltips / How-calculated:**
- Start with the outcome: "This is the total monthly cost..."
- Then the method: "...calculated from Snowflake query logs + storage billing"
- Then the coverage: "Based on 72% of your data products with cost data"

---

## 3. COMPONENT INVENTORY

### 3.1 Layout Components

**AppShell**
- Left sidebar (240px, collapsible to 64px)
- Top bar: breadcrumb + Cmd+K trigger + notifications + user menu
- Main content area: max-width 1440px, centered
- Right drawer (optional): "Explain this" AI panel, 400px

**PageHeader**
- Title (H1)
- Optional subtitle/description
- Optional filter bar
- Optional action buttons (right-aligned)

**Section**
- Title (H2) + optional "View all →" link
- Content area
- Consistent vertical spacing (32px between sections)

### 3.2 Data Display Components

**KPICard** (the workhorse)
```
┌──────────────────────────┐
│  Portfolio ROI        ⓘ  │  ← Label + info tooltip
│  2.8x                    │  ← Primary value (large)
│  ▲ +0.3 vs Q3           │  ← Trend (green/red/neutral)
│  View breakdown →        │  ← Optional action link
└──────────────────────────┘
```
Variants: default, highlighted (border-left color), alert (amber/red border)

**MetricRow** (inline metric pairs)
```
Monthly Cost: $18.4K  |  Declared Value: $62K  |  ROI: 3.4x  |  Coverage: 87%
```

**DataTable**
- Sortable columns
- Row hover → action buttons appear
- Pagination (25 per page)
- Empty state built-in
- Optional: sparkline column, badge column, progress column

**ProductCard** (for marketplace/browse)
```
┌──────────────────────────────────────┐
│  Customer 360             ✓ Certified │
│  Owner: Maria Santos                  │
│  Domain: Customer Analytics           │
│                                       │
│  Cost: ~$18K/mo  │  ROI: 3.4x       │
│  Consumers: 340  │  Trust: 97%       │
│                                       │
│  [Subscribe]              Growth ●    │
└──────────────────────────────────────┘
```

**CostBreakdown** (donut + table)
```
┌─────────────────────────────────────────────┐
│  [Donut Chart]    Compute    $8.2K   44%   │
│                   Storage    $2.1K   11%   │
│                   Pipeline   $3.4K   18%   │
│                   Human est. $4.7K   26%   │
│                   ─────────────────────     │
│                   Total     $18.4K          │
│                                             │
│  How this is calculated →                   │
└─────────────────────────────────────────────┘
```

**LifecyclePill** — colored badge showing stage
- Draft (gray)
- Active (blue)
- Growth (green)
- Mature (teal)
- Decline (amber)
- Retired (neutral/muted)

**CoverageIndicator**
```
Coverage: 87% ████████░░  (3 products missing cost data)
```

**ValueDeclaration** (card)
```
┌───────────────────────────────────────────────┐
│  VALUE DECLARATION                            │
│  Declared by: VP Marketing, Dec 2025          │
│  Method: Revenue attribution                  │
│  Value: $62K/month                            │
│  Basis: "Drives segmentation for campaign..."  │
│                                               │
│  Status: ✓ Peer-reviewed  ✓ CFO acknowledged  │
│  Next review: Mar 2026                        │
│                                               │
│  [Revalidate]  [Edit]                         │
└───────────────────────────────────────────────┘
```

### 3.3 Chart Components

**BCGMatrix** (scatter plot quadrant)
- X-axis: Usage (consumers)
- Y-axis: Cost
- Dot size: absolute cost
- Dot color: lifecycle stage
- Quadrant labels: Stars, Cash Cows, Question Marks, Dogs
- Click dot → navigate to product profile

**TrendChart** (line/area chart)
- Time range selector: 30d / 90d / 6m / 1y
- Dual-axis option (cost + usage overlay)
- Hover tooltip with date + value
- Annotations for events (cost spike, lifecycle change)

**StageDistribution** (horizontal stacked bar)
- One bar per lifecycle stage
- Show count + total cost per stage
- Click to filter

**SankeyFlow** (lifecycle transitions)
- Show movement between stages over selected period

### 3.4 Interaction Components

**CommandPalette** (Cmd+K)
- Search across: products, teams, screens, actions
- Recent items
- Quick actions: "Go to Customer 360", "View retirement candidates"

**FilterBar**
- Platform (Snowflake, Databricks, All)
- Business Unit
- Domain
- Lifecycle Stage
- ROI Band (>3x, 1-3x, 0.5-1x, <0.5x)
- Time Range

**ActionButton** — primary actions tied to insights
- "Investigate" (amber, for anomalies)
- "Start Review" (blue, for lifecycle decisions)
- "Retire" (red, for retirement workflow)
- "Simulate" (purple, for pricing what-ifs)
- "Subscribe" (green, for marketplace)

**ExplainDrawer** (right panel)
- "How is this calculated?"
- Plain-English explanation
- Coverage indicator
- Data sources listed
- "Learn more" link

**NotificationBell** (with Popover)
- Badge count (unread indicator dot)
- Click opens a **Popover dropdown** with recent notifications
- Each notification item is **type-colored** (cost spike = red, lifecycle change = blue, decision update = amber, etc.)
- **Mark all read** action at the top of the popover
- **Click-to-navigate**: clicking a notification navigates to the relevant page (e.g., decision detail, asset detail)
- Unread notifications display a dot indicator
- Endpoints: `PATCH /notifications/{id}/read`, `POST /notifications/mark-all-read`
- Categories: Cost Spikes, Usage Drops, Value Expiring, Lifecycle Changes, Decision Updates

### 3.5 Form Components

**ConnectorWizard** (stepped form)
- Step 1: Choose platform
- Step 2: Enter credentials
- Step 3: Test connection
- Step 4: See "What you'll get" checklist
- Step 5: Initial sync + redirect to portfolio

**ValueDeclarationForm**
- Declarant selector
- Method dropdown (Revenue Attribution, Cost Avoidance, Efficiency Gain, Compliance, Strategic)
- Dollar value input
- Justification textarea
- Reviewer selector

**ScenarioBuilder** (pricing simulator)
- Pricing model radio (Cost-plus, Usage-based, Tiered, Flat, Value-share)
- Parameter inputs (dynamic based on model)
- Apply-to selector (single product, BU, all)
- "Run Simulation" button

---

## 4. EMPTY STATES

### Portfolio Dashboard (no connectors)
```
┌──────────────────────────────────────────────┐
│                                              │
│         ◆                                    │
│   Connect your data platform                 │
│                                              │
│   Strata shows the financial health   │
│   of your data products — but first,         │
│   we need to connect to where they live.     │
│                                              │
│   Supported: Snowflake, Databricks           │
│   Setup takes about 5 minutes.               │
│                                              │
│          [Connect Platform →]                │
│                                              │
└──────────────────────────────────────────────┘
```

### Portfolio Dashboard (connected, syncing)
```
┌──────────────────────────────────────────────┐
│                                              │
│   ◎ Syncing your data...                     │
│   ━━━━━━━━━━━━━━━━━░░░░░  72%               │
│                                              │
│   Found 47 data products so far.             │
│   Estimating costs from query logs...        │
│                                              │
│   This usually takes 3-5 minutes.            │
│   We'll notify you when it's ready.          │
│                                              │
└──────────────────────────────────────────────┘
```

### Product Profile (no value declaration)
```
┌──────────────────────────────────────────────┐
│  VALUE DECLARATION                           │
│                                              │
│  No value declared yet.                      │
│  Without a value declaration, ROI cannot     │
│  be calculated for this data product.        │
│                                              │
│  Ask a business stakeholder to declare       │
│  the value this product creates.             │
│                                              │
│  [Declare Value]  [Learn about declarations] │
└──────────────────────────────────────────────┘
```

### Marketplace (no products available)
```
┌──────────────────────────────────────────────┐
│                                              │
│  No data products available yet.             │
│  Products become available in the            │
│  marketplace when their owners publish them. │
│                                              │
│  [Browse all assets instead →]               │
│                                              │
└──────────────────────────────────────────────┘
```

### Pricing Simulator (no scenarios)
```
┌──────────────────────────────────────────────┐
│                                              │
│  Model the economics of data pricing.        │
│                                              │
│  Create pricing scenarios to see how         │
│  internal chargeback would affect teams,     │
│  usage patterns, and cost recovery.          │
│                                              │
│  [Create First Scenario →]                   │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 5. ERROR STATES

### Connection Failed
```
┌──────────────────────────────────────────────┐
│  ⚠ Connection to Snowflake failed            │
│                                              │
│  We couldn't reach your Snowflake instance.  │
│  This usually means:                         │
│  • The account identifier is incorrect       │
│  • Network access is restricted              │
│  • Credentials have expired                  │
│                                              │
│  [Retry Connection]  [Edit Settings]         │
└──────────────────────────────────────────────┘
```

### Partial Data
```
┌──────────────────────────────────────────────┐
│  ⓘ Some data is unavailable                  │
│                                              │
│  Cost data covers 72% of your products.      │
│  28% are showing estimated costs.            │
│                                              │
│  This is normal for first sync.              │
│  Coverage improves as more query history      │
│  is ingested.                                │
│                                              │
│  [View coverage details]                     │
└──────────────────────────────────────────────┘
```

---

## 6. MUTATION GATING & OFFLINE DEMO MODE

### 6.1 `canMutate` Pattern

All mutation buttons (write operations) across the application are gated behind a compile-time constant:

```typescript
// lib/api/client.ts
export const isAPIEnabled = !!process.env.NEXT_PUBLIC_API_URL;
export const canMutate = isAPIEnabled;
```

**Behavior when `canMutate` is `false`:**
- Every action button (Subscribe, Approve, Reject, Delay, Promote, Ignore, Flag, Kill, Activate, Approve Reallocation) is rendered with `disabled={true}` and `title="API unavailable in offline demo mode"`.
- `apiPost()` and `apiPatch()` calls are never invoked — the gate prevents the request entirely.
- Read operations (`useData<T>()`) still work, falling back to seed data from `lib/mock-data/seed.ts`.

**Behavior when `canMutate` is `true`:**
- Buttons are enabled (subject to RBAC — `hasPermission()` still applies).
- All API calls use `try/catch` with `toastError(msg)` on failure — no silent catches.
- Success paths call `toastSuccess(...)` for user feedback.

### 6.2 `useMutation<T>` Hook

A generic mutation hook is available for pages that need structured mutation state:

```typescript
export function useMutation<T>(apiPath: string, method: "post" | "patch" = "post") {
  // Returns: { execute, loading, disabled, disabledReason }
  // Automatically gates behind canMutate
  // Shows toast on error
}
```

### 6.3 Mutation Gating by Screen

| Screen | Gated Buttons | API Endpoint |
|--------|--------------|--------------|
| Candidates | Promote, Ignore, Flag for Retirement | `POST /candidates/{id}/promote`, `PATCH /candidates/{id}`, `POST /decisions/` |
| Candidates Detail | Promote, Ignore, Flag for Retirement (action bar + dialogs) | Same as above |
| Decisions | Approve, Reject, Delay | `POST /decisions/{id}/approve-retirement`, etc. |
| Decision Detail | Approve, Reject, Delay, Post Comment | `POST /decisions/{id}/approve-retirement`, `POST /decisions/{id}/comments` |
| Lifecycle | Start Retirement Review | `POST /decisions/` |
| Marketplace | Subscribe / Unsubscribe | `POST /marketplace/subscribe` |
| Simulate | Activate as Policy | `POST /pricing/activate` |
| AI Scorecard | Flag for Review, Kill Project | `POST /ai-scorecard/{id}/flag`, `POST /ai-scorecard/{id}/kill` |
| Allocation | Approve Reallocation | `POST /allocation/approve-reallocation` |
| Setup | Connect (decorative — no backend) | — |
| Asset Detail | Edit, Declare Value (decorative — no backend) | — |

> **Decorative buttons** (no `onClick` handler, no backend endpoint) are also disabled via `canMutate` and tooltip-gated. They render as placeholders for future functionality.

### 6.4 Toast Feedback Pattern

All mutation paths follow this pattern:
1. **Try:** Execute API call → `toastSuccess("Action completed")`
2. **Catch:** Extract error message → `toastError(msg)` — never silent
3. **Finally:** Reset loading state

No page uses `catch { /* silent */ }` or simulates success on failure.

### 6.5 Display Configuration (Configurable Thresholds)

All UI classification thresholds are sourced from the `GET /display-config/` API endpoint via the `useDisplayConfig()` hook. Every value falls back to a seed default when the API is unavailable. Zero inline magic numbers remain in page components.

| Config Group | Keys | Default Values | Used In |
|---|---|---|---|
| **ROI Bands** | `high`, `healthy` | 3.0, 1.0 | Assets, Asset Detail, Marketplace, Allocation |
| **Trust Score Bands** | `high`, `medium` | 0.9, 0.7 | Asset Detail, Marketplace |
| **Confidence Score Bands** | `green`, `blue`, `amber` | 80, 60, 40 | Candidates (ConfidenceBadge) |
| **AI Risk Score Bands** | `low`, `medium`, `high` | 70, 50, 30 | AI Scorecard (score colors + explanatory text) |
| **Pricing Simulation Defaults** | `markup`, `baseFee`, `perQuery`, `freeTier`, `adoptionSlider` | 25, 500, 1.25, 500, 12 | Simulate (synced to state via useEffect) |
| **Team Budget Threshold** | `amount` | 4500 | Simulate (over-budget warnings) |

**Backend storage:** Values are stored as JSON strings in the existing `policy_configs` table (6 rows with `"Display —"` prefix names). No new table or migration required.

**Frontend pattern:** `const { data: cfg } = useDisplayConfig()` — accessed as `cfg?.roiBands.high ?? 3` with inline fallbacks for type safety before config loads.

---

## 7. DESIGN TOKENS

### Typography
- **Display:** 36px / 700 — Portfolio title, hero numbers
- **H1:** 28px / 600 — Page titles
- **H2:** 20px / 600 — Section titles
- **H3:** 16px / 600 — Card titles
- **Body:** 14px / 400 — Default text
- **Caption:** 12px / 400 — Labels, secondary text
- **Mono:** 13px / 500 — Numbers, values, codes

Font: Inter (or system sans-serif)

### Colors
- **Background:** #F7F8F9 / Off White (app), #FFFFFF (cards)
- **Border:** #E5E7EB
- **Text Primary:** #1F2937 (Graphite)
- **Text Secondary:** #6B7280
- **Text Muted:** #9CA3AF

Semantic:
- **Positive:** #0F766E (teal-700 / Accent Green) — ROI up, healthy
- **Negative:** #7F1D1D (red-900 / Risk Red) — cost spike, decline
- **Warning:** #B45309 (amber-700 / Alert Amber) — attention needed
- **Info:** #2563EB (blue-600) — active, neutral info
- **Purple:** #7C3AED — simulation, AI

Lifecycle stage colors (Recharts hex):
- Draft: #9CA3AF (gray)
- Active: #2563EB (blue)
- Growth: #0F766E (Accent Green)
- Mature: #115E59 (teal-800)
- Decline: #B45309 (Alert Amber)
- Retired: #6B7280 (muted)

### Spacing
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px

### Card Style
- Background: white
- Border: 1px solid #E5E7EB
- Border-radius: 12px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.04)
- Hover: shadow 0 4px 12px rgba(0,0,0,0.06)

### Table Style
- Header: text-xs uppercase tracking-wide text-secondary bg-gray-50
- Row: border-bottom 1px, py-12px
- Hover: bg-gray-50
- Sortable column: cursor-pointer, icon indicator
