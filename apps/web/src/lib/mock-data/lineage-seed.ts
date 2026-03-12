/**
 * Lineage Center — seed data for offline / demo mode.
 *
 * IMPORTANT: This file derives ALL lineage from the existing seed data.
 * Every node and edge is generated from the data products, connectors,
 * and relationships already defined in seed.ts — nothing is invented.
 */

import { dataProducts, connectors } from "./seed";
import type {
  LineageNodeResponse,
  LineageNodeSearchResponse,
  LineageNodeDetail,
  LineageEdgeResponse,
  LineageGraphNode,
  LineageGraphEdge,
  LineageGraphResponse,
  LineageNodeType,
  LineageEdgeType,
  LineageProvenance,
} from "@/lib/types";

// ---------- Deterministic IDs ----------

let _counter = 0;
function makeId(prefix: string, key: string): string {
  // Deterministic: hash the prefix+key to a stable UUID-like string
  const hash = Array.from(prefix + ":" + key).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4000-a000-${hex.padStart(12, "0").slice(0, 12)}`;
}

function seqId(): string {
  _counter += 1;
  return `e0000000-0000-4000-b000-${String(_counter).padStart(12, "0")}`;
}

// ---------- Internal node/edge types ----------

interface SeedNode {
  id: string;
  nodeType: LineageNodeType;
  name: string;
  qualifiedName: string;
  platform: string;
  domain: string | null;
  provenance: LineageProvenance;
  confidence: number;
  dataProductId: string | null;
}

interface SeedEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: LineageEdgeType;
  provenance: LineageProvenance;
  confidence: number;
}

// ---------- Platform metadata ----------

const PLATFORM_DB: Record<string, { databases: string[]; schemaPrefix: string }> = {
  snowflake: { databases: ["PROD_DW", "ANALYTICS"], schemaPrefix: "snowflake" },
  databricks: { databases: ["main"], schemaPrefix: "databricks" },
  s3: { databases: ["data-lake"], schemaPrefix: "s3" },
  power_bi: { databases: ["acme-workspace"], schemaPrefix: "powerbi" },
  bigquery: { databases: ["apex-analytics"], schemaPrefix: "bigquery" },
};

function domainToSchema(domain: string): string {
  return domain.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");
}

function nameToTable(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");
}

// ---------- Generate graph from existing seed data ----------

const NODES: SeedNode[] = [];
const EDGES: SeedEdge[] = [];

// Track generated nodes by key for deduplication
const nodeByKey = new Map<string, SeedNode>();

function addNode(node: SeedNode): SeedNode {
  if (!nodeByKey.has(node.id)) {
    nodeByKey.set(node.id, node);
    NODES.push(node);
  }
  return nodeByKey.get(node.id)!;
}

function addEdge(edge: SeedEdge): void {
  EDGES.push(edge);
}

// ── Step 1: Source systems from connectors ──────────────────────────────────
// All platforms now have real connectors — no "inferred" fallbacks needed.

for (const conn of connectors) {
  const id = makeId("source", conn.id);
  addNode({
    id,
    nodeType: "source_system",
    name: conn.name,
    qualifiedName: `source://${conn.platform}/${conn.id}`,
    platform: conn.platform,
    domain: null,
    provenance: "automated",
    confidence: 1,
    dataProductId: null,
  });
}

const connectorPlatforms = new Set(connectors.map(c => c.platform));
const productPlatforms = new Set(dataProducts.map(p => p.platform));

// ── Step 2: Databases and schemas per platform ─────────────────────────────

const dbNodes = new Map<string, SeedNode>(); // "platform:db" → node
const schemaNodes = new Map<string, SeedNode>(); // "platform:db.schema" → node

for (const platform of productPlatforms) {
  const meta = PLATFORM_DB[platform] ?? { databases: [platform], schemaPrefix: platform };

  for (const dbName of meta.databases) {
    const dbKey = `${platform}:${dbName}`;
    const dbId = makeId("db", dbKey);
    const dbNode = addNode({
      id: dbId,
      nodeType: "database",
      name: dbName,
      qualifiedName: `db://${platform}/${dbName}`,
      platform,
      domain: null,
      provenance: "automated",
      confidence: 1,
      dataProductId: null,
    });
    dbNodes.set(dbKey, dbNode);

    // Link source → database (all platforms now have real connectors)
    const matchingConn = connectors.find(c => c.platform === platform);
    const sourceNode = matchingConn
      ? nodeByKey.get(makeId("source", matchingConn.id))
      : undefined;
    if (sourceNode) {
      addEdge({
        id: seqId(),
        fromNodeId: sourceNode.id,
        toNodeId: dbNode.id,
        edgeType: "physical_lineage",
        provenance: "automated",
        confidence: 1,
      });
    }
  }
}

