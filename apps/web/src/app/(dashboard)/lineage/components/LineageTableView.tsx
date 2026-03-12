"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { LineageNodeResponse } from "@/lib/types";

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

const PROVENANCE_COLORS: Record<string, string> = {
  automated: "bg-green-100 text-green-700",
  inferred: "bg-amber-100 text-amber-700",
  manual: "bg-red-100 text-red-700",
};

interface LineageTableViewProps {
  nodes: LineageNodeResponse[];
  total: number;
  onNodeClick: (nodeId: string) => void;
}

export function LineageTableView({ nodes, total, onNodeClick }: LineageTableViewProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-medium text-muted-foreground">
          Showing {nodes.length} of {total} lineage nodes
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Platform</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Domain</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Provenance</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Confidence</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Qualified Name</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr
                key={node.id}
                className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onNodeClick(node.id)}
              >
                <td className="px-4 py-2.5 font-medium">{node.name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className={NODE_TYPE_COLORS[node.nodeType] ?? "bg-gray-100 text-gray-700"}>
                    {node.nodeType.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{node.platform}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{node.domain ?? "\u2014"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className={PROVENANCE_COLORS[node.provenance] ?? ""}>
                    {node.provenance}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${node.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(node.confidence * 100)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                  {node.qualifiedName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
