# Implementation Plan: From 75% to 150%

> This document is the tactical companion to [STRATEGIC_VISION.md](STRATEGIC_VISION.md).
> It defines every change — build, refactor, fix, polish — required to make Strata undeniable.
> Items are organized by strategic impact, not engineering difficulty.

---

## Guiding Principle

The product should drive discovery. A first-time user should feel a pull to explore deeper, understand more, take action. No feature should require explanation. Every screen should answer "what should I do next?" without being asked.

---

## Tier 1: The Diagnosis Moment

*The single screen that makes someone unable to walk away.*

### 1.1 Redesign Portfolio Overview Hero

**Current state:** Capital Header shows Monthly Data Capital Spend (large), Capital Misallocated, Capital Freed, Decision Latency. Good metrics, but presented as informational — not as a diagnosis.

**Target state:** The hero should feel like opening a financial health report and discovering a problem.

**Changes:**
- [ ] Reframe the primary metric from "Monthly Data Capital Spend" to a **health diagnosis**: show spend AND waste side by side. E.g., "$14.2M annual spend — $5.8M generates no measurable value"
- [ ] Add a **portfolio health grade** (A-F or 0-100) derived from ESE distribution, ROI coverage, and decision latency. One symbol that says "healthy" or "critical" at a glance
- [ ] Add a **waste percentage** as a prominent, impossible-to-miss metric. "41% of your portfolio is underperforming." Red if above 30%, amber if 20-30%, green if below 20%
- [ ] Redesign the Board Snapshot Pill from a small navy bar into a **full-width urgency banner** with larger typography: "If nothing changes in 6 months: +$2.1M cost, -18% ROI"
- [ ] Add **sparkline trends** to each KPI showing 6-month direction (already have time series data)
- [ ] Make the Capital Freed metric more celebratory — teal background, upward arrow animation, to reward action-taking

**Files to modify:**
- `apps/web/src/app/(dashboard)/portfolio/components/CapitalHeader.tsx`
- `apps/web/src/app/(dashboard)/portfolio/page.tsx`
- `apps/web/src/lib/metrics/canonical.ts` (add portfolio health score computation)

### 1.2 Add "Your Top 3 Actions" Above the Fold

**Current state:** Capital Actions are horizontally scrollable cards below the header. Easy to scroll past.

**Target state:** The three highest-impact actions should be unmissable — they are the answer to "what should I do right now?"

**Changes:**
- [ ] Promote the top 3 capital actions into the hero area, directly below the KPIs
- [ ] Each action card should show: action type, product name, **monthly dollar impact** (large, colored), and a single "Review" CTA
- [ ] Add a running total: "These 3 actions would recover $127K/month"
- [ ] If all actions are resolved, show a congratulatory state: "No urgent actions. Your portfolio is well-governed."

**Files to modify:**
- `apps/web/src/app/(dashboard)/portfolio/components/CapitalActions.tsx`
- `apps/web/src/app/(dashboard)/portfolio/page.tsx`

### 1.3 Sharpen the Inaction Cost Warning

**Current state:** Full-width amber card with projected spend increase and liability. Effective but can feel like another metric card.

**Target state:** This should feel like a ticking clock.

**Changes:**
- [ ] Add a **timeline visualization** — a small horizontal bar showing "today" vs. "3 months" vs. "6 months" with projected cost at each point
- [ ] Make the liability number animate on page load (count-up from 0)
- [ ] Add specificity: "Primary driver: 4 products in decline stage with no retirement decision" with a direct link to those products

**Files to modify:**
- `apps/web/src/app/(dashboard)/portfolio/components/InactionCostWarning.tsx`

---

## Tier 2: The Board-Ready Export

*The artifact that travels from CDO to CFO to boardroom.*

### 2.1 Upgrade Board View to Publication Quality

**Current state:** Board View exists at `/portfolio/board-view` with 7 sections. Uses `window.print()` for PDF. Content is real and data-driven. This is already good — but it needs to go from "good internal report" to "McKinsey deliverable."

