"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, ExternalLink, ArrowUpRight, ArrowDownRight, Network } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useLineageNodes, useLineageGraph } from "@/lib/api/hooks";
import type { LineageGraphNode, LineageGraphEdge } from "@/lib/types";

const NODE_TYPE_COLORS: Record<string, string> = {
  table: "bg-emerald-100 text-emerald-700",
  view: "bg-teal-100 text-teal-700",
  dbt_model: "bg-purple-100 text-purple-700",
  dashboard: "bg-rose-100 text-rose-700",
  report: "bg-amber-100 text-amber-700",
  metric: "bg-violet-100 text-violet-700",
  data_product: "bg-pink-100 text-pink-700",
  ml_model: "bg-fuchsia-100 text-fuchsia-700",
  etl_job: "bg-orange-100 text-orange-700",
};

interface AssetLineageTabProps {
  productId: string;
  productName: string;
}

function NodeList({
  nodes,
  edges,
  label,
  icon: Icon,
  rootNodeId,
}: {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  label: string;
  icon: typeof ArrowUpRight;
  rootNodeId: string;
}) {
  // Filter to only direct connections (not the root itself)
  const directNodes = nodes.filter(n => n.id !== rootNodeId);

  if (directNodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No {label.toLowerCase()} found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {directNodes.slice(0, 10).map(node => {
        const edgeInfo = edges.find(e =>
          label.includes("Upstream")
            ? e.toNodeId === rootNodeId && e.fromNodeId === node.id
            : e.fromNodeId === rootNodeId && e.toNodeId === node.id
        );
        return (
          <div key={node.id} className="flex items-center justify-between px-3 py-2 rounded-md border hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="secondary" className={NODE_TYPE_COLORS[node.nodeType] ?? "bg-gray-100 text-gray-700"}>
                {node.nodeType.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">{node.platform}</span>
            </div>
            {edgeInfo && (
              <Badge variant="outline" className="text-[10px]">
                {edgeInfo.edgeType.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        );
      })}
      {directNodes.length > 10 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          + {directNodes.length - 10} more
        </p>
      )}
    </div>
  );
}

export function AssetLineageTab({ productId, productName }: AssetLineageTabProps) {
  // Find the lineage node for this data product
  const { data: nodeSearch } = useLineageNodes({
    q: productName,
    nodeType: "data_product",
    limit: 5,
  });

  // Get the first matching node
  const productNode = nodeSearch?.items?.find(n => n.dataProductId === productId) ?? nodeSearch?.items?.[0];
  const nodeId = productNode?.id ?? null;

  // Fetch upstream and downstream separately for clarity
  const { data: upstreamGraph } = useLineageGraph({
    rootNodeId: nodeId,
    direction: "upstream",
    depth: 2,
  });
  const { data: downstreamGraph } = useLineageGraph({
    rootNodeId: nodeId,
    direction: "downstream",
    depth: 2,
  });

  return (
    <TabsContent value="lineage" className="space-y-6">
      <SectionHeader
        title="Data Lineage"
        subtitle="Trace upstream sources and downstream consumers for this data product"
      />

      {/* Link to full lineage center */}
      {nodeId && (
        <Link
          href={`/lineage`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <GitBranch className="h-3.5 w-3.5" />
          View full lineage in Lineage Center
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}

      {!nodeId ? (
        <EmptyState
          icon={Network}
          title="No lineage data available"
          description="Lineage tracking requires a connected metadata catalog. Connect a platform with lineage support to see upstream sources and downstream consumers."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upstream */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
              Upstream Sources
            </h3>
            {upstreamGraph ? (
              <NodeList
                nodes={upstreamGraph.nodes}
                edges={upstreamGraph.edges}
                label="Upstream Sources"
                icon={ArrowUpRight}
                rootNodeId={nodeId}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            )}
          </Card>

          {/* Downstream */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              Downstream Consumers
            </h3>
            {downstreamGraph ? (
              <NodeList
                nodes={downstreamGraph.nodes}
                edges={downstreamGraph.edges}
                label="Downstream Consumers"
                icon={ArrowDownRight}
                rootNodeId={nodeId}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            )}
          </Card>
        </div>
      )}
    </TabsContent>
  );
}
