# Connector Depth & Transparency

Architecture overview and API reference for Strata's connector depth system.

## Overview

The connector depth system provides audit-grade transparency into how Strata extracts, transforms, and tracks data from each connected platform. It answers three key questions:

1. **What can each connector extract?** (Extraction Matrix)
2. **Where does each metric come from?** (Field Provenance)
3. **Is extraction automated or manual?** (Automation Attribution)

## Architecture

```
Platform Connectors (Snowflake, Databricks, BigQuery, S3, Power BI)
        │
        ▼
Platform Extractors (generate_capabilities, field_provenance_mapping)
        │
        ├──► ConnectorExtractionMeta (capability matrix per connector)
        ├──► ConnectorSyncLog (per-sync audit trail)
        └──► FieldProvenance (field-level source tracking per product)
                │
                ▼
        Provenance Service (automation summary, coverage stats)
                │
                ▼
        API Endpoints (/connector-depth/*)
                │
                ▼
        Frontend UI (Connector Depth page, Asset provenance tab, Explainability toggle)
```

## Platform Extractors

Each platform has a dedicated extractor class in `apps/api/app/connectors/extractors/`:

| Platform | Extractor | Capabilities |
|----------|-----------|-------------|
| Snowflake | `SnowflakeExtractor` | INFORMATION_SCHEMA, ACCOUNT_USAGE, WAREHOUSE_METERING_HISTORY |
| Databricks | `DatabricksExtractor` | Unity Catalog, system.query.history, system.billing.usage |
| BigQuery | `BigQueryExtractor` | INFORMATION_SCHEMA, Cloud Billing Export, IAM Policy API |

### Adding a New Platform

1. Create `apps/api/app/connectors/extractors/{platform}_extractor.py`
2. Extend `BaseExtractor` ABC
3. Implement `generate_capabilities()` and `field_provenance_mapping()`
4. Register with `@register_extractor("platform_name")`
5. Add seeder entries in `multinational_seeder.py` Phase 10b

## Data Models

### ConnectorSyncLog
Per-sync audit trail with object counts, duration, errors, and diff summary.

### FieldProvenance
Maps each product field (e.g., `monthly_cost`, `trust_score`) to its source connector, extraction method, and automation level.

### ConnectorExtractionMeta
Declares what each connector *can* extract — the capability matrix.

## Automation Levels

| Level | Description | Example |
|-------|-------------|---------|
| `fully_automated` | Extracted via platform API with no manual intervention | Cost from WAREHOUSE_METERING_HISTORY |
| `semi_automated` | Computed from automated inputs with some manual configuration | Trust score from quality metrics aggregation |
| `manual` | Requires human input or declaration | Value declarations |

## API Endpoints

All endpoints require authentication and `connectors:read` permission.

### GET /api/v1/connector-depth/depth
Overview of all connectors with capability coverage and portfolio automation stats.

### GET /api/v1/connector-depth/{id}/sync-log
Paginated sync history for a connector. Query params: `limit` (default 20), `offset` (default 0).

### GET /api/v1/connector-depth/{id}/extraction-matrix
Capability matrix for a single connector showing available extraction methods.

### GET /api/v1/connector-depth/automation-summary
Portfolio-wide automation breakdown: fully_automated, semi_automated, manual counts.

### GET /api/v1/connector-depth/assets/{id}/provenance
Field-level provenance for a single data product.

## Frontend

### Connector Depth Page (`/connectors/depth`)
- Platform Overview Cards (capability coverage per connector)
- Automation Coverage Chart (stacked bar)
- Extraction Matrix Table (platform-specific capabilities)
- Sync History Panel (recent syncs with expandable diffs)

### Asset Provenance Tab
Added as "Data Sources" tab on the asset detail page (`/assets/{id}`).

### Explainability Toggle
Floating button (bottom-right) that enables data source annotations on key financial metrics across the dashboard.

## Demo Mode

When API is not configured, all hooks fall back to seed data in `apps/web/src/lib/mock-data/connector-depth-seed.ts`. The seed provides 7 connectors with platform-specific capabilities, sync histories, and field-level provenance.