**Changes:**
- [ ] Add a **cover page** with Strata logo, organization name, report date, and "Data Capital Position Report — Q1 2026" title
- [ ] Add **page numbers** and **section headers** that survive print-to-PDF
- [ ] Add a **one-paragraph executive summary** at the top: auto-generated narrative summarizing portfolio health, key risks, and recommended actions in plain English. Pull from the `/executive-summary` API
- [ ] Add **comparison to previous period**: "ROI improved 4% vs. last quarter" / "Waste reduced by $320K/month since last report"
- [ ] Add a **methodology appendix**: brief explanation of how ESE, ROI, and composite value are calculated — builds trust with the CFO who will ask "where do these numbers come from?"
- [ ] Improve chart rendering for print: ensure all Recharts components render cleanly in print media (test across Chrome, Safari, Firefox)
- [ ] Add a **"Download PDF"** button that triggers `window.print()` with a suggested filename: `Strata-Capital-Report-{OrgName}-{Date}.pdf`
- [ ] Style the print output with `@media print` CSS: hide sidebar, navigation, interactive elements; ensure white background; use serif font for body text (more formal)

**Files to modify:**
- `apps/web/src/app/(dashboard)/portfolio/board-view/page.tsx`
- `apps/web/src/app/(dashboard)/portfolio/board-view/components/` (all section components)
- `apps/web/src/app/globals.css` (print media styles)

### 2.2 Add Server-Side PDF Generation (Backend)

**Current state:** No PDF generation on the backend. The `board.py` docstring says "designed for future PDF export."

**Changes:**
- [ ] Add `weasyprint` or `reportlab` to API dependencies
- [ ] Create `GET /api/v1/board/export-pdf` endpoint that generates a styled PDF from the capital summary data
- [ ] Include charts rendered as static images (use a headless chart renderer or pre-render on frontend and send as base64)
- [ ] Return the PDF as a downloadable response with proper content-type headers
- [ ] Add email delivery option: `POST /api/v1/board/send-report` that generates PDF and emails it to specified recipients

**Files to create/modify:**
- `apps/api/app/api/v1/board.py` (add export-pdf endpoint)
- `apps/api/app/services/report_generator.py` (new service)
- `apps/api/pyproject.toml` (add weasyprint dependency)

### 2.3 Scheduled Board Reports

**Current state:** No background job infrastructure.

**Changes:**
- [ ] Add APScheduler to the API for lightweight scheduled tasks
- [ ] Allow org admins to configure weekly or monthly board report delivery
- [ ] Auto-generate and email the capital summary PDF on schedule
- [ ] Track report history (when sent, to whom)

**Files to create:**
- `apps/api/app/services/scheduler.py`
- `apps/api/app/models/report_schedule.py`

---

## Tier 3: The Narrative Flow

*The product tells a story. Each screen answers "what should I look at next?"*

### 3.1 Add Contextual Navigation Prompts

**Current state:** Navigation is sidebar-driven. Users must know where to go. The sidebar groups (Discover, Govern, Optimize, Measure, Platform) suggest a flow but do not enforce it.

**Target state:** Each page should suggest the next logical step based on what the user just saw.

**Changes:**
- [ ] Add a **"Next Step" card** at the bottom of every major page:
  - Portfolio Overview → "3 products need retirement decisions" → link to Lifecycle
  - Lifecycle → "5 retirement candidates identified" → link to Decisions
  - Decisions → "Review your capital impact" → link to Capital Impact
  - Capital Impact → "See your 12-month projection" → link to Capital Projection
  - Capital Projection → "Generate a board report" → link to Board View
- [ ] Make these context-aware: the prompt changes based on data state (e.g., if no pending decisions, skip to projection)
- [ ] Use the existing `InsightCallout` component with a teal border and arrow icon

**Files to modify:**
- All major page.tsx files in `apps/web/src/app/(dashboard)/`
- Create `apps/web/src/components/shared/next-step-card.tsx`

### 3.2 Add a "Discovery Path" for First-Time Users

**Current state:** No onboarding wizard. Users land on Portfolio Overview with no guidance.

**Target state:** First-time users see a subtle guided path overlaid on the real product — not a modal tour, but contextual highlights.

**Changes:**
- [ ] Detect first visit (localStorage flag or user metadata)
- [ ] On first visit to Portfolio Overview, add a **subtle pulsing highlight** on the three most important elements: (1) waste metric, (2) top action card, (3) board view button
- [ ] Add a dismissible **welcome banner** at the top: "Welcome to Strata. Your portfolio summary is below. Start by reviewing the capital actions that need your attention."
- [ ] After dismissal, set localStorage flag so it never shows again
- [ ] Do NOT use a step-by-step modal tour — those feel like training wheels. The product should be self-explanatory.

