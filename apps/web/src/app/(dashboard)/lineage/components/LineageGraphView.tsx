"use client";

import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LineageGraphResponse, LineageGraphNode } from "@/lib/types";

// Node type → visual config
const NODE_STYLES: Record<string, { color: string; label: string; emoji: string }> = {
  source_system: { color: "#6B7280", label: "Source", emoji: "\uD83D\uDCE1" },
  database: { color: "#3B82F6", label: "Database", emoji: "\uD83D\uDDC4\uFE0F" },
  schema: { color: "#6366F1", label: "Schema", emoji: "\uD83D\uDCC2" },
  table: { color: "#10B981", label: "Table", emoji: "\uD83D\uDCCA" },
  view: { color: "#14B8A6", label: "View", emoji: "\uD83D\uDC41\uFE0F" },
  column: { color: "#06B6D4", label: "Column", emoji: "\uD83D\uDD24" },
  etl_job: { color: "#F97316", label: "ETL", emoji: "\u2699\uFE0F" },
  dbt_model: { color: "#A855F7", label: "dbt", emoji: "\uD83D\uDD27" },
  notebook: { color: "#EAB308", label: "Notebook", emoji: "\uD83D\uDCD3" },
  dataset: { color: "#22C55E", label: "Dataset", emoji: "\uD83D\uDCE6" },
  data_product: { color: "#EC4899", label: "Product", emoji: "\u2B50" },
  dashboard: { color: "#F43F5E", label: "Dashboard", emoji: "\uD83D\uDCCB" },
  report: { color: "#F59E0B", label: "Report", emoji: "\uD83D\uDCC4" },
  metric: { color: "#8B5CF6", label: "Metric", emoji: "\uD83C\uDFAF" },
  ml_model: { color: "#D946EF", label: "ML Model", emoji: "\uD83E\uDD16" },
  api_endpoint: { color: "#84CC16", label: "API", emoji: "\uD83D\uDD17" },
  application: { color: "#0EA5E9", label: "App", emoji: "\uD83D\uDCF1" },
};

interface LineageGraphViewProps {
  graph: LineageGraphResponse;
  onNodeClick: (nodeId: string) => void;
}

/**
 * Simple layered graph visualization using SVG.
 *
 * Nodes are organized in horizontal layers by their type (upstream → downstream).
 * This is a basic layout — for a production app you'd use a dedicated graph library
 * like ReactFlow, dagre, or ELK.
 */
export function LineageGraphView({ graph, onNodeClick }: LineageGraphViewProps) {
  // Organize nodes into layers based on their type hierarchy
  const layers = useMemo(() => {
    const typeOrder: Record<string, number> = {
      source_system: 0, database: 1, schema: 2, table: 3, view: 4,
      etl_job: 3, column: 5, dbt_model: 5, notebook: 5,
      dataset: 6, data_product: 6, dashboard: 7, report: 8,
      metric: 8, ml_model: 6, api_endpoint: 8, application: 9,
    };

    const layerMap = new Map<number, LineageGraphNode[]>();
    for (const node of graph.nodes) {
      const layer = typeOrder[node.nodeType] ?? 5;
      if (!layerMap.has(layer)) layerMap.set(layer, []);
      layerMap.get(layer)!.push(node);
    }

    return [...layerMap.entries()].sort((a, b) => a[0] - b[0]);
  }, [graph.nodes]);

  // Position nodes
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const layerWidth = 220;
    const nodeHeight = 60;

    layers.forEach(([, nodes], layerIdx) => {
      const totalHeight = nodes.length * nodeHeight;
      const startY = Math.max(0, (400 - totalHeight) / 2);

      nodes.forEach((node, nodeIdx) => {
        positions.set(node.id, {
          x: 40 + layerIdx * layerWidth,
          y: startY + nodeIdx * nodeHeight + 20,
        });
      });
    });

    return positions;
  }, [layers]);

  // Calculate SVG dimensions
  const svgWidth = Math.max(800, (layers.length + 1) * 220);
  const maxNodesInLayer = Math.max(...layers.map(([, nodes]) => nodes.length), 1);
  const svgHeight = Math.max(400, maxNodesInLayer * 60 + 60);

  // Root node
  const rootId = graph.rootNodeId;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {graph.nodes.length} nodes, {graph.edges.length} edges (depth {graph.depth}, {graph.direction})
        </p>
        <div className="flex gap-2 flex-wrap">
          {[...new Set(graph.nodes.map(n => n.nodeType))].map(nt => {
            const style = NODE_STYLES[nt];
            return (
              <span key={nt} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: style?.color ?? "#666" }}
                />
                {style?.label ?? nt}
              </span>
            );
          })}
        </div>
      </div>

      <div className="overflow-auto p-4 bg-slate-50/50">
        <svg width={svgWidth} height={svgHeight} className="min-w-full">
          {/* Edges */}
          {graph.edges.map((edge) => {
            const from = nodePositions.get(edge.fromNodeId);
            const to = nodePositions.get(edge.toNodeId);
            if (!from || !to) return null;

            const fromX = from.x + 160;
            const toX = to.x;
            const fromY = from.y + 16;
            const toY = to.y + 16;
            const midX = (fromX + toX) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={`M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`}
                  fill="none"
                  stroke={edge.provenance === "manual" ? "#EF4444" : edge.provenance === "inferred" ? "#F59E0B" : "#94A3B8"}
                  strokeWidth={edge.confidence >= 0.95 ? 2 : 1}
                  strokeDasharray={edge.provenance === "inferred" ? "4,4" : undefined}
                  opacity={0.6}
                />
                {/* Arrow */}
                <circle cx={toX} cy={toY} r={3} fill={edge.provenance === "manual" ? "#EF4444" : edge.provenance === "inferred" ? "#F59E0B" : "#94A3B8"} />
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;
            const style = NODE_STYLES[node.nodeType] ?? { color: "#666", label: "Unknown", emoji: "\u2753" };
            const isRoot = node.id === rootId;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                className="cursor-pointer"
                onClick={() => onNodeClick(node.id)}
              >
                <rect
                  x={0} y={0}
                  width={160} height={32}
                  rx={6}
                  fill="white"
                  stroke={isRoot ? style.color : "#E2E8F0"}
                  strokeWidth={isRoot ? 2.5 : 1}
                  filter={isRoot ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : undefined}
                />
                <rect
                  x={0} y={0}
                  width={4} height={32}
                  rx={2}
                  fill={style.color}
                />
                <text x={12} y={14} fontSize={9} fill="#6B7280" fontFamily="system-ui">
                  {style.label}
                </text>
                <text x={12} y={26} fontSize={11} fill="#1F2937" fontWeight={isRoot ? 600 : 500} fontFamily="system-ui">
                  {node.name.length > 18 ? node.name.slice(0, 18) + "\u2026" : node.name}
                </text>
                {node.platform && (
                  <text x={148} y={14} fontSize={8} fill="#9CA3AF" textAnchor="end" fontFamily="system-ui">
                    {node.platform}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
