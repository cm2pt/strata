# Lineage Center

End-to-end data lineage for Strata — trace every metric from source system to dashboard.

## Architecture Overview

```
Source Systems                  Lineage Graph                    UI Surfaces
  (Snowflake,       ──seed──▶   lineage_nodes     ──API──▶   Lineage Center (/lineage)
   Databricks,                  lineage_edges                 Asset Lineage Tab
   BigQuery)                                                  Decision Lineage Evidence
```

### Data Model

Two PostgreSQL tables store the lineage graph:

**`lineage_nodes`** — Every entity in the lineage graph (tables, views, dbt models, dashboards, data products, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK → organizations |
| `node_type` | enum | One of 17 node types (see below) |
| `name` | varchar | Human-readable name |
| `qualified_name` | varchar | Unique platform-qualified name (e.g. `PROD_DW.GOLD.DIM_CUSTOMER`) |
| `platform` | varchar | Source platform (snowflake, databricks, bigquery, dbt, power_bi, strata) |
| `domain` | varchar | Business domain (Finance, Marketing, etc.) |
| `provenance` | enum | How the node was created: `automated`, `inferred`, `manual` |
| `confidence` | float | Confidence score 0.0–1.0 |
| `data_product_id` | UUID | FK → data_products (nullable, for data_product nodes) |
| `source_asset_id` | UUID | FK → source_assets (nullable, for connector-sourced nodes) |
| `metadata_json` | JSON | Arbitrary platform-specific metadata |

**`lineage_edges`** — Directed relationships between nodes

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK → organizations |
| `from_node_id` | UUID | FK → lineage_nodes |
| `to_node_id` | UUID | FK → lineage_nodes |
| `edge_type` | enum | One of 9 edge types (see below) |
| `platform` | varchar | Platform that reported this edge |
| `provenance` | enum | How the edge was discovered |
| `confidence` | float | Confidence score 0.0–1.0 |
| `metadata_json` | JSON | Edge-specific metadata |

### Node Types (17)

`source_system`, `database`, `schema`, `table`, `view`, `column`, `dbt_model`, `etl_job`, `notebook`, `data_product`, `dashboard`, `report`, `metric`, `ml_model`, `api_endpoint`, `application`, `other`

### Edge Types (9)

`physical_lineage`, `transformation`, `derivation`, `aggregation`, `consumption`, `exposure`, `ownership`, `column_lineage`, `other`

### Provenance Levels

| Level | Description |
|-------|-------------|
| `automated` | Discovered by a connector (highest confidence) |
| `inferred` | Inferred from naming conventions or patterns |
| `manual` | Manually declared by a user |

---

## API Endpoints

All endpoints require authentication and `connectors:read` permission (write endpoints require `connectors:write`).

Base path: `/api/v1/lineage`

### GET `/lineage/nodes`

Search and list lineage nodes with optional filters.

**Query Parameters:**
- `q` (string) — Full-text search on name and qualified_name
- `node_type` (string) — Filter by node type enum value
- `platform` (string) — Filter by platform name
- `domain` (string) — Filter by business domain
- `limit` (int, default 50) — Page size
- `offset` (int, default 0) — Pagination offset

**Response:** `LineageNodeSearchResponse`
```json
{
  "items": [
    {
      "id": "uuid",
      "nodeType": "table",
      "name": "DIM_CUSTOMER",
      "qualifiedName": "PROD_DW.GOLD.DIM_CUSTOMER",
      "platform": "snowflake",
      "domain": "Finance",
      "provenance": "automated",
      "confidence": 0.95,
      "dataProductId": null,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 1234
}
```

### GET `/lineage/node/{node_id}`

Detailed view of a single node including upstream and downstream edges.

**Response:** `LineageNodeDetail`
```json
{
  "id": "uuid",
  "nodeType": "data_product",
  "name": "Customer 360",
  "upstreamCount": 5,
  "downstreamCount": 3,
  "upstreamEdges": [...],
  "downstreamEdges": [...]
}
```

### GET `/lineage/graph`

BFS graph traversal from a root node. Returns all reachable nodes and edges within the specified depth.

**Query Parameters:**
- `root_node_id` (UUID, required) — Starting node
- `direction` (string) — `upstream`, `downstream`, or `both` (default: `both`)
- `depth` (int, 1–10, default 3) — Traversal depth

**Response:** `LineageGraphResponse`
```json
{
  "nodes": [{ "id": "...", "nodeType": "table", "name": "...", "platform": "..." }],
  "edges": [{ "id": "...", "fromNodeId": "...", "toNodeId": "...", "edgeType": "transformation" }],
  "rootNodeId": "uuid"
}
```

### POST `/lineage/nodes/manual`

Create a manual lineage node. Requires `connectors:write`.

**Body:** `LineageNodeCreate`
```json
{
  "nodeType": "api_endpoint",
  "name": "Customer API v2",
  "qualifiedName": "api.strata.com/v2/customers",
  "platform": "strata"
}
```

### POST `/lineage/edges/manual`

Create a manual lineage edge. Requires `connectors:write`.

**Body:** `LineageEdgeCreate`
```json
{
  "fromNodeId": "uuid-of-source",
  "toNodeId": "uuid-of-target",
  "edgeType": "consumption"
}
```

---

## UI Surfaces

### 1. Lineage Center (`/lineage`)

Full-page lineage explorer accessible from the sidebar under "Platform".

**Features:**
- **KPI cards**: Total Nodes, Node Types, Platforms, Graph Root status
- **Search**: Full-text search on node names and qualified names
- **Filters**: Node type dropdown, platform dropdown
- **Table View**: Paginated table with type badges, platform, domain, provenance, confidence bar
- **Graph View**: SVG-based layered visualization with:
  - Nodes color-coded by type
  - Edges styled by provenance (solid = automated, dashed = inferred)
  - Root node highlighted
  - Direction control (upstream/downstream/both)
  - Depth slider (1–6 levels)
- **Node Detail Drawer**: Slide-out panel with full node info, upstream/downstream edge lists, navigation

### 2. Asset Lineage Tab

New "Lineage" tab on the Asset detail page (`/assets/[id]`).

Shows upstream sources and downstream consumers in a two-column card layout. Links to the Lineage Center for full exploration.

### 3. Decision Lineage Evidence

New "Lineage Evidence" card on the Decision detail page (`/decisions/[id]`).

Shows upstream sources and downstream consumers for the affected product. For retirement decisions, displays an impact warning highlighting how many downstream consumers will be affected.

---

## Demo / Seed Data

The seeder generates a comprehensive lineage graph with:

- **8 source systems** (Snowflake clusters, Databricks workspaces, BigQuery projects, etc.)
- **6 databases**, **13 schemas**
- **1000+ tables** with platform-specific qualified names (e.g. `PROD_DW.GOLD.DIM_CUSTOMER`)
- **8 views** derived from gold tables
- **30 dbt models** with transformation edges
- **15 ETL jobs** and **15 notebooks**
- **200 data products** (all existing products mapped as lineage nodes)
- **55 dashboards**, **20 reports**, **30 metrics**
- **10 ML models**, **5 API endpoints**, **5 applications**
- **Column-level lineage** for top 5 gold tables (dim_customer, fact_transaction, etc.)

All edges have appropriate types (physical_lineage, transformation, derivation, aggregation, consumption, exposure, column_lineage) and provenance levels (automated for connector-sourced, inferred for pattern-matched, manual for user-declared).

Frontend seed data (`lineage-seed.ts`) provides matching offline/demo mode data with 40+ nodes and edges forming a complete source-to-dashboard chain.

---

## Adding a New Node Type

1. Add the value to `LineageNodeType` enum in `apps/api/app/models/lineage.py`
2. Create an Alembic migration to add the enum value:
   ```sql
   ALTER TYPE lineage_node_type ADD VALUE 'new_type';
   ```
3. Add the type to `LineageNodeType` union in `apps/web/src/lib/types.ts`
4. Add color mapping in `NODE_TYPE_COLORS` in relevant UI components
5. Add layer position in `LineageGraphView.tsx` `TYPE_ORDER` map

## Adding a New Edge Type

1. Add the value to `LineageEdgeType` enum in `apps/api/app/models/lineage.py`
2. Create an Alembic migration
3. Add to `LineageEdgeType` union in `apps/web/src/lib/types.ts`
4. Optionally add styling in graph view edge rendering

---

## Permissions

| Route | Permission Required |
|-------|-------------------|
| `/lineage` (UI) | `connectors:read` |
| `GET /lineage/*` | `connectors:read` |
| `POST /lineage/*` | `connectors:write` |

---

## Testing

**Backend**: 14 tests in `apps/api/tests/test_lineage.py`
- Node search (basic, filtered, with query, empty, unauthenticated)
- Node detail (found, not found)
- Graph traversal (both directions, downstream only, root not found)
- Manual edge creation (valid, invalid node)
- Manual node creation (valid, invalid type)

Run: `pytest apps/api/tests/test_lineage.py -v`

**Frontend**: Seed data generators return typed data matching API schemas. Hooks use `useData<T>` with lazy-loaded seed fallback.
