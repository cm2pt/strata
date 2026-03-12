"use client";

import { X, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLineageNodeDetail } from "@/lib/api/hooks";
import type { LineageEdgeResponse } from "@/lib/types";

interface NodeDetailDrawerProps {
  nodeId: string | null;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
}

const PROVENANCE_COLORS: Record<string, string> = {
  automated: "bg-green-100 text-green-700",
  inferred: "bg-amber-100 text-amber-700",
  manual: "bg-red-100 text-red-700",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  source_system: "bg-gray-100 text-gray-700",
  database: "bg-blue-100 text-blue-700",
  schema: "bg-indigo-100 text-indigo-700",
  table: "bg-emerald-100 text-emerald-700",
  view: "bg-teal-100 text-teal-700",
  column: "bg-cyan-100 text-cyan-700",
  etl_job: "bg-orange-100 text-orange-700",
  dbt_model: "bg-purple-100 text-purple-700",
  notebook: "bg-yellow-100 text-yellow-700",
  dataset: "bg-green-100 text-green-700",
  data_product: "bg-pink-100 text-pink-700",
  dashboard: "bg-rose-100 text-rose-700",
  report: "bg-amber-100 text-amber-700",
  metric: "bg-violet-100 text-violet-700",
  ml_model: "bg-fuchsia-100 text-fuchsia-700",
  api_endpoint: "bg-lime-100 text-lime-700",
  application: "bg-sky-100 text-sky-700",
};

function EdgeList({
  edges,
  label,
  icon: Icon,
  onNavigate,
}: {
  edges: LineageEdgeResponse[];
  label: string;
  icon: typeof ArrowUpRight;
  onNavigate: (nodeId: string) => void;
}) {
  if (edges.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label} ({edges.length})
      </h4>
      <div className="space-y-1.5">
        {edges.map((edge) => (
          <button
            key={edge.id}
            onClick={() => onNavigate(label.includes("Upstream") ? edge.fromNodeId : edge.toNodeId)}
            className="w-full text-left px-3 py-2 rounded-md border hover:bg-muted/50 transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {edge.edgeType.replace(/_/g, " ")}
              </Badge>
              <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                {label.includes("Upstream") ? edge.fromNodeId.slice(0, 8) : edge.toNodeId.slice(0, 8)}...
              </span>
            </div>
            <Badge variant="secondary" className={PROVENANCE_COLORS[edge.provenance] ?? ""}>
              {edge.provenance}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NodeDetailDrawer({ nodeId, onClose, onNavigateToNode }: NodeDetailDrawerProps) {
  const { data, loading } = useLineageNodeDetail(nodeId);

  if (!nodeId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[400px] bg-background border-l shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Node Details</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Node info */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={NODE_TYPE_COLORS[data.node.nodeType] ?? ""}>
                  {data.node.nodeType.replace(/_/g, " ")}
                </Badge>
                <Badge variant="secondary" className={PROVENANCE_COLORS[data.node.provenance] ?? ""}>
                  {data.node.provenance}
                </Badge>
              </div>

              <h2 className="text-lg font-semibold">{data.node.name}</h2>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Platform</span>
                  <p className="font-medium">{data.node.platform}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Domain</span>
                  <p className="font-medium">{data.node.domain ?? "\u2014"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence</span>
                  <p className="font-medium">{Math.round(data.node.confidence * 100)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Connections</span>
                  <p className="font-medium">{data.upstreamCount} up / {data.downstreamCount} down</p>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Qualified Name</span>
                <p className="font-mono text-[11px] mt-0.5 break-all">{data.node.qualifiedName}</p>
              </div>

              {data.node.dataProductId && (
                <a
                  href={`/assets/${data.node.dataProductId}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Data Product
                </a>
              )}
            </Card>

            {/* Upstream */}
            <EdgeList
              edges={data.upstreamEdges}
              label="Upstream Sources"
              icon={ArrowUpRight}
              onNavigate={onNavigateToNode}
            />

            {/* Downstream */}
            <EdgeList
              edges={data.downstreamEdges}
              label="Downstream Consumers"
              icon={ArrowDownRight}
              onNavigate={onNavigateToNode}
            />
          </>
        )}
      </div>
    </div>
  );
}
