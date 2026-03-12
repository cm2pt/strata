# Strata UX Standards

> Patterns and rules for building consistent, enterprise-grade UI across every page.

---

## Page Layout Standard

Every page MUST follow this structure:

```tsx
<div className="min-h-screen">
  <PageHeader title="..." subtitle="..." />
  <PageShell>
    {/* Page content */}
  </PageShell>
</div>
```

### PageHeader

**File**: `src/components/layout/page-header.tsx`

Replaces `Topbar`. Sticky header with title, subtitle, action slots, and breadcrumbs.

```tsx
import { PageHeader } from "@/components/layout/page-header";

// List page
<PageHeader
  title="Portfolio"
  subtitle="Capital performance overview"
  primaryAction={<Button>Board Mode</Button>}
  secondaryActions={<><Button>Allocation</Button><Button>Decisions</Button></>}
/>

// Detail page — with breadcrumbs
<PageHeader
  title={product.name}
  subtitle={`${product.domain} · ${product.businessUnit}`}
  breadcrumbs={[
    { label: "Assets", href: "/assets" },
    { label: product.name },
  ]}
/>
```

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Page heading (required) |
| `subtitle` | `string?` | Description line |
| `primaryAction` | `ReactNode?` | Main CTA button (right side) |
| `secondaryActions` | `ReactNode?` | Additional buttons |
| `breadcrumbs` | `{ label, href? }[]?` | Nav trail for detail pages |
| `chips` | `ReactNode?` | Inline badges next to title |

---

## Loading States (Skeletons)

**File**: `src/components/shared/skeleton.tsx`

Every page with async data MUST show skeleton loading instead of "Loading..." text.

### Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `SkeletonBar` | Base shimmer bar | `className` |
| `KPISkeleton` | KPI card placeholder | `className` |
| `CardSkeleton` | Content card placeholder | `lines?` (default 4), `className` |
| `TableSkeleton` | Data table placeholder | `rows?` (default 5), `columns?` (default 4), `className` |

### Pattern

```tsx
if (loading) {
  return (
    <div className="min-h-screen">
      <PageHeader title="Assets" subtitle="All registered data products" />
      <PageShell>
        <SkeletonBar className="h-9 w-full max-w-md" />
        <TableSkeleton rows={8} columns={8} />
      </PageShell>
    </div>
  );
}
```

### Skeleton Selection Guide

| Page Type | Skeleton Layout |
|-----------|----------------|
| Dashboard (KPIs + charts) | KPISkeleton row + CardSkeleton grid |
| Table page | SkeletonBar (search) + TableSkeleton |
| Detail page | Breadcrumbs + KPISkeleton row + CardSkeleton stack |
| Settings page | CardSkeleton(lines=4) stack |

---

## Error States

**File**: `src/components/shared/error-state.tsx`

Use `ErrorState` when data fails to load after the loading phase completes.

```tsx
import { ErrorState } from "@/components/shared/error-state";

<ErrorState
  title="Failed to load portfolio data"
  description="We couldn't load the capital model. Please try again."
  onRetry={() => window.location.reload()}
/>
```

---

## Empty States

**File**: `src/components/shared/empty-state.tsx`

Use `EmptyState` when data loads successfully but contains no items.

```tsx
import { EmptyState } from "@/components/shared/empty-state";

<EmptyState
  icon={Database}
  title="No products match your filters"
  description="Try adjusting your search or filter criteria."
  action={<Button onClick={clearFilters}>Clear filters</Button>}
/>
```

---

## Navigation

### Sidebar Groups

Sidebar is organized into workflow-oriented groups:

| Group | Routes | Purpose |
|-------|--------|---------|
| **Discover** | Candidates, Assets | Find and evaluate data products |
| **Govern** | Lifecycle, Decisions | Manage lifecycle and capital decisions |
| **Optimize** | Allocation, Capital Impact, AI Scorecard, Simulate | Optimize spend and readiness |
| **Measure** | Portfolio, Capital Review, Projection | Measure performance and forecast |
| **Platform** | Marketplace | Internal data marketplace |
| (bottom) | Setup | Organization configuration |

### Command Palette (Cmd+K)

Global search across pages, assets, decisions, and candidates. Opens with `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux). Also accessible via sidebar search button.

---

## The 5-Second Rule

Every page must answer its core question within 5 seconds of loading:

| Page | Core Question |
|------|--------------|
| Portfolio | "What's our total data spend and what should I do next?" |
| Decisions | "Which decisions need my approval and what's the capital impact?" |
| Assets | "Which products are costing the most and performing the worst?" |
| Lifecycle | "Which products need attention (retirement, cost spikes, stalled)?" |
| Capital Review | "Where should we reallocate capital for maximum impact?" |
