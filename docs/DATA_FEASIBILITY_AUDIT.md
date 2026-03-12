# Data Feasibility Audit

## Purpose

This document audits every data field, seed value, and computation in the Strata demo
for **enterprise realism**. It identifies what a CFO, data platform leader, or Snowflake/Databricks
engineer would flag as unrealistic — and documents corrections, remaining assumptions,
and the evidence behind each claim.

---

## 1. Platform Metadata — VERIFIED REALISTIC

All connector extraction methods reference real platform APIs:

| Platform    | Field                        | Extraction Method                                  | Status      |
|-------------|------------------------------|----------------------------------------------------|-------------|
| Snowflake   | Column-level types           | `INFORMATION_SCHEMA.COLUMNS`                       | Real API    |
| Snowflake   | 90-day query log             | `ACCOUNT_USAGE.QUERY_HISTORY`                      | Real API    |
| Snowflake   | Role-based grants            | `ACCOUNT_USAGE.GRANTS_TO_ROLES`                    | Real API    |
| Snowflake   | Credit consumption           | `WAREHOUSE_METERING_HISTORY`                       | Real API    |
| Snowflake   | Column-level lineage         | `ACCESS_HISTORY` (Enterprise+)                     | Real API    |
| Snowflake   | Table storage                | `TABLE_STORAGE_METRICS`                            | Real API    |
| Databricks  | Unity Catalog metadata       | `Unity Catalog INFORMATION_SCHEMA`                 | Real API    |
| Databricks  | SQL warehouse query log      | `system.query.history`                             | Real API    |
| Databricks  | DBU billing                  | `system.billing.usage`                             | Real API    |
| Databricks  | Unity Catalog grants         | `Unity Catalog grants API`                         | Real API    |
| Databricks  | Table lineage                | `system.access.table_lineage`                      | Real API    |
| BigQuery    | Dataset/table metadata       | `INFORMATION_SCHEMA.COLUMNS`                       | Real API    |
| BigQuery    | Job execution log            | `INFORMATION_SCHEMA.JOBS`                          | Real API    |
| BigQuery    | Billing export               | `Cloud Billing Export`                             | Real API    |
| BigQuery    | IAM role bindings            | `IAM Policy API`                                   | Real API    |
| BigQuery    | Data Lineage API             | Data Lineage API (requires enablement)             | Real API    |

**Verdict**: All extraction methods correspond to actual platform APIs documented in official vendor docs.

---

## 2. Connector System — CORRECTED

### Before (unrealistic)

- `seed.ts` had 2 connectors with IDs `conn-1`, `conn-2` (snowflake, databricks only)
- `connector-depth-seed.ts` had 7 connectors with IDs `c-snow-1` through `c-bq-1`
- No cross-referencing between the two systems
- Lineage created "inferred" source nodes for platforms without connectors (s3, power_bi)

### After (corrected)

- **6 connectors** in `seed.ts` using canonical IDs: `conn-snow-1`, `conn-snow-2`, `conn-dbx-1`, `conn-s3-1`, `conn-pbi-1`, `conn-bq-1`
- All 5 data platforms covered: snowflake (×2: PROD + Dev), databricks, s3, power_bi, bigquery
- `connector-depth-seed.ts` imports from `seed.ts` and adds `conn-disc-1` (Discovery Replay) as a depth-only meta-connector
- `objectsManaged` derived dynamically from product count × platform multiplier + base system objects
- Lineage has real source_system nodes for every platform — no "inferred" fallbacks
- `Platform` type extended to include `"bigquery"`

### Remaining assumption

Snowflake Dev (`conn-snow-2`) has `productsFound: 0` but `objectsManaged: 38` — representing staging/sandbox objects. This is realistic: dev environments contain test tables, temporary views, and CI/CD artifacts not registered as data products.

---

## 3. Cost Data — REALISTIC WITH NOTES

| Field                | Source                           | Realism                                |
|----------------------|----------------------------------|----------------------------------------|
| `monthlyCost`        | Per-product aggregate            | Realistic range ($180–$45,000)         |
| `costBreakdown`      | compute / storage / pipeline / human | Realistic 4-way split                  |
| `costTrend` (6-month)| Monthly snapshots                | ✅ Realistic directional patterns       |
| `portfolioCostTrend` | Feb derived from `totalCost`     | ⚠️ Earlier months still hardcoded       |