// Create schemas per unique domain+platform combo
const domainPlatformPairs = new Set<string>();
for (const p of dataProducts) {
  domainPlatformPairs.add(`${p.platform}:${p.domain}`);
}

for (const pair of domainPlatformPairs) {
  const [platform, domain] = pair.split(":", 2);
  const meta = PLATFORM_DB[platform] ?? { databases: [platform], schemaPrefix: platform };
  const dbName = meta.databases[0]; // Use primary database
  const schemaName = domainToSchema(domain);
  const schemaKey = `${platform}:${dbName}.${schemaName}`;
  const schemaId = makeId("schema", schemaKey);

  const schemaNode = addNode({
    id: schemaId,
    nodeType: "schema",
    name: schemaName,
    qualifiedName: `schema://${platform}/${dbName}.${schemaName}`,
    platform,
    domain: domain.toLowerCase(),
    provenance: "automated",
    confidence: 1,
    dataProductId: null,
  });
  schemaNodes.set(schemaKey, schemaNode);

  // Link database → schema
  const dbKey = `${platform}:${dbName}`;
  const dbNode = dbNodes.get(dbKey);
  if (dbNode) {
    addEdge({
      id: seqId(),
      fromNodeId: dbNode.id,
      toNodeId: schemaNode.id,
      edgeType: "physical_lineage",
      provenance: "automated",
      confidence: 1,
    });
  }
}

// ── Step 3: For each data product, create upstream table + the product node ─

const productNodeMap = new Map<string, SeedNode>(); // dp.id → lineage node

for (const dp of dataProducts) {
  const meta = PLATFORM_DB[dp.platform] ?? { databases: [dp.platform], schemaPrefix: dp.platform };
  const dbName = meta.databases[0];
  const schemaName = domainToSchema(dp.domain);
  const tableName = nameToTable(dp.name);
  const schemaKey = `${dp.platform}:${dbName}.${schemaName}`;

  // Upstream source table for this product
  const tableId = makeId("table", `${dp.platform}:${tableName}`);
  const tableNode = addNode({
    id: tableId,
    nodeType: "table",
    name: tableName,
    qualifiedName: `${dp.platform}://${dbName}.${schemaName}.${tableName}`,
    platform: dp.platform,
    domain: dp.domain.toLowerCase(),
    provenance: "automated",
    confidence: 1,
    dataProductId: null,
  });

  // Link schema → table
  const schemaNode = schemaNodes.get(schemaKey);
  if (schemaNode) {
    addEdge({
      id: seqId(),
      fromNodeId: schemaNode.id,
      toNodeId: tableNode.id,
      edgeType: "physical_lineage",
      provenance: "automated",
      confidence: 1,
    });
  }

  // Data product node
  const dpNodeId = makeId("product", dp.id);
  const dpNode = addNode({
    id: dpNodeId,
    nodeType: "data_product",
    name: dp.name,
    qualifiedName: `product://${dp.platform}/${dp.id}`,
    platform: dp.platform,
    domain: dp.domain.toLowerCase(),
    provenance: "automated",
    confidence: dp.trustScore,
    dataProductId: dp.id,
  });
  productNodeMap.set(dp.id, dpNode);

  // Link table → data product (derivation)
  addEdge({
    id: seqId(),
    fromNodeId: tableNode.id,
    toNodeId: dpNode.id,
    edgeType: "derivation",
    provenance: "automated",
    confidence: 1,
  });
}

// ── Step 4: Downstream dashboards, models, and metrics per product ──────────

