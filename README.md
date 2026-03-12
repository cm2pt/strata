# Strata

**The financial operating system for enterprise data portfolios.**

> Not a catalog. Not a governance portal. Not BI.
> This is the financial control plane for data capital.

Track the true cost, value, and ROI of every data product. Turn decisions into logged capital events. Prove economic behavior change to the board.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│  Next.js 16 Web │────▶│  FastAPI + SQLAlchemy │────▶│  PostgreSQL 16    │
│  (port 3000)    │     │  (port 8000)          │     │  (port 5433)      │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
                              │
                              ├── JWT Auth (15 roles, 32 permissions, full RBAC)
                              ├── 18 API routers, 53 endpoints
                              ├── Connector framework (mock / replay / discovery_replay)
                              ├── Candidate generation engine (4 evidence streams)
                              ├── Attribution engine (events → products → ROI)
                              ├── Capital event ledger (retirement, reallocation, pricing, AI)
                              └── Alembic migrations (8 revisions)
```

**Frontend:** 20 pages, design system, recharts, three-layer RBAC, toast notifications, DEMO_MODE seed fallback
**Backend:** 70+ Python files, 39 DB tables, real async queries, seeder with 13 products + 5 candidates, 158 tests
**DB:** PostgreSQL 16 with asyncpg

---

## Quick Start (Docker)

```bash
docker compose up --build
```

Wait ~30 seconds for DB + migrations + seeder, then open http://localhost:3000

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5433 | `postgresql://strata:localdev@localhost:5433/strata` |
| FastAPI API | 8000 | http://localhost:8000/docs |
| Next.js Web | 3000 | http://localhost:3000 |

---

## Demo Credentials

All demo users share password: **`demo123`**

| Email | Role | Sidebar Sees | Key Permissions |
|-------|------|-------------|-----------------|
| `admin@demo.com` | Admin | Everything | All 32 permissions |
| `cfo@demo.com` | CFO | Portfolio, Decisions, Capital Impact, Allocation | `decisions:approve`, `capital:read/export` |
| `cdo@demo.com` | CDO | Portfolio, Assets, Lifecycle, AI Scorecard, Candidates | `ai:flag`, `candidates:promote`, `lifecycle:read` |
| `owner@demo.com` | Product Owner | Assets, Decisions, Lifecycle | `products:write`, `decisions:create` |
| `consumer@demo.com` | Consumer | Portfolio, Marketplace | `marketplace:read/subscribe` |

The platform enforces **15 roles** with **32 granular permissions** — sidebar items, action buttons, and API endpoints are all gated. Try logging in as different personas to see how the UI adapts.

---

## 12-Minute Demo Script

Walk through the full story: from automated discovery to promotion, capital impact, and boardroom-ready metrics.

### 1. Login & Portfolio Overview (1 min)

```bash
# API login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cfo@demo.com","password":"demo123"}'
# → save the access_token

export TOKEN="<paste_token>"
```

Or log in at http://localhost:3000 as `cfo@demo.com` / `demo123`.

- **Portfolio:** 13 products, total cost, average ROI, consumer trends
- **Executive Summary:** AI-generated insights, do-nothing projection

### 2. Discovery Inbox & Candidate Promotion (2 min)

Navigate to `/candidates`:
- **5 pre-seeded candidates** from cross-platform evidence (Snowflake, Databricks, dbt, Power BI, S3)
- **Customer 360** at 95% confidence — evidence from dbt exposure + Power BI dataset + 5 warehouse tables
- **Filter** by status: New, Under Review, Promoted, Ignored

Click into **Customer 360** to see:
- Confidence breakdown (Power BI +45, dbt +35, usage +25, penalty -10)
- Source assets table (7 assets across 4 platforms)
- Consumer teams breakdown (156 monthly consumers)
- **Promote to Product** button — creates a real DataProduct, logs a decision, updates portfolio