**Files to create/modify:**
- `apps/web/src/components/shared/first-visit-banner.tsx`
- `apps/web/src/app/(dashboard)/portfolio/page.tsx`
- `apps/web/src/lib/hooks/useFirstVisit.ts`

### 3.3 Command Palette Enhancement

**Current state:** Command palette (Cmd+K) searches pages, assets, decisions, candidates. Functional.

**Target state:** The command palette should be a power-user shortcut that surfaces actions, not just navigation.

**Changes:**
- [ ] Add **action commands**: "Approve all pending retirements", "Generate board report", "Run enforcement sweep"
- [ ] Add **insight queries**: "Show products with negative ROI", "Show expiring value declarations", "Show cost spikes this month"
- [ ] Add **recent activity**: "Last 5 decisions you reviewed"
- [ ] Add keyboard shortcut hints next to common actions

**Files to modify:**
- `apps/web/src/components/shared/command-palette.tsx`

---

## Tier 4: Data Onboarding

*Make the first 48 hours magical.*

### 4.1 CSV Import Workflow (Frontend)

**Current state:** No CSV import UI exists. Data enters only through connectors or manual single-product creation.

**Target state:** A prospect can drop a CSV and see their portfolio in Strata within minutes.

**Changes:**
- [ ] Add a **"Quick Import" page** accessible from Setup: `/setup/import`
- [ ] Step 1: Drag-and-drop CSV upload with file validation (max 50MB, .csv only)
- [ ] Step 2: Column mapping UI — auto-detect common column names (name, domain, cost, owner), allow manual mapping for the rest
- [ ] Step 3: Preview — show first 10 rows as they will appear in Strata, with validation warnings (missing required fields, duplicate names)
- [ ] Step 4: Import — progress bar, row count, success/error summary
- [ ] Step 5: "View your portfolio" CTA → redirect to Portfolio Overview
- [ ] Support two import types: **Products** (name, domain, cost, platform, lifecycle) and **Value Declarations** (product name, monthly value, method, basis)
- [ ] Provide a **downloadable template CSV** with example rows and column descriptions

**Files to create:**
- `apps/web/src/app/(dashboard)/setup/import/page.tsx`
- `apps/web/src/app/(dashboard)/setup/import/components/FileUploader.tsx`
- `apps/web/src/app/(dashboard)/setup/import/components/ColumnMapper.tsx`
- `apps/web/src/app/(dashboard)/setup/import/components/ImportPreview.tsx`
- `apps/web/src/app/(dashboard)/setup/import/components/ImportProgress.tsx`

### 4.2 CSV Import Endpoint (Backend)

**Current state:** No bulk import endpoint.

**Changes:**
- [ ] Create `POST /api/v1/assets/import-csv` — accepts multipart file upload
- [ ] Parse CSV, validate required columns (name, domain required; cost, platform, lifecycle optional)
- [ ] Deduplicate against existing products (match on name + domain)
- [ ] Create products in batch with proper org_id scoping
- [ ] Return import summary: created, updated, skipped, errors
- [ ] Create `POST /api/v1/values/import-csv` for bulk value declarations
- [ ] Add import job tracking model for async processing of large files

**Files to create:**
- `apps/api/app/api/v1/import_csv.py`
- `apps/api/app/services/csv_importer.py`

### 4.3 Template CSV Downloads

**Current state:** No templates available.

**Changes:**
- [ ] Serve template CSVs from a static endpoint or embed in the frontend
- [ ] Products template: `name,domain,business_unit,platform,monthly_cost_usd,lifecycle_stage,owner_email`
- [ ] Value declarations template: `product_name,monthly_value_usd,method,basis`
- [ ] Include 3-5 example rows with realistic data

**Files to create:**
- `apps/web/public/templates/products-import-template.csv`
- `apps/web/public/templates/values-import-template.csv`

---

## Tier 5: Proactive Intelligence

*The product reaches out to you before you reach for it.*

### 5.1 Automated Notification Triggers (Backend)

**Current state:** Notifications model exists with 8 types, but only `capital_freed` is auto-created (on decision approval). All other types are inert.

**Target state:** Every notification type fires automatically based on data conditions.

