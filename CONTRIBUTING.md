# Contributing to Strata

Thank you for your interest in contributing to Strata. This guide covers everything you need to get up and running, follow our conventions, and submit high-quality pull requests.

## Setup Instructions

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ (or use Docker)
- npm 10+

### Clone and Install

```bash
git clone <repo-url> && cd strata
npm install          # installs all workspace dependencies (apps/web, packages/shared)
```

### Environment Configuration

```bash
# Copy the example env file and fill in your local values
cp apps/web/.env.example apps/web/.env.local

# Required variables:
# NEXT_PUBLIC_API_URL=http://localhost:8000   (omit for demo mode)
```

### Database Setup

```bash
# Option 1: Docker (recommended)
docker compose up db -d

# Option 2: Local PostgreSQL
createdb strata_dev

# Run migrations
cd apps/api && alembic upgrade head
```

### Start the API

```bash
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload   # starts on :8000
```

## Development Workflow

### Start the Dev Server

```bash
npm run dev          # starts Next.js on :3000
```

### Run Tests

```bash
# Frontend (Vitest + React Testing Library)
cd apps/web && npm test

# With coverage
cd apps/web && npm run test:coverage

# Backend
cd apps/api && pytest --cov=app
```

### Type Check and Lint

```bash
# Full quality check (types + lint + tests)
cd apps/web && npm run check

# Type check only
cd apps/web && npx tsc --noEmit

# Lint only
cd apps/web && npm run lint
```

## Architecture Overview

Strata is a monorepo managed with npm workspaces and Turborepo:

```
strata/
  apps/
    web/           Next.js frontend (App Router, Tailwind CSS, shadcn/ui)
    api/           FastAPI backend (SQLAlchemy, Alembic, PostgreSQL)
  packages/
    shared/        Shared TypeScript types and constants
  docs/            Project documentation
  infra/           Infrastructure configuration
  scripts/         Build and automation scripts
```

| Path | Stack | Purpose |
| --- | --- | --- |
| `apps/web` | Next.js, React 19, Tailwind CSS, shadcn/ui | Browser-based financial dashboard |
| `apps/api` | FastAPI, SQLAlchemy, Alembic | REST API and business logic |
| `packages/shared` | TypeScript | Types and constants shared across apps |

### Demo Mode

When `NEXT_PUBLIC_API_URL` is unset the app runs in **demo mode**:
- `isAPIEnabled` returns `false` -- all reads come from seed data in `src/lib/seed/`.
- `canMutate` returns `false` -- write actions show a toast instead of calling the API.
- Useful for local design work, demos, and CI preview deploys.

## Code Conventions

### Import Order

Maintain a consistent import order in all TypeScript/React files:

```ts
// 1. React / Next.js
import { useState } from "react";
import Link from "next/link";

// 2. Third-party libraries
import { clsx } from "clsx";

// 3. Internal aliases (@/ paths)
import { formatCurrency } from "@/lib/format";
import { apiGet } from "@/lib/api/client";

// 4. Relative imports (sibling components, types)
import { DatasetRow } from "./dataset-row";
```

### Component Patterns

- **Page components** live in `src/app/` following the App Router file conventions.
- **Domain components** live in `src/components/<domain>/` (e.g., `datasets/`, `portfolio/`).
- **Shared UI** lives in `src/components/shared/` with a barrel export at `index.ts`.
- **Primitives (shadcn/ui)** live in `src/components/ui/`.
- Use `PageShell` for page-level layout (sticky header, breadcrumbs, action slots).
- Use skeleton loaders (`SkeletonBar`, `KPISkeleton`, `CardSkeleton`, `TableSkeleton`) for every async data boundary -- no layout shift.

### Hooks Pattern

- Custom hooks live in `src/lib/hooks/`.
- Data-fetching hooks follow the naming convention `use<Resource>` (e.g., `useDatasets`, `usePortfolio`).
- Hooks that wrap the API client should fall back to seed data when `isAPIEnabled` is `false`.

### Error Handling

- Use `APIError` from `@/lib/api/client` for typed API errors.
- Display errors via the `ErrorState` component or the `useToast` hook.
- Never swallow errors silently -- always surface them to the user or log them in development.

### Mutations via useMutation

All write operations (create, update, delete) should use a mutation pattern:

```tsx
import { MutationButton } from "@/components/shared";
import { apiPost } from "@/lib/api/client";

// MutationButton handles loading, error, and disabled states automatically
<MutationButton
  label="Approve"
  mutationFn={() => apiPost(`/api/v1/datasets/${id}/approve`, {})}
  onSuccess={() => { /* refetch or redirect */ }}
/>
```

## PR Process

### Branch Naming

Use the following prefixes:

- `feat/short-description` -- new features
- `fix/short-description` -- bug fixes
- `chore/short-description` -- maintenance, refactoring, tooling
- `docs/short-description` -- documentation only

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dataset quality score column
fix: resolve pagination reset on filter change
chore: upgrade Next.js to 16.x
docs: add API authentication guide
```

### PR Description Template

```markdown
## Summary
Brief description of what changed and why.

## Changes
- Bullet list of specific changes

## Testing
- How you tested the changes
- Relevant test commands

## Screenshots
(If UI changes, include before/after screenshots)
```

### CI Checks

All of the following must pass before a PR can be merged:

- **Type check** -- `tsc --noEmit`
- **Lint** -- `next lint --dir src`
- **Tests** -- `vitest run` (80% coverage threshold)
- **Build** -- `next build` must succeed
- **Review** -- at least one approval required

## Deprecating an API Endpoint

When an API endpoint is being replaced or removed, use the deprecation headers middleware to notify consumers in advance. This follows [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594) conventions.

### How to deprecate

1. Open `apps/api/app/middleware/deprecation.py`.
2. Add an entry to the `DEPRECATED_ENDPOINTS` dictionary. The key is the path prefix; the value is a dict with `sunset` (ISO-8601 removal date) and an optional `message`:

```python
DEPRECATED_ENDPOINTS: dict[str, dict[str, str]] = {
    "/api/v1/legacy-reports": {
        "sunset": "2026-06-01",
        "message": "Use /api/v1/reports instead.",
    },
}
```

3. The middleware is already registered in `apps/api/app/main.py`, so no further wiring is needed.

### What consumers see

Any request whose path starts with a key in `DEPRECATED_ENDPOINTS` will receive these response headers:

| Header | Value | Purpose |
| --- | --- | --- |
| `Deprecation` | `true` | Signals the endpoint is deprecated |
| `Sunset` | e.g. `2026-06-01` | Date the endpoint will be removed |
| `X-Deprecation-Notice` | Free-text message | Human-readable migration guidance |

### Best practices

- Set the `sunset` date at least 90 days in the future to give consumers time to migrate.
- Include a `message` pointing to the replacement endpoint.
- Announce the deprecation in the changelog and any relevant Slack channels.
- After the sunset date, remove the endpoint code and the `DEPRECATED_ENDPOINTS` entry.

## UI Patterns

See [`apps/web/DESIGN_SYSTEM.md`](apps/web/DESIGN_SYSTEM.md) for detailed guidance on colors, spacing, component tokens, and chart styling.

## Common Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run check            # Type-check + lint + test
npm run test             # Run Vitest
npm run test:coverage    # Run Vitest with coverage
docker compose up        # Start full stack (API + DB + Web)
```