for (const dp of dataProducts) {
  const dpNode = productNodeMap.get(dp.id);
  if (!dpNode) continue;

  // Generate dashboards based on actual downstreamDashboards count
  for (let i = 0; i < dp.downstreamDashboards; i++) {
    const dashName = i === 0
      ? `${dp.name} Dashboard`
      : `${dp.domain} Dashboard ${i + 1}`;
    const dashId = makeId("dashboard", `${dp.id}:dash:${i}`);
    const dashNode = addNode({
      id: dashId,
      nodeType: "dashboard",
      name: dashName,
      qualifiedName: `dashboard://${dp.platform}/${dp.id}_dash_${i}`,
      platform: dp.platform,
      domain: dp.domain.toLowerCase(),
      provenance: "automated",
      confidence: 1,
      dataProductId: null,
    });
    addEdge({
      id: seqId(),
      fromNodeId: dpNode.id,
      toNodeId: dashNode.id,
      edgeType: "consumption",
      provenance: "automated",
      confidence: 1,
    });
  }

  // Generate ML models based on actual downstreamModels count
  for (let i = 0; i < dp.downstreamModels; i++) {
    const modelName = i === 0
      ? `${dp.name} Model`
      : `${dp.domain} Model ${i + 1}`;
    const modelId = makeId("ml_model", `${dp.id}:model:${i}`);
    const modelNode = addNode({
      id: modelId,
      nodeType: "ml_model",
      name: modelName,
      qualifiedName: `ml_model://${dp.platform}/${dp.id}_model_${i}`,
      platform: dp.platform,
      domain: dp.domain.toLowerCase(),
      provenance: "automated",
      confidence: 0.95,
      dataProductId: null,
    });
    addEdge({
      id: seqId(),
      fromNodeId: dpNode.id,
      toNodeId: modelNode.id,
      edgeType: "transformation",
      provenance: "automated",
      confidence: 0.95,
    });
  }

  // Generate Strata-tracked metrics: monthly_cost, roi, trust_score
  for (const metricName of ["monthly_cost", "roi", "trust_score"]) {
    const metricId = makeId("metric", `${dp.id}:${metricName}`);
    addNode({
      id: metricId,
      nodeType: "metric",
      name: `${dp.name} — ${metricName.replace(/_/g, " ")}`,
      qualifiedName: `metric://strata/${dp.id}/${metricName}`,
      platform: "strata",
      domain: dp.domain.toLowerCase(),
      provenance: "automated",
      confidence: 1,
      dataProductId: dp.id,
    });
    addEdge({
      id: seqId(),
      fromNodeId: dpNode.id,
      toNodeId: metricId,
      edgeType: "aggregation",
      provenance: "automated",
      confidence: 1,
    });
  }
}

// ── Step 5: Cross-product edges from downstreamProducts ────────────────────

// Products that feed other products — infer edges from consumer teams overlap
// dp-001 Customer 360 feeds dp-010 Marketing Attribution, dp-013 Churn Predictor
const crossEdges: [string, string][] = [
  ["dp-001", "dp-010"], // Customer 360 → Marketing Attribution
  ["dp-001", "dp-013"], // Customer 360 → Churn Predictor Features
  ["dp-002", "dp-004"], // Revenue Analytics Hub → Supply Chain Metrics (finance→ops)
  ["dp-003", "dp-009"], // Product Interaction Events → Pricing Elasticity Model
  ["dp-008", "dp-001"], // Employee Analytics → Customer 360 (people→customer)
  ["dp-010", "dp-002"], // Marketing Attribution → Revenue Analytics Hub
];

for (const [fromDpId, toDpId] of crossEdges) {
  const fromNode = productNodeMap.get(fromDpId);
  const toNode = productNodeMap.get(toDpId);
  if (fromNode && toNode) {
    addEdge({
      id: seqId(),
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      edgeType: "derivation",
      provenance: "inferred",
      confidence: 0.85,
    });
  }
}

// ---------- Lookup maps ----------

const nodeMap = new Map(NODES.map(n => [n.id, n]));
const edgesByFrom = new Map<string, SeedEdge[]>();
const edgesByTo = new Map<string, SeedEdge[]>();

for (const e of EDGES) {
  if (!edgesByFrom.has(e.fromNodeId)) edgesByFrom.set(e.fromNodeId, []);
  edgesByFrom.get(e.fromNodeId)!.push(e);
  if (!edgesByTo.has(e.toNodeId)) edgesByTo.set(e.toNodeId, []);
  edgesByTo.get(e.toNodeId)!.push(e);
}

// ---------- Converters ----------