**Changes:**
- [ ] **cost_spike**: Trigger when a product's monthly cost increases >20% month-over-month
- [ ] **usage_drop**: Trigger when a product's monthly consumers drop >30% month-over-month
- [ ] **value_expiring**: Trigger 30 days before a value declaration's annual review date
- [ ] **lifecycle_change**: Trigger when a product is automatically moved to a new lifecycle stage
- [ ] **retirement_candidate**: Trigger when the candidate generator identifies a new retirement candidate
- [ ] **pricing_activated**: Trigger when a pricing policy is activated
- [ ] **ai_project_flagged**: Trigger when an AI scorecard drops below threshold
- [ ] Run these checks on a schedule (daily or on data sync completion)
- [ ] Add notification preferences per user (which types to receive)

**Files to create/modify:**
- `apps/api/app/services/notification_triggers.py`
- `apps/api/app/services/scheduler.py`
- `apps/api/app/models/config.py` (add notification preferences)

### 5.2 Notification Bell Enhancement (Frontend)

**Current state:** Bell icon with popover list, 50 items max, click-to-navigate, mark-all-read. Functional.

**Changes:**
- [ ] Add **notification grouping** by type: group multiple cost spikes into "3 products had cost spikes this week" with expandable detail
- [ ] Add **notification sound** option (subtle, off by default)
- [ ] Add **unread count in browser tab title**: "(3) Strata" when notifications are pending
- [ ] Add **notification detail view**: clicking a notification shows context before navigating (what changed, how much, since when)
- [ ] Add a **notification settings page**: per-type toggles, email delivery preferences

**Files to modify:**
- `apps/web/src/components/layout/notification-bell.tsx`
- Create `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`

### 5.3 Email Digests

**Current state:** No email sending capability.

**Changes:**
- [ ] Add email service integration (SendGrid, SES, or SMTP)
- [ ] Weekly digest email: "Your Strata Portfolio This Week" — top metrics, new notifications, pending decisions
- [ ] Configurable per user: daily, weekly, monthly, off
- [ ] Include direct action links: "Review this decision" → deep link into Strata

**Files to create:**
- `apps/api/app/services/email_service.py`
- `apps/api/app/services/digest_generator.py`

---

## Tier 6: Financial Voice

*Every pixel speaks the language of capital, not data engineering.*

### 6.1 Audit All Labels and Copy

**Current state:** The product generally uses financial language but some surfaces still lean technical. The brand guidelines define the vocabulary but it is not enforced everywhere.

**Changes:**
- [ ] Audit every page title, subtitle, KPI label, tooltip, and empty state message
- [ ] Replace all instances of:
  - "dataset" → "data product"
  - "data quality" → "data reliability" or "data freshness"
  - "score" (generic) → context-specific: "economic signal", "capital efficiency", "readiness"
  - "archive" → "sunset" or "retire"
  - "metadata" → "product attributes" or "capital attributes"
- [ ] Ensure every metric is expressed in dollars where possible. Not "usage dropped 30%" but "usage drop represents $42K/month in at-risk value"
- [ ] Add dollar context to ESE scores: "ESE 34 — products below 40 typically cost $X/month more than they return"
- [ ] Add dollar context to lifecycle stages: "12 products in Decline — total monthly cost: $380K"

**Files to modify:** All page.tsx and component files across the dashboard.

### 6.2 Add CFO-Friendly Tooltips

**Current state:** KPI cards have info tooltips. Some are technical ("Economic Signal Score measures the composite health of a data product").

**Target state:** Every tooltip should answer "why should the CFO care?"

**Changes:**
- [ ] Rewrite all KPI tooltips in financial terms:
  - ESE Score: "Measures the financial health of this data product. Below 40 indicates the product may cost more than it returns."
  - Capital Misallocated: "Money being spent on data products that have not demonstrated measurable business value."
  - Decision Latency: "Average time between identifying a capital issue and resolving it. Each day of delay costs approximately $X."
  - Capital Freed: "Money recovered through governance decisions — retirements, reallocations, and pricing policies."
- [ ] Add tooltips to chart axes and legends (not just KPI cards)

**Files to modify:** All component files with Tooltip usage.

### 6.3 Contextual Insight Sentences

**Current state:** Some pages show insights from the executive summary API. Not all pages have them.