Or via API:
```bash
# List candidates
curl -s http://localhost:8000/api/v1/candidates/ \
  -H "Authorization: Bearer $TOKEN"

# Full discovery pipeline (ingest from 5 platforms + generate candidates)
curl -s -X POST http://localhost:8000/api/v1/candidates/ingest \
  -H "Authorization: Bearer $TOKEN"

# Promote a candidate to Data Product
curl -s -X POST http://localhost:8000/api/v1/candidates/{id}/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Customer 360","domain":"Customer Analytics","businessUnit":"Marketing","platform":"snowflake","ownerId":"<user_id>"}'
```

### 3. Explore Assets & Lifecycle (2 min)

- **Assets** (`/assets`) — sortable/filterable table, click any product for full P&L
- **Asset Detail** (`/assets/[id]`) — cost breakdown, usage trends, value declarations
- **Lifecycle** (`/lifecycle`) — stage distribution, retirement candidates, cost spikes

### 4. Run Connector Sync (1 min)

```bash
# List connectors
curl -s http://localhost:8000/api/v1/connectors/ \
  -H "Authorization: Bearer $TOKEN"

# Run full ingestion + attribution pipeline
curl -s -X POST http://localhost:8000/api/v1/connectors/{id}/run \
  -H "Authorization: Bearer $TOKEN"
```

This triggers: discover assets &#8594; fetch usage events &#8594; fetch cost events &#8594; attribution mapping &#8594; monthly aggregates &#8594; ROI computation &#8594; portfolio snapshot &#8594; lifecycle flags.

### 5. Decisions & Capital Events (2 min)

- **Decisions** (`/decisions`) — 8 pre-seeded decisions
- **Approve** a retirement decision &#8594; capital freed event logged
- **Delay** with reason and date &#8594; decision goes to "delayed" status
- **Savings Summary** at top — cumulative capital freed over time

### 6. Capital Impact Dashboard (1 min)

Navigate to `/capital-impact`:
- Total Capital Freed, Budget Reallocated, AI Spend Reduced
- ROI Delta: before/after portfolio comparison
- Capital by Type: retirement, cost optimization, reallocation, pricing, AI
- Recent Events: audit trail of every capital event

### 7. AI Scorecard & Kill Switch (1 min)

Navigate to `/ai-scorecard`:
- 13 products scored on 5 dimensions (cost, value, confidence, ROI, dependency risk)
- Color-coded risk levels. Flag high-risk for review. Kill flagged projects.

### 8. Board View (1 min)

Navigate to `/portfolio/board-view`:
- 6-slide executive presentation
- Slide 6: **Capital Impact** — the money story for the board

---

## API Endpoints (53 total, all RBAC-enforced)

```
Auth:              POST /api/v1/auth/login, /register, /me, /refresh, /users, /switch-role, /logout
Portfolio:         GET  /api/v1/portfolio/summary, /cost-trend, /roi-history, /executive-summary
Assets:            GET  /api/v1/assets/, /{id}, /{id}/metrics  |  POST /
Lifecycle:         GET  /api/v1/lifecycle/overview
Decisions:         GET  /api/v1/decisions/, /savings-summary  |  POST /, /{id}/approve, /{id}/reject, /{id}/delay, /{id}/approve-retirement, /{id}/execute
Candidates:        GET  /api/v1/candidates/, /{id}  |  POST /{id}/promote, /{id}/ignore, /ingest, /{id}/flag-retirement
Connectors:        GET  /api/v1/connectors/  |  POST /, /{id}/test, /{id}/run
Allocation:        GET  /api/v1/allocation/summary, /quartile-analysis  |  POST /approve-reallocation
Benchmarks:        GET  /api/v1/benchmarks/
Simulate:          POST /api/v1/simulate/run
Marketplace:       GET  /api/v1/marketplace/products  |  POST /subscribe
Capital Impact:    GET  /api/v1/capital-impact/summary
Capital Efficiency:GET  /api/v1/capital-efficiency/metrics
Pricing:           GET  /api/v1/pricing/policies/active, /policies  |  POST /activate  |  PATCH /policies/{id}
AI Scorecard:      GET  /api/v1/ai-scorecard/products  |  POST /{id}/flag, /{id}/kill
Board:             GET  /api/v1/board/slides
Notifications:     GET  /api/v1/notifications/
Enforcement:       GET  /api/v1/enforcement/permissions, /roles
```