**Assumption**: Cost breakdown percentages are typical enterprise ratios but not derived from actual warehouse metering. In production, `costBreakdown.compute` would come from `WAREHOUSE_METERING_HISTORY` per-query attribution.

---

## 4. Usage Data — REALISTIC WITH NOTES

| Field                | Realism                                                          |
|----------------------|------------------------------------------------------------------|
| `monthlyConsumers`   | 3–450 range, realistic for enterprise products                   |
| `consumerTeams`      | Named teams with 2–5 per product, realistic org structure        |
| `usageTrend` (6-month)| Monthly snapshots showing seasonal patterns                    |
| `downstreamDashboards`| 1–8 per product, typical BI footprint                          |
| `downstreamModels`   | 0–3 per product, realistic ML adoption curve                    |

**Assumption**: Consumer counts represent distinct query-originating identities per month, consistent with how Snowflake `QUERY_HISTORY` or Databricks `system.query.history` surface consumers.

---

## 5. Value Declarations — REALISTIC

| Method                  | Example Products                    | Realism |
|-------------------------|-------------------------------------|---------|
| `revenue_attribution`   | Revenue Analytics Hub, Customer 360 | ✅      |
| `cost_avoidance`        | Compliance Risk Matrix              | ✅      |
| `efficiency_gain`       | Supply Chain Metrics                | ✅      |
| `strategic_value`       | Product Interaction Events          | ✅      |

**Assumption**: Declared values ($5K–$500K/month) are manually set by product owners — realistic because enterprise data valuation is inherently subjective and organization-specific. The Composite Value formula (`0.7 × declared + 0.3 × usage-implied`) adds objectivity.

---

## 6. Lifecycle & Governance — REALISTIC

- Lifecycle stages: experimental → growing → mature → declining → sunset → retired
- Decisions with impact tracking (estimated vs actual savings)
- Capital events (budget_reallocation, cost_reduction_initiative, new_investment, sunset_recovery) with validation states

**No corrections needed.** These patterns match enterprise data governance workflows.

---

## 7. Lineage Graph — REALISTIC

- Depth: source_system → database → schema → table → data_product → dashboard/model/metric
- 5–6 hops typical, matching real-world lineage (e.g., Atlan, Alation, DataHub)
- Cross-product edges for known dependencies (6 defined)
- All nodes derived from existing seed data — nothing invented

**Remaining gap**: Cross-product edges are manually defined for 6 pairs only. In a production system, these would be inferred from query log analysis (e.g., JOIN patterns in `QUERY_HISTORY`).

---

## 8. Scale Assessment

| Metric          | Current | Target (Phase 7) | Enterprise Typical |
|-----------------|---------|-------------------|--------------------|
| Products        | 41      | ~200              | 500–5,000          |
| Connectors      | 6+1     | 6+1               | 5–20               |
| Decisions       | 11      | ~50               | 20–100/quarter     |
| Capital Events  | 4       | ~20               | 10–50/quarter      |
| Lineage Nodes   | ~400    | ~2,000            | 10K–100K           |

At 200 products with 5 platforms, the demo represents a mid-size enterprise data platform.

---

## 9. Items Corrected in This Sprint

1. ✅ Connector ID unification (conn-* canonical IDs across all systems)
2. ✅ All 5 data platforms have real connectors (no "inferred" lineage nodes)
3. ✅ `objectsManaged` derived from product counts (not hardcoded)
4. ✅ `Platform` type extended to include `"bigquery"`
5. ✅ Setup page supports all platform visual configurations

## 10. Items Still To Be Addressed

1. Economic Signal Engine — per-product scoring (Phase 1)
2. Opportunity Cost Model — capital misallocation computation (Phase 2)
3. Portfolio Frontier — Pareto efficiency analysis (Phase 3)
4. Value Attribution — trace capital events through lineage (Phase 4)
5. Value Inference — estimate product value without manual declarations (Phase 5)
6. Learning Loop — projection accuracy tracking (Phase 6)
7. Scale-up to ~200 products with realistic distributions (Phase 7)
8. Earlier months of `portfolioCostTrend` still hardcoded (will be fixed with scale-up)
9. `roiHistory` monthly snapshots not yet derived from product data