**Target state:** Every major section should have a one-sentence insight that gives the number meaning.

**Changes:**
- [ ] Portfolio Overview: Below each KPI, add a single sentence of context. "$2.4M/mo — 12% higher than 6 months ago, primarily driven by 3 new products in the Growth stage."
- [ ] Lifecycle page: "67% of your portfolio is in Active or Growth stage. The 14 products in Decline represent $380K/month in at-risk spend."
- [ ] Decisions page: "You have resolved 23 decisions this quarter, freeing $1.2M in annualized spend. 8 decisions are overdue."
- [ ] These should be **computed and cached**, not hardcoded

**Files to modify:** All major page.tsx files.

---

## Tier 7: UX Polish and Completeness

*Death to dead buttons. Death to rough edges.*

### 7.1 Fix All Dead Buttons (15 identified)

**Current state:** 15 buttons across the app have no onClick handler or show "coming soon" toasts.

**Changes:**
- [ ] **HelpCircle button** (every page): Wire to a help drawer or contextual documentation panel. Show keyboard shortcuts, page-specific guidance, and a link to full documentation.
- [ ] **Asset Detail — Revalidate button**: Open a confirmation dialog that creates a "revalidation" decision for this product
- [ ] **Asset Detail — Edit button**: Open an edit form for product metadata (name, domain, business unit, platform)
- [ ] **Asset Detail — Declare Value button**: This should already open ValueDeclarationDialog — verify it works
- [ ] **Asset Detail — Start Retirement Review**: Create a retirement decision for this product with pre-filled context
- [ ] **Asset Detail — Dismiss button**: Mark a flagged product as reviewed/dismissed
- [ ] **Setup — Add Connector**: In demo mode, show a proper dialog explaining the connector wizard is available in production, with a "Contact Us" CTA. In production, open a multi-step connector setup wizard
- [ ] **Setup — Sync Now**: Wire to `POST /connectors/{id}/run` and show sync progress
- [ ] **Setup — Settings**: Open connector configuration panel
- [ ] **Setup — Connect Platform, Manage Teams, Manage Roles, Configure ROI**: Same pattern — either implement or provide clear "production only" explanation with contact CTA
- [ ] **Simulate — Export Summary**: Implement CSV export of simulation results
- [ ] **Simulate — Save Scenario**: Implement scenario persistence to backend

**Files to modify:** Multiple component files across assets, setup, simulate pages.

### 7.2 Add Route-Level Error Boundary

**Current state:** No `error.tsx` files. Unhandled JS errors show a white screen.

**Changes:**
- [ ] Create `apps/web/src/app/(dashboard)/error.tsx` — catches all dashboard errors
- [ ] Show the existing `ErrorState` component with retry button and error code
- [ ] Log errors to console in dev, to an error tracking service in production
- [ ] Add `error.tsx` to key nested routes: `/assets/[id]/error.tsx`, `/decisions/[id]/error.tsx`

**Files to create:**
- `apps/web/src/app/(dashboard)/error.tsx`
- `apps/web/src/app/(dashboard)/assets/[id]/error.tsx`
- `apps/web/src/app/(dashboard)/decisions/[id]/error.tsx`

### 7.3 Consolidate Empty States

**Current state:** 4 inline "No data" divs instead of the proper `EmptyState` component.

**Changes:**
- [ ] Replace inline empty states in `/capital-impact` (line 70-76)
- [ ] Replace inline empty states in `/capital-review` (lines 252, 408-410, 487-489)
- [ ] Use the existing `EmptyState` component with contextual messaging
- [ ] Add action buttons to empty states where appropriate: "Import data to get started" → CSV import page

**Files to modify:**
- `apps/web/src/app/(dashboard)/capital-impact/page.tsx`
- `apps/web/src/app/(dashboard)/capital-review/page.tsx`

### 7.4 Add Missing Accessibility

**Current state:** Good foundation (focus indicators, keyboard nav, semantic HTML) but 5 icon buttons missing aria-labels.

**Changes:**
- [ ] Add `aria-label` to: Settings icon button, Info icon buttons, Toast dismiss button, NotificationBell button, HelpCircle button
- [ ] Ensure all chart components have `aria-label` descriptions: "Capital flow chart showing monthly spend and savings over 6 months"
- [ ] Add `role="status"` to notification count badge
- [ ] Test full keyboard navigation flow on all major pages

