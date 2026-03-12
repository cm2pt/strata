"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Layers } from "lucide-react";
import type { ConnectorDepthSummary } from "@/lib/types";

const PLATFORM_META: Record<string, { name: string; icon: string; color: string }> = {
  snowflake: { name: "Snowflake", icon: "\u2744\uFE0F", color: "bg-blue-50 border-blue-200" },
  databricks: { name: "Databricks", icon: "\uD83E\uDDF1", color: "bg-orange-50 border-orange-200" },
  bigquery: { name: "BigQuery", icon: "\uD83D\uDD0D", color: "bg-indigo-50 border-indigo-200" },
  s3: { name: "Amazon S3", icon: "\uD83E\uDEA3", color: "bg-amber-50 border-amber-200" },
  power_bi: { name: "Power BI", icon: "\uD83D\uDCCA", color: "bg-yellow-50 border-yellow-200" },
  discovery_replay: { name: "Discovery", icon: "\uD83D\uDD04", color: "bg-gray-50 border-gray-200" },
};

const STATUS_STYLES: Record<string, string> = {
  success: "bg-teal-50 text-teal-700",
  partial: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  unknown: "bg-gray-50 text-gray-500",
};

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  connectors: ConnectorDepthSummary[];
}

export function PlatformOverviewCards({ connectors }: Props) {
  return (
    <div>
      <SectionHeader
        title="Platform Connectors"
        subtitle="Capability coverage & sync status per platform"
        icon={Layers}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        {connectors.map((c) => {
          const meta = PLATFORM_META[c.platform] ?? { name: c.platform, icon: "\uD83D\uDD17", color: "bg-gray-50 border-gray-200" };
          const statusCls = STATUS_STYLES[c.syncStatus] ?? STATUS_STYLES.unknown;
          const coveragePct = Math.round(c.coveragePct * 100);
          const autoPct = Math.round(c.automationCoverage * 100);

          return (
            <Card key={c.connectorId}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{c.connectorName}</h3>
                    <p className="text-xs text-gray-400">{meta.name}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                  {c.syncStatus}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Objects Managed</p>
                  <p className="text-lg font-semibold text-gray-900 mt-0.5">{c.objectsManaged}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Last Sync</p>
                  <p className="text-sm text-gray-700 mt-1">{formatTimeAgo(c.lastSyncAt)}</p>
                </div>
              </div>

              {/* Capability coverage bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Capabilities</span>
                  <span className="text-xs font-medium text-gray-600">
                    {c.availableCapabilities}/{c.totalCapabilities} &mdash; {coveragePct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
              </div>

              {/* Automation coverage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Automation</span>
                  <span className="text-xs font-medium text-gray-600">{autoPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{ width: `${autoPct}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
