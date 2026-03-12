"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton } from "@/components/shared/skeleton";
import { FileSearch, Database } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useAssetProvenance } from "@/lib/api/hooks";
import type { AutomationLevel } from "@/lib/types";

const LEVEL_BADGE: Record<AutomationLevel, { label: string; className: string }> = {
  fully_automated: { label: "Automated", className: "bg-teal-50 text-teal-700" },
  semi_automated: { label: "Semi-Auto", className: "bg-amber-50 text-amber-700" },
  manual: { label: "Manual", className: "bg-red-50 text-red-700" },
};

const PLATFORM_ICON: Record<string, string> = {
  snowflake: "\u2744\uFE0F",
  databricks: "\uD83E\uDDF1",
  bigquery: "\uD83D\uDD0D",
  s3: "\uD83E\uDEA3",
  power_bi: "\uD83D\uDCCA",
  internal: "\u2699\uFE0F",
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface AssetProvenanceTabProps {
  productId: string;
}

export function AssetProvenanceTab({ productId }: AssetProvenanceTabProps) {
  const { data, loading } = useAssetProvenance(productId);

  return (
    <TabsContent value="provenance" className="space-y-6">
      <Card>
        <SectionHeader
          title="Data Sources"
          subtitle="Field-level provenance tracking — where each metric originates"
          icon={FileSearch}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />

        {loading ? (
          <TableSkeleton rows={6} />
        ) : !data || data.fields.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No data source information"
            description="Field-level provenance will appear here once connectors report metadata for this product."
          />
        ) : (
          <>
            {/* Summary bar */}
            <div className="mt-4 mb-5 flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{data.fields.filter(f => f.automationLevel === "fully_automated").length}</span>
                {" "}of{" "}
                <span className="font-semibold text-gray-900">{data.fields.length}</span>
                {" "}fields fully automated
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Coverage</span>
                <div className="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.round(data.automationCoverage * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">{Math.round(data.automationCoverage * 100)}%</span>
              </div>
            </div>

            {/* Field provenance table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Field</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Source Platform</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Extraction Method</th>
                    <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Automation</th>
                    <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Confidence</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 pb-2">Last Observed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fields.map((f) => {
                    const badge = LEVEL_BADGE[f.automationLevel] ?? LEVEL_BADGE.manual;
                    const icon = PLATFORM_ICON[f.sourcePlatform] ?? "\uD83D\uDD17";
                    const confPct = Math.round(f.confidence * 100);
                    return (
                      <tr key={f.fieldName} className="border-b border-border/50 last:border-b-0">
                        <td className="py-2.5 pr-4 text-xs font-medium text-gray-900 font-mono">{f.fieldName}</td>
                        <td className="py-2.5 pr-4 text-xs text-gray-600">
                          <span className="mr-1.5">{icon}</span>
                          {f.sourcePlatform}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-gray-500 font-mono">{f.extractionMethod}</td>
                        <td className="py-2.5 pr-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${confPct >= 90 ? "bg-teal-500" : confPct >= 70 ? "bg-blue-500" : "bg-amber-400"}`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono w-8">{confPct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-xs text-gray-400">{formatTimeAgo(f.lastObservedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </TabsContent>
  );
}