**Files to modify:** Various component files.

### 7.5 Remove Deprecated Code

**Current state:** `topbar.tsx` still exists but is replaced by `page-header.tsx`.

**Changes:**
- [ ] Delete `apps/web/src/components/layout/topbar.tsx` if no longer imported
- [ ] Verify no component references it
- [ ] Clean up any other dead imports

---

## Tier 8: Delight Factors

*The details that make someone say "this is beautifully built."*

### 8.1 Animated Number Transitions

**Current state:** `animate-count-up` class exists in globals.css but is not applied to KPI values.

**Changes:**
- [ ] Apply count-up animation to all financial figures on Portfolio Overview when they first render
- [ ] When data refreshes, animate from old value to new value (not from 0)
- [ ] Use `tabular-nums` font feature to prevent layout shift during animation
- [ ] Apply to: Capital Header metrics, Decision Cockpit totals, Inaction Cost numbers

**Files to modify:**
- `apps/web/src/app/(dashboard)/portfolio/components/CapitalHeader.tsx`
- Create `apps/web/src/lib/hooks/useAnimatedNumber.ts`

### 8.2 Micro-Celebrations on Action Completion

**Current state:** Toast notifications on mutations. Functional but unremarkable.

**Changes:**
- [ ] When a decision is approved: show a **capital freed counter** that briefly animates the total capital freed upward. "Capital freed: $1.2M → $1.32M (+$120K)"
- [ ] When all pending decisions are resolved: show a **congratulations banner** on the Portfolio page: "All decisions resolved. Your portfolio is fully governed."
- [ ] When a retirement saves money: pulse the "Capital Freed" KPI in teal momentarily
- [ ] Keep celebrations subtle and institutional — no confetti, no emojis. A brief glow, a number ticking upward, a green checkmark fade-in.

### 8.3 Contextual Loading States

**Current state:** Skeleton loaders are consistent and well-animated. All pages have them.

**Changes:**
- [ ] Add **data freshness indicators**: "Last updated: 2 hours ago" on Portfolio Overview
- [ ] Add **stale data warning**: If data is older than 24 hours, show subtle amber indicator: "Data may be stale — last sync was 3 days ago. Sync now?"
- [ ] Show **progressive loading**: Load KPI cards first (they are the most important), then charts, then tables. Users see the diagnosis metrics before the supporting detail.

### 8.4 Smart Defaults and Auto-Focus

**Current state:** Pages load and wait for user interaction.

**Changes:**
- [ ] On Decision Detail page: auto-scroll to the decision summary and pre-focus the action area
- [ ] On Value Declaration dialog: auto-focus the dollar amount input
- [ ] On Command Palette: auto-focus search input (already done)
- [ ] On CSV import: auto-detect column names and pre-map obvious ones (name, cost, domain)
- [ ] On Simulate: remember the last simulation parameters per session

### 8.5 Keyboard Power-User Shortcuts

**Current state:** Command palette has Cmd+K. PageHeader shows a help dialog with some shortcuts.

**Changes:**
- [ ] Add global shortcuts:
  - `G P` — go to Portfolio
  - `G D` — go to Decisions
  - `G L` — go to Lifecycle
  - `G B` — go to Board View
  - `G A` — go to Assets
- [ ] Add action shortcuts:
  - `A` on decision page — approve current decision
  - `R` on decision page — reject current decision
  - `N` — next decision in queue
  - `P` — previous decision in queue
- [ ] Show shortcuts in the help dialog (already exists, needs content)

**Files to modify:**
- `apps/web/src/lib/hooks/useKeyboardShortcuts.ts` (create)
- `apps/web/src/components/layout/page-header.tsx` (update help dialog)

---

## Tier 9: Export and Sharing

*Every insight should be shareable without screenshots.*

### 9.1 CSV Export on All Tables

**Current state:** No CSV export anywhere. Simulate page shows "CSV export coming soon" toast.

**Changes:**
- [ ] Add a "Download CSV" button to every major table:
  - Assets list → `products.csv`
  - Decisions list → `decisions.csv`
  - Capital Impact events → `capital-events.csv`
  - Lifecycle overview → `lifecycle-summary.csv`
  - Retirement candidates → `retirement-candidates.csv`
