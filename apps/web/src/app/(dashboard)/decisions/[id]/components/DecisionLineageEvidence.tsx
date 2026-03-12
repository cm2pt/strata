"use client";

import Link from "next/link";
import { GitBranch, ArrowUpRight, ArrowDownRight, ExternalLink, AlertTriangle } from "lucide-react";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { useLineageNodes, useLineageGraph } from "@/lib/api/hooks";
import type { Decision } from "@/lib/types";

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

interface DecisionLineageEvidenceProps {
  decision: Decision;
}

export function DecisionLineageEvidence({ decision }: DecisionLineageEvidenceProps) {
  // Find the lineage node for the decision's product
  const { data: nodeSearch } = useLineageNodes({
    q: decision.productName,
    nodeType: "data_product",
    limit: 5,
  });

  const productNode = nodeSearch?.items?.find(n => n.dataProductId === decision.productId) ?? nodeSearch?.items?.[0];
  const nodeId = productNode?.id ?? null;

  // Fetch downstream to show impact
  const { data: downstreamGraph } = useLineageGraph({
    rootNodeId: nodeId,
    direction: "downstream",
    depth: 2,
  });

  // Fetch upstream to show sources
  const { data: upstreamGraph } = useLineageGraph({
    rootNodeId: nodeId,
    direction: "upstream",
    depth: 2,
  });

  const downstreamNodes = downstreamGraph?.nodes?.filter(n => n.id !== nodeId) ?? [];
  const upstreamNodes = upstreamGraph?.nodes?.filter(n => n.id !== nodeId) ?? [];

  // Count downstream by type for impact summary
  const downstreamByType: Record<string, number> = {};
  for (const n of downstreamNodes) {
    downstreamByType[n.nodeType] = (downstreamByType[n.nodeType] ?? 0) + 1;
  }

  const hasLineage = nodeId !== null;
  const isRetirement = decision.type === "retirement";
  const hasDownstreamImpact = downstreamNodes.length > 0;

  return (
    <Card>
      <SectionHeader title="Lineage Evidence" icon={GitBranch} />

      {!hasLineage ? (
        <div className="mt-4 text-sm text-muted-foreground text-center py-6">
          No lineage data found for this product. Lineage evidence will appear once
          the product is tracked in the lineage graph.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Impact Warning for retirements */}
          {isRetirement && hasDownstreamImpact && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Downstream Impact Warning
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Retiring <strong>{decision.productName}</strong> will affect{" "}
                  <strong>{downstreamNodes.length}</strong> downstream consumer{downstreamNodes.length !== 1 ? "s" : ""}
                  {Object.entries(downstreamByType).length > 0 && (
                    <> including {Object.entries(downstreamByType).map(([type, count], i, arr) => (
                      <span key={type}>
                        {count} {type.replace(/_/g, " ")}{count !== 1 ? "s" : ""}
                        {i < arr.length - 1 ? ", " : ""}
                      </span>
                    ))}</>
                  )}.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upstream Sources */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
                Upstream Sources ({upstreamNodes.length})
              </h4>
              {upstreamNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No upstream sources</p>
              ) : (
                <div className="space-y-1.5">
                  {upstreamNodes.slice(0, 6).map(node => (
                    <div key={node.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border hover:bg-muted/30">
                      <Badge variant="secondary" className={`text-[10px] ${NODE_TYPE_COLORS[node.nodeType] ?? "bg-gray-100 text-gray-700"}`}>
                        {node.nodeType.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-medium truncate">{node.name}</span>
                      <span className="text-muted-foreground ml-auto">{node.platform}</span>
                    </div>
                  ))}
                  {upstreamNodes.length > 6 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      + {upstreamNodes.length - 6} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Downstream Consumers */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <ArrowDownRight className="h-3.5 w-3.5 text-green-500" />
                Downstream Consumers ({downstreamNodes.length})
              </h4>
              {downstreamNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No downstream consumers</p>
              ) : (
                <div className="space-y-1.5">
                  {downstreamNodes.slice(0, 6).map(node => (
                    <div key={node.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border hover:bg-muted/30">
                      <Badge variant="secondary" className={`text-[10px] ${NODE_TYPE_COLORS[node.nodeType] ?? "bg-gray-100 text-gray-700"}`}>
                        {node.nodeType.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-medium truncate">{node.name}</span>
                      <span className="text-muted-foreground ml-auto">{node.platform}</span>
                    </div>
                  ))}
                  {downstreamNodes.length > 6 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      + {downstreamNodes.length - 6} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Link to full lineage */}
          <div className="pt-2 border-t">
            <Link
              href="/lineage"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <GitBranch className="h-3 w-3" />
              Explore full lineage in Lineage Center
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