Every endpoint uses `require_permission()` — 50 dedicated RBAC tests verify enforcement.

---

## Project Structure

```
strata/
├── apps/
│   ├── api/                       # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/            # 18 route modules, 53 endpoints
│   │   │   ├── auth/              # JWT auth + RBAC (15 roles, 32 permissions)
│   │   │   ├── connectors/        # Connector framework (mock, replay, discovery_replay)
│   │   │   ├── models/            # 15 SQLAlchemy model files (39 tables)
│   │   │   ├── schemas/           # Pydantic response schemas
│   │   │   ├── seed/              # Demo seeder (13 products, 5 candidates, 8 decisions)
│   │   │   ├── services/          # Attribution engine + candidate generator
│   │   │   ├── config.py          # Settings (env vars)
│   │   │   ├── database.py        # Async engine + session factory
│   │   │   └── main.py            # FastAPI app + lifespan
│   │   ├── alembic/               # 8 migration revisions
│   │   ├── tests/                 # 9 test files, 158 tests (50 RBAC-specific)
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   └── web/                       # Next.js 16 frontend
│       ├── src/
│       │   ├── app/(dashboard)/   # 15 pages (portfolio, assets, candidates, decisions,
│       │   │                      #   lifecycle, allocation, capital-impact, ai-scorecard,
│       │   │                      #   marketplace, simulate, setup, board-view, + detail pages)
│       │   ├── components/
│       │   │   ├── auth/          # PermissionGuard, RequirePermission
│       │   │   ├── layout/        # Sidebar (RBAC-filtered), Topbar
│       │   │   ├── shared/        # Card, EmptyState, Toast, PageShell, etc.
│       │   │   └── ui/            # shadcn/ui primitives (35+ components)
│       │   ├── lib/
│       │   │   ├── api/           # Client + hooks (API-first, seed fallback)
│       │   │   ├── auth/          # AuthContext, permissions.ts (route→permission map)
│       │   │   ├── mock-data/     # Seed data for DEMO_MODE
│       │   │   └── types.ts       # 60+ TypeScript interfaces
│       │   └── proxy.ts           # Edge proxy (auth redirect for unauthenticated users)
│       ├── Dockerfile
│       └── package.json
│
├── infra/
│   └── demo-data/                 # Multi-platform demo data packs
│       ├── snowflake/             # 8 assets, query logs, warehouse metering
│       ├── databricks/            # 5 assets, query logs, cluster costs
│       ├── dbt/                   # 5 models, 2 exposures, lineage graph
│       ├── powerbi/               # 4 datasets, 3 reports, usage logs, capacity
│       └── s3/                    # 4 objects, storage costs
│
├── docker-compose.yml             # PostgreSQL + API + Web
└── README.md
```

---

## Security & RBAC

The platform enforces role-based access control at **three layers**:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Backend Endpoint Enforcement                     │
│  require_permission() on every API route (50 RBAC tests)    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 — Route-Level Permission Guard                     │
│  <PermissionGuard> in dashboard layout checks route         │
│  permissions and shows "Access Restricted" screen           │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 — Component-Level Visibility                       │
│  Sidebar nav items filtered by permission                   │
│  Action buttons (Approve, Reject, Flag, Kill, Promote)      │
│  hidden for users without the required permission           │
└─────────────────────────────────────────────────────────────┘
```

**15 roles:** admin, cfo, executive_sponsor, fpa_analyst, cdo, product_owner, governance_steward, platform_admin, data_engineer, dataops_sre, head_of_ai, data_scientist, consumer, external_auditor, integration_service

**32 permissions:** Granular permissions like `decisions:approve`, `ai:kill_execute`, `candidates:promote`, `pricing:activate`, `capital:export`

**Key files:**
- Backend: `apps/api/app/auth/rbac.py` — role definitions + permission assignments
- Frontend: `apps/web/src/lib/auth/permissions.ts` — route-to-permission mapping
- Frontend: `apps/web/src/components/auth/permission-guard.tsx` — route-level guard
- Frontend: `apps/web/src/components/auth/require-permission.tsx` — component-level guard

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), TypeScript (strict), Tailwind CSS 4, shadcn/ui, Recharts, Lucide
- **Backend:** FastAPI, SQLAlchemy 2.x (async + asyncpg), Pydantic v2, Alembic, bcrypt, python-jose
- **Auth:** JWT (access + refresh tokens), 15-role RBAC with 32 permissions, edge proxy for session gating
- **Database:** PostgreSQL 16
- **Testing:** pytest (158 tests incl. 50 RBAC enforcement, 25 role matrix, 22 auth flow)
- **Infra:** Docker Compose

---

## Environment Variables

### API (`apps/api`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async DB connection |
| `DATABASE_URL_SYNC` | `postgresql+psycopg2://...` | Sync DB (Alembic) |
| `JWT_SECRET` | `dev-secret-...` | JWT signing key |
| `ENCRYPTION_KEY` | `dev-encryption-...` | Credential encryption |
| `DEMO_MODE` | `true` | Auto-seed on startup |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins |
| `DEMO_DATA_PATH` | `/demo-data` | ReplayConnector data path |