- [ ] Use client-side CSV generation (no backend needed for basic exports)
- [ ] Include all visible columns plus key hidden data (IDs, dates)
- [ ] Format financial values with currency symbol and 2 decimal places

**Files to create:**
- `apps/web/src/lib/utils/csv-export.ts`
- Add export buttons to table components

### 9.2 Chart Image Export

**Current state:** Charts are interactive Recharts components. No export.

**Changes:**
- [ ] Add a "Copy chart" button on hover for all major charts
- [ ] Use `html2canvas` or Recharts' built-in SVG export to generate PNG
- [ ] Copy to clipboard for easy paste into presentations and emails
- [ ] This is how Strata content gets into slide decks organically

**Files to create:**
- `apps/web/src/lib/utils/chart-export.ts`
- Add export overlay to chart components

### 9.3 Shareable Deep Links

**Current state:** Pages use standard Next.js routing. URLs work but are not optimized for sharing.

**Changes:**
- [ ] Ensure all filter states are reflected in URL params (stage filter, sort order, search query on Assets page)
- [ ] Add "Copy link" button on Asset Detail and Decision Detail pages
- [ ] When someone opens a shared link, highlight the relevant item and show a subtle "Shared by [Name]" indicator

---

## Tier 10: Production Hardening

*Things that must work before a real customer touches it.*

### 10.1 Help System

**Current state:** HelpCircle button exists on every page but is non-functional.

**Changes:**
- [ ] Create a **help drawer** that slides in from the right
- [ ] Content per page: 2-3 bullet points explaining what this page shows and what actions are available
- [ ] Include **keyboard shortcuts** for the current page
- [ ] Include **glossary tooltips** for key terms (ESE, Composite Value, Capital Freed, CPI)
- [ ] Include a "Contact support" link
- [ ] Load content from a simple JSON/markdown file — not hardcoded in components

**Files to create:**
- `apps/web/src/components/shared/help-drawer.tsx`
- `apps/web/src/lib/help-content.ts`

### 10.2 Proper Demo Mode Polish

**Current state:** Demo mode shows an amber banner and disables mutations. Functional but could be more inviting.

**Changes:**
- [ ] Replace the generic demo banner with a **contextual demo CTA**: "You are viewing demo data. Import your own data to see your portfolio."
- [ ] Add a "Request a demo with your data" button that links to a contact form or calendly
- [ ] In demo mode, add subtle "sample data" watermarks on charts so users do not confuse demo data with real data
- [ ] Make the demo banner dismissible (persistent dismiss via localStorage)

**Files to modify:**
- `apps/web/src/components/shared/demo-mode-banner.tsx`

### 10.3 Performance Optimization

**Current state:** Charts are lazy-loaded via `next/dynamic`. Good baseline.

**Changes:**
- [ ] Add `React.memo` to expensive list item components (DataProductRow, DecisionRow)
- [ ] Virtualize long lists (Assets table with 280+ products should use react-window or similar)
- [ ] Add SWR or React Query for data fetching with stale-while-revalidate pattern (if not already using it)
- [ ] Preload the Board View data when the user is on Portfolio (likely next navigation)
- [ ] Audit and optimize bundle size — ensure no unused dependencies are shipped

### 10.4 SEO and Meta for Landing Page

**Current state:** Landing page exists but metadata may not be optimized.

**Changes:**
- [ ] Add proper Open Graph tags: title, description, image (for social sharing)
- [ ] Add structured data (JSON-LD) for the landing page
- [ ] Ensure the landing page is crawlable and fast (check Core Web Vitals)
- [ ] Add a favicon and apple-touch-icon if not already present

---

## Tier 11: The Marketplace as Discovery Engine

*The internal marketplace should make finding valuable data feel like browsing a curated store.*

### 11.1 Enhance Marketplace Cards

**Current state:** 3-column grid with product cards showing name, domain, cost, ROI, consumers, trust score, lifecycle pill. Functional but flat.

**Changes:**
- [ ] Add **usage sparkline** to each card (7-day trend)
- [ ] Add **"Popular" badge** for products in the top 10% by consumer count
- [ ] Add **"Rising" badge** for products with >20% consumer growth month-over-month
- [ ] Add **consumer team avatars** (show first 3 team icons)
- [ ] Add **category filters** (domain, business unit, lifecycle stage) as pill-based filters above the grid
- [ ] Add **sort options**: "Most used", "Best ROI", "Newest", "Most subscribed"

