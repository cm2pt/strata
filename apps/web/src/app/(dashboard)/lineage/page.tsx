"use client";

import { useState, useCallback } from "react";
import { Search, Table2, GitBranch, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { KPICard } from "@/components/shared/kpi-card";
import { useLineageNodes, useLineageGraph } from "@/lib/api/hooks";
import { LineageTableView, LineageGraphView, NodeDetailDrawer } from "./components";

type ViewMode = "table" | "graph";

export default function LineageCenterPage() {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");

  // Node detail drawer
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Graph view state
  const [graphRootId, setGraphRootId] = useState<string | null>(null);
  const [graphDirection, setGraphDirection] = useState<"upstream" | "downstream" | "both">("both");
  const [graphDepth, setGraphDepth] = useState(3);

  // Data hooks
  const { data: nodesData, loading: nodesLoading } = useLineageNodes({
    q: searchQuery || undefined,
    nodeType: nodeTypeFilter || undefined,
    platform: platformFilter || undefined,
    limit: 100,
  });

  const { data: graphData, loading: graphLoading } = useLineageGraph({
    rootNodeId: graphRootId,
    direction: graphDirection,
    depth: graphDepth,
  });

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleExploreNode = useCallback((nodeId: string) => {
    setGraphRootId(nodeId);
    setViewMode("graph");
  }, []);

  const isLoading = nodesLoading;

  // Stats
  const totalNodes = nodesData?.total ?? 0;
  const nodeTypes = nodesData?.items ? [...new Set(nodesData.items.map(n => n.nodeType))] : [];
  const platforms = nodesData?.items ? [...new Set(nodesData.items.map(n => n.platform))] : [];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Lineage Center"
        subtitle="End-to-end data lineage — trace every metric from source to dashboard"
      />
      <PageShell>
        {/* KPI Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Nodes"
              value={totalNodes.toLocaleString()}
              info="All lineage nodes across all platforms"
            />
            <KPICard
              label="Node Types"
              value={String(nodeTypes.length)}
              info="Distinct types: tables, views, dashboards, etc."
            />
            <KPICard
              label="Platforms"
              value={String(platforms.length)}
              info="Connected platforms with lineage data"
            />
            <KPICard
              label="Graph Root"
              value={graphRootId ? "Selected" : "None"}
              info="Select a node to explore its lineage graph"
              variant={graphRootId ? "positive" : "default"}
            />
          </div>
        )}

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nodes by name or qualified name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={nodeTypeFilter}
              onChange={(e) => setNodeTypeFilter(e.target.value)}
              className="text-sm border rounded-md px-2 py-1.5 bg-background"
            >
              <option value="">All Types</option>
              {["table", "view", "dbt_model", "etl_job", "data_product", "dashboard", "report", "metric", "ml_model", "notebook", "source_system", "database", "schema", "column", "api_endpoint", "application"].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-sm border rounded-md px-2 py-1.5 bg-background"
            >
              <option value="">All Platforms</option>
              {["snowflake", "databricks", "bigquery", "dbt", "power_bi", "strata", "s3"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-md border overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "graph" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Graph
            </button>
          </div>
        </div>

        {/* Graph Controls (shown in graph mode) */}
        {viewMode === "graph" && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-md border text-xs">
            <span className="text-muted-foreground font-medium">Graph Controls:</span>
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground">Direction:</label>
              <select
                value={graphDirection}
                onChange={(e) => setGraphDirection(e.target.value as "upstream" | "downstream" | "both")}
                className="border rounded px-1.5 py-1 bg-background text-xs"
              >
                <option value="both">Both</option>
                <option value="upstream">Upstream</option>
                <option value="downstream">Downstream</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground">Depth:</label>
              <input
                type="range"
                min={1}
                max={6}
                value={graphDepth}
                onChange={(e) => setGraphDepth(Number(e.target.value))}
                className="w-20"
              />
              <span className="font-medium">{graphDepth}</span>
            </div>
            {!graphRootId && (
              <span className="text-amber-600 ml-auto">
                Click a node in the table to explore its lineage graph
              </span>
            )}
          </div>
        )}

        {/* Content */}
        {viewMode === "table" && nodesData && nodesData.items.length > 0 && (
          <LineageTableView
            nodes={nodesData.items}
            total={nodesData.total}
            onNodeClick={(nodeId) => {
              handleNodeClick(nodeId);
              handleExploreNode(nodeId);
            }}
          />
        )}

        {viewMode === "table" && !nodesLoading && (!nodesData || nodesData.items.length === 0) && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg space-y-3">
            <GitBranch className="h-10 w-10 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">No lineage data available</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-md">
                Lineage nodes will appear once data platforms are connected and synced,
                or after running the seeder to populate demo data.
              </p>
            </div>
          </div>
        )}

        {viewMode === "graph" && graphData && graphData.nodes.length > 0 && (
          <LineageGraphView graph={graphData} onNodeClick={handleNodeClick} />
        )}

        {viewMode === "graph" && !graphRootId && (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Select a node from the table view to explore its lineage graph
          </div>
        )}

        {/* Node Detail Drawer */}
        {selectedNodeId && (
          <NodeDetailDrawer
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
            onNavigateToNode={(nodeId) => {
              setSelectedNodeId(nodeId);
              setGraphRootId(nodeId);
            }}
          />
        )}
      </PageShell>
    </div>
  );
}
