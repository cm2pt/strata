// ============================================================
// Strata — Connector Depth Seed Data
// Offline/demo mode data for connector transparency features
// ============================================================

import type {
  ConnectorDepthOverview,
  ConnectorDepthSummary,
  SyncLogList,
  SyncLogEntry,
  ExtractionMatrixResponse,
  ExtractionCapability,
  AutomationSummary,
  AssetProvenance,
  FieldProvenance,
  AutomationLevel,
} from "../types";

import { connectors as seedConnectors, dataProducts } from "./seed";

// ---- Helpers ----

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function isoDate(daysAgo: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

// ---- Connector Definitions ----

interface ConnectorDef {
  id: string;
  name: string;
  platform: string;
  objectsManaged: number;
}

// Derive connector definitions from canonical seed connectors + discovery_replay.
// objectsManaged = productsFound × platform multiplier (tables, views, staging) + base system objects.
// This ensures adding a product automatically increases the connector's object count.
const PLATFORM_OBJECT_MULTIPLIER: Record<string, number> = {
  snowflake: 5,   // tables + views + staging + materialized views + streams
  databricks: 4,  // tables + views + notebooks + jobs
  bigquery: 5,    // tables + views + routines + materialized views + external tables
  s3: 3,          // prefixes + objects + manifests
  power_bi: 3,    // datasets + reports + dataflows
};

const CONNECTORS: ConnectorDef[] = [
  ...seedConnectors.map((conn) => {
    const mult = PLATFORM_OBJECT_MULTIPLIER[conn.platform] ?? 3;
    const baseObjects = 8; // system metadata tables, audit logs, etc.
    // Dev instances have staging/sandbox objects even without production products
    const devBonus = conn.productsFound === 0 ? 30 : 0;
    return {
      id: conn.id,
      name: conn.name,
      platform: conn.platform,
      objectsManaged: conn.productsFound * mult + baseObjects + devBonus,
    };
  }),
  // Discovery Replay — meta-connector for replaying catalog discovery (depth-only, no products live here)
  { id: "conn-disc-1", name: "Discovery Replay", platform: "discovery_replay", objectsManaged: 10 },
];

// ---- Platform Capability Definitions ----

const SNOWFLAKE_CAPS: ExtractionCapability[] = [
  { capabilityCategory: "schema_metadata", capabilityName: "Column-level types & descriptions", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "INFORMATION_SCHEMA.COLUMNS", refreshFrequency: "per-sync" },
  { capabilityCategory: "query_history", capabilityName: "90-day query log", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "ACCOUNT_USAGE.QUERY_HISTORY", refreshFrequency: "daily" },
  { capabilityCategory: "access_control", capabilityName: "Role-based grants", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "ACCOUNT_USAGE.GRANTS_TO_ROLES", refreshFrequency: "per-sync" },
  { capabilityCategory: "cost_attribution", capabilityName: "Warehouse credit consumption", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "WAREHOUSE_METERING_HISTORY", refreshFrequency: "daily" },
  { capabilityCategory: "data_lineage", capabilityName: "Column-level lineage", isAvailable: false, requiresElevatedAccess: true, extractionMethod: "ACCESS_HISTORY (Enterprise+)", refreshFrequency: "daily" },
  { capabilityCategory: "storage_metrics", capabilityName: "Table-level storage", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "TABLE_STORAGE_METRICS", refreshFrequency: "per-sync" },
];

const DATABRICKS_CAPS: ExtractionCapability[] = [
  { capabilityCategory: "schema_metadata", capabilityName: "Unity Catalog table metadata", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Unity Catalog INFORMATION_SCHEMA", refreshFrequency: "per-sync" },
  { capabilityCategory: "query_history", capabilityName: "SQL warehouse query log", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "system.query.history", refreshFrequency: "daily" },
  { capabilityCategory: "cost_attribution", capabilityName: "DBU billing by workspace", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "system.billing.usage", refreshFrequency: "daily" },
  { capabilityCategory: "access_control", capabilityName: "Unity Catalog grants", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Unity Catalog grants API", refreshFrequency: "per-sync" },
  { capabilityCategory: "data_lineage", capabilityName: "Table lineage graph", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "system.access.table_lineage", refreshFrequency: "daily" },
  { capabilityCategory: "cluster_metrics", capabilityName: "Cluster utilization", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Clusters API", refreshFrequency: "per-sync" },
];

const BIGQUERY_CAPS: ExtractionCapability[] = [
  { capabilityCategory: "schema_metadata", capabilityName: "Dataset & table metadata", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "INFORMATION_SCHEMA.COLUMNS", refreshFrequency: "per-sync" },
  { capabilityCategory: "query_history", capabilityName: "Job execution log", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "INFORMATION_SCHEMA.JOBS", refreshFrequency: "daily" },
  { capabilityCategory: "cost_attribution", capabilityName: "Billing export by dataset", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Cloud Billing Export", refreshFrequency: "daily" },
  { capabilityCategory: "access_control", capabilityName: "IAM role bindings", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "IAM Policy API", refreshFrequency: "per-sync" },
  { capabilityCategory: "data_lineage", capabilityName: "Data Lineage API", isAvailable: false, requiresElevatedAccess: true, extractionMethod: "Data Lineage API (requires enablement)", refreshFrequency: "daily" },
  { capabilityCategory: "storage_metrics", capabilityName: "Table storage & partitioning", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "INFORMATION_SCHEMA.TABLE_STORAGE", refreshFrequency: "per-sync" },
];

const GENERIC_CAPS: ExtractionCapability[] = [
  { capabilityCategory: "schema_metadata", capabilityName: "Object inventory", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "API discovery", refreshFrequency: "per-sync" },
  { capabilityCategory: "usage_events", capabilityName: "Access log events", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Platform API", refreshFrequency: "per-sync" },
  { capabilityCategory: "cost_attribution", capabilityName: "Basic cost metrics", isAvailable: true, requiresElevatedAccess: false, extractionMethod: "Billing API", refreshFrequency: "daily" },
  { capabilityCategory: "access_control", capabilityName: "Permission listing", isAvailable: false, requiresElevatedAccess: true, extractionMethod: "Admin API", refreshFrequency: "per-sync" },
];

function getCapsForPlatform(platform: string): ExtractionCapability[] {
  switch (platform) {
    case "snowflake": return SNOWFLAKE_CAPS;
    case "databricks": return DATABRICKS_CAPS;
    case "bigquery": return BIGQUERY_CAPS;
    default: return GENERIC_CAPS;
  }
}

// ---- Seed Functions ----

export function seedConnectorDepth(): ConnectorDepthOverview {
  const connectors: ConnectorDepthSummary[] = CONNECTORS.map((c, i) => {
    const caps = getCapsForPlatform(c.platform);
    const available = caps.filter((cap) => cap.isAvailable).length;
    const statusOptions: Array<"success" | "partial" | "failed"> = ["success", "success", "success", "partial"];
    const syncStatus = statusOptions[Math.floor(seededRandom(i * 7) * statusOptions.length)];

    return {
      connectorId: c.id,
      connectorName: c.name,
      platform: c.platform,
      totalCapabilities: caps.length,
      availableCapabilities: available,
      coveragePct: parseFloat((available / caps.length).toFixed(4)),
      lastSyncAt: isoDate(Math.floor(seededRandom(i * 3) * 3), Math.floor(seededRandom(i * 5) * 12)),
      syncStatus,
      objectsManaged: c.objectsManaged,
      automationCoverage: parseFloat((0.7 + seededRandom(i * 11) * 0.25).toFixed(4)),
    };
  });

  return {
    connectors,
    portfolioAutomationCoverage: 0.7870,
    totalFieldsTracked: 1080,
    fullyAutomatedPct: 0.7870,
    semiAutomatedPct: 0.2037,
    manualPct: 0.0093,
  };
}

export function seedSyncLog(connectorId: string): SyncLogList {
  const connector = CONNECTORS.find((c) => c.id === connectorId) ?? CONNECTORS[0];
  const items: SyncLogEntry[] = [];

  for (let i = 0; i < 5; i++) {
    const seed = connectorId.length * 100 + i;
    const daysAgo = i * 6 + Math.floor(seededRandom(seed) * 3);
    const durationSec = 30 + Math.floor(seededRandom(seed + 1) * 270);
    const discovered = connector.objectsManaged + Math.floor(seededRandom(seed + 2) * 10) - 5;
    const updated = Math.floor(discovered * (0.1 + seededRandom(seed + 3) * 0.3));
    const deleted = i === 3 ? Math.floor(seededRandom(seed + 4) * 3) : 0;
    const status: SyncLogEntry["status"] = i === 2 ? "partial" : "success";

    items.push({
      id: `sync-${connectorId}-${i}`,
      connectorId,
      syncStartedAt: isoDate(daysAgo, 2),
      syncEndedAt: isoDate(daysAgo, 2 - durationSec / 3600),
      status,
      objectsDiscovered: discovered,
      objectsUpdated: updated,
      objectsDeleted: deleted,
      usageEventsFetched: Math.floor(seededRandom(seed + 5) * 500) + 100,
      costEventsFetched: Math.floor(seededRandom(seed + 6) * 200) + 50,
      durationSeconds: durationSec,
      errors: status === "partial" ? [{ code: "TIMEOUT", message: "Query history fetch timed out after 120s" }] : null,
      diffSummary: deleted > 0 ? { added: ["new_table_xyz"], removed: ["deprecated_view_abc"], changed: ["dim_customer.last_updated"] } : null,
    });
  }

  return { items, total: items.length };
}

export function seedExtractionMatrix(connectorId: string): ExtractionMatrixResponse {
  const connector = CONNECTORS.find((c) => c.id === connectorId) ?? CONNECTORS[0];
  const capabilities = getCapsForPlatform(connector.platform);

  return {
    connectorId: connector.id,
    connectorName: connector.name,
    platform: connector.platform,
    capabilities,
  };
}

export function seedAutomationSummary(): AutomationSummary {
  return {
    fullyAutomated: 850,
    semiAutomated: 220,
    manual: 10,
    total: 1080,
    coveragePct: 0.7870,
  };
}

const FIELD_TEMPLATES: Record<string, Omit<FieldProvenance, "fieldName" | "lastObservedAt" | "observationCount">> = {
  monthly_cost: { sourcePlatform: "snowflake", extractionMethod: "WAREHOUSE_METERING_HISTORY", automationLevel: "fully_automated", confidence: 0.98 },
  monthly_consumers: { sourcePlatform: "snowflake", extractionMethod: "ACCOUNT_USAGE.QUERY_HISTORY", automationLevel: "fully_automated", confidence: 0.95 },
  composite_value: { sourcePlatform: "internal", extractionMethod: "Weighted formula (declared + usage-implied)", automationLevel: "semi_automated", confidence: 0.85 },
  trust_score: { sourcePlatform: "internal", extractionMethod: "Quality metrics aggregation", automationLevel: "semi_automated", confidence: 0.80 },
  usage_trend: { sourcePlatform: "snowflake", extractionMethod: "ACCOUNT_USAGE.QUERY_HISTORY (6-month window)", automationLevel: "fully_automated", confidence: 0.92 },
  cost_trend: { sourcePlatform: "snowflake", extractionMethod: "WAREHOUSE_METERING_HISTORY (6-month window)", automationLevel: "fully_automated", confidence: 0.96 },
};

export function seedAssetProvenance(productId: string): AssetProvenance {
  const seed = productId.length * 42;
  const platforms = ["snowflake", "databricks", "bigquery", "power_bi", "s3"];
  const platform = platforms[Math.floor(seededRandom(seed) * platforms.length)];

  const fields: FieldProvenance[] = Object.entries(FIELD_TEMPLATES).map(([fieldName, template], i) => {
    const overridePlatform = (fieldName === "monthly_cost" || fieldName === "monthly_consumers" || fieldName === "usage_trend" || fieldName === "cost_trend")
      ? platform
      : template.sourcePlatform;

    return {
      fieldName,
      sourcePlatform: overridePlatform,
      extractionMethod: template.extractionMethod,
      automationLevel: template.automationLevel as AutomationLevel,
      confidence: template.confidence,
      lastObservedAt: isoDate(Math.floor(seededRandom(seed + i) * 5)),
      observationCount: 10 + Math.floor(seededRandom(seed + i + 100) * 40),
    };
  });

  const automatedCount = fields.filter((f) => f.automationLevel === "fully_automated").length;

  return {
    productId,
    productName: `Product ${productId.slice(-3)}`,
    fields,
    automationCoverage: parseFloat((automatedCount / fields.length).toFixed(4)),
  };
}