**Files to modify:**
- `apps/web/src/app/(dashboard)/marketplace/page.tsx`
- `apps/web/src/app/(dashboard)/marketplace/components/` (product card component)

### 11.2 Product Reviews and Ratings

**Current state:** No review system.

**Changes:**
- [ ] Add a 1-5 star rating on each marketplace product (consumer teams can rate)
- [ ] Add a brief text review: "How valuable is this product to your team?" (max 280 chars)
- [ ] Show average rating on the marketplace card
- [ ] Show review count and most recent review on product detail page
- [ ] This creates social proof and helps product owners understand their consumers' perception

**Files to create:**
- `apps/api/app/models/review.py`
- `apps/api/app/api/v1/reviews.py`
- `apps/web/src/app/(dashboard)/marketplace/components/ProductReview.tsx`

---

## Tier 12: Simulation and What-If

*Let users play with scenarios and see consequences before committing.*

### 12.1 Custom Projection Scenarios

**Current state:** Capital Projection page shows 3 fixed scenarios (Passive, Governance, Active). Users cannot adjust parameters.

**Changes:**
- [ ] Add a **"Custom Scenario" builder**: let users adjust key parameters:
  - Decision velocity (days to decision)
  - Retirement aggressiveness (% of decline products retired per quarter)
  - Cost growth rate assumption
  - Value declaration coverage target
- [ ] Show the custom scenario as a 4th line on the projection chart
- [ ] Allow users to **save and name custom scenarios** for future reference
- [ ] Add a "Share scenario" button that copies a deep link with parameters encoded

**Files to modify:**
- `apps/web/src/app/(dashboard)/capital-projection/page.tsx`
- `apps/web/src/app/(dashboard)/capital-projection/components/`

### 12.2 Simulation History

**Current state:** Simulate page runs pricing simulations but does not persist results for review.

**Changes:**
- [ ] Add a **simulation history panel**: list of past simulations with date, product, model, and result summary
- [ ] Allow comparing two simulations side by side
- [ ] Show which simulations were activated as policies

**Files to create:**
- `apps/web/src/app/(dashboard)/simulate/components/SimulationHistory.tsx`
- Backend: Add simulation result persistence model

---

## Implementation Priority Matrix

| Tier | Impact | Effort | Do When |
| --- | --- | --- | --- |
| **Tier 1**: Diagnosis Moment | Critical | Medium | Week 1-2 |
| **Tier 2**: Board Export | Critical | Medium | Week 2-3 |
| **Tier 3**: Narrative Flow | High | Low | Week 3-4 |
| **Tier 4**: Data Onboarding | Critical | High | Week 3-5 |
| **Tier 5**: Proactive Intelligence | High | Medium | Week 4-6 |
| **Tier 6**: Financial Voice | High | Low | Week 2-4 (ongoing) |
| **Tier 7**: UX Polish | Medium | Low | Week 1-2 (quick wins) |
| **Tier 8**: Delight Factors | Medium | Low-Medium | Week 4-6 |
| **Tier 9**: Export/Sharing | Medium | Low | Week 3-4 |
| **Tier 10**: Production Hardening | High | Medium | Week 4-6 |
| **Tier 11**: Marketplace | Low | Medium | Week 6+ |
| **Tier 12**: Simulation | Low | Medium | Week 6+ |

---

## Quick Wins (Can Be Done Today)

These items require minimal code and can be shipped immediately:

1. [ ] Fix 5 missing `aria-label` attributes
2. [ ] Replace 4 inline empty states with `EmptyState` component
3. [ ] Delete deprecated `topbar.tsx`
4. [ ] Add `error.tsx` error boundary (use existing ErrorState component)
5. [ ] Rewrite KPI tooltips in financial language
6. [ ] Add "Last updated" timestamp to Portfolio Overview
7. [ ] Add count-up animation to Capital Header metrics
8. [ ] Apply `tabular-nums` font feature consistently to all financial figures
9. [ ] Add download filename to Board View print dialog
10. [ ] Make demo banner dismissible

---

*This plan is comprehensive by design. Not everything needs to happen at once. Tier 1 + Tier 2 + Tier 7 quick wins get you to "undeniable demo" within 2-3 weeks. Everything else builds on that foundation.*