### Web (`apps/web`)
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | (empty) | API base URL. Empty = seed-only demo mode |

---

## Local Development (without Docker)

```bash
# 1. Start PostgreSQL
docker run -d --name strata-pg -p 5433:5432 \
  -e POSTGRES_DB=strata -e POSTGRES_USER=strata -e POSTGRES_PASSWORD=localdev \
  postgres:16-alpine

# 2. API
cd apps/api
pip install -e .
export DATABASE_URL="postgresql+asyncpg://strata:localdev@localhost:5433/strata"
export DATABASE_URL_SYNC="postgresql+psycopg2://strata:localdev@localhost:5433/strata"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Web
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
```

---

## Brand & UI Rules

Strata's visual identity is boardroom-grade: institutional, financially precise, category-defining. The brand system uses a "capital grid / ledger" motif throughout.

| Resource | Location |
|----------|----------|
| Brand Guidelines | [`apps/web/BRAND_GUIDELINES.md`](./apps/web/BRAND_GUIDELINES.md) |
| Design System | [`apps/web/DESIGN_SYSTEM.md`](./apps/web/DESIGN_SYSTEM.md) |
| SVG Logo Assets | `apps/web/public/brand/` |
| Design Tokens | `apps/web/src/lib/tokens.ts` |
| StrataLogo Component | `apps/web/src/components/shared/strata-logo.tsx` |
| CapitalGrid Motif | `apps/web/src/components/marketing/capital-grid.tsx` |
| Animation Utilities | `apps/web/src/app/globals.css` |
| Scroll Fade-In Hook | `apps/web/src/lib/hooks/use-fade-in-on-scroll.ts` |

Key implementation details:
- **Logo:** Double-diamond mark (outer outline + inner solid) with ledger grid lines, via `<StrataLogo>` component
- **Colors:** Deep Navy (`#0B1220`), Off White (`#F7F8F9`), Graphite (`#1A2332`), Capital Green (`#0F766E`)
- **Typography:** Inter + JetBrains Mono, `tabular-nums` on all financial figures, max weight 600
- **Capital Grid Motif:** Subtle ledger lines in logo, section backgrounds (`<CapitalGrid />`), dividers (`.ledger-divider`)
- **Animation:** CSS-only (no framer-motion), 150ms hover, scroll-triggered fade-ins, chart line-draw
- **Landing Page:** 7-section executive category page with case vignette and capital pressure visualization
- **Auth UI:** Institutional login with trust cues, premium demo persona switcher

---

## Design Principles

1. **Financial-first**: Every screen answers a financial question
2. **Cost + Value always together**: Never show cost alone
3. **Decision forcing**: Every insight has a next step (Investigate, Review, Retire, Simulate)
4. **Capital impact tracking**: Every workflow logs a financial effect
5. **Transparent**: Every metric shows how it was calculated
6. **Zero jargon**: CFO views never use "table", "schema", "pipeline"
7. **Least-privilege UI**: Users only see the navigation, pages, and actions their role permits