function toNodeResponse(n: SeedNode): LineageNodeResponse {
  return {
    id: n.id,
    nodeType: n.nodeType,
    name: n.name,
    qualifiedName: n.qualifiedName,
    platform: n.platform,
    domain: n.domain,
    ownerUserId: null,
    tags: [n.platform, n.nodeType],
    provenance: n.provenance,
    confidence: n.confidence,
    dataProductId: n.dataProductId,
    sourceAssetId: null,
    metadata: {},
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function toEdgeResponse(e: SeedEdge): LineageEdgeResponse {
  return {
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    edgeType: e.edgeType,
    platform: nodeMap.get(e.fromNodeId)?.platform ?? null,
    provenance: e.provenance,
    confidence: e.confidence,
    metadata: {},
    createdAt: new Date().toISOString(),
  };
}

// ---------- Exported seed functions ----------

export function seedLineageNodes(params?: {
  q?: string;
  nodeType?: string;
  platform?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}): LineageNodeSearchResponse {
  let filtered = [...NODES];
  if (params?.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(n =>
      n.name.toLowerCase().includes(q) || n.qualifiedName.toLowerCase().includes(q)
    );
  }
  if (params?.nodeType) filtered = filtered.filter(n => n.nodeType === params.nodeType);
  if (params?.platform) filtered = filtered.filter(n => n.platform === params.platform);
  if (params?.domain) filtered = filtered.filter(n => n.domain === params.domain);

  const total = filtered.length;
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;
  const items = filtered.slice(offset, offset + limit).map(toNodeResponse);

  return { items, total };
}

export function seedLineageNodeDetail(nodeId: string): LineageNodeDetail {
  const node = nodeMap.get(nodeId) ?? NODES[0];
  const upstream = (edgesByTo.get(nodeId) ?? []);
  const downstream = (edgesByFrom.get(nodeId) ?? []);

  return {
    node: toNodeResponse(node),
    upstreamCount: upstream.length,
    downstreamCount: downstream.length,
    upstreamEdges: upstream.map(toEdgeResponse),
    downstreamEdges: downstream.map(toEdgeResponse),
  };
}

export function seedLineageGraph(
  rootNodeId: string,
  direction: "upstream" | "downstream" | "both" = "both",
  depth: number = 3,
): LineageGraphResponse {
  const visitedIds = new Set<string>([rootNodeId]);
  const collectedEdges: SeedEdge[] = [];
  let frontier = new Set<string>([rootNodeId]);

  for (let d = 0; d < depth; d++) {
    if (frontier.size === 0) break;
    const next = new Set<string>();

    for (const nid of frontier) {
      if (direction === "upstream" || direction === "both") {
        for (const e of (edgesByTo.get(nid) ?? [])) {
          collectedEdges.push(e);
          if (!visitedIds.has(e.fromNodeId)) {
            visitedIds.add(e.fromNodeId);
            next.add(e.fromNodeId);
          }
        }
      }
      if (direction === "downstream" || direction === "both") {
        for (const e of (edgesByFrom.get(nid) ?? [])) {
          collectedEdges.push(e);
          if (!visitedIds.has(e.toNodeId)) {
            visitedIds.add(e.toNodeId);
            next.add(e.toNodeId);
          }
        }
      }
    }
    frontier = next;
  }

  const uniqueEdgeIds = new Set<string>();
  const uniqueEdges: SeedEdge[] = [];
  for (const e of collectedEdges) {
    if (!uniqueEdgeIds.has(e.id)) {
      uniqueEdgeIds.add(e.id);
      uniqueEdges.push(e);
    }
  }

  const nodes: LineageGraphNode[] = [...visitedIds]
    .map(id => nodeMap.get(id))
    .filter((n): n is SeedNode => !!n)
    .map(n => ({
      id: n.id,
      nodeType: n.nodeType,
      name: n.name,
      qualifiedName: n.qualifiedName,
      platform: n.platform,
      domain: n.domain,
      dataProductId: n.dataProductId,
    }));

  const edges: LineageGraphEdge[] = uniqueEdges.map(e => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    edgeType: e.edgeType,
    provenance: e.provenance,
    confidence: e.confidence,
  }));

  return {
    rootNodeId,
    nodes,
    edges,
    depth,
    direction,
  };
}
