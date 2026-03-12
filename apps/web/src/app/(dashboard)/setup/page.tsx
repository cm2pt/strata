"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CardSkeleton } from "@/components/shared/skeleton";
import { CoverageBar } from "@/components/shared/coverage-bar";
import { PageShell } from "@/components/shared/page-shell";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { useToast } from "@/components/shared/toast";
import { useConnectors, useOrgInfo } from "@/lib/api/hooks";
import { canMutate, apiPost } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/format";
import { card } from "@/lib/tokens";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Database,
  Zap,
  Shield,
  BarChart3,
  Settings,
  Users,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface PlatformInfo {
  name: string;
  icon: string;
  color: string;
  capabilities: string[];
}

const platformConfig: Record<string, PlatformInfo> = {
  snowflake: {
    name: "Snowflake",
    icon: "❄️",
    color: "bg-blue-50 border-blue-200",
    capabilities: ["Query cost attribution", "Storage costs", "Usage logs", "Object lineage"],
  },
  databricks: {
    name: "Databricks",
    icon: "🧱",
    color: "bg-orange-50 border-orange-200",
    capabilities: ["Cluster cost (if enabled)", "Usage logs", "Job costs", "Unity Catalog metadata"],
  },
  s3: {
    name: "Amazon S3",
    icon: "🪣",
    color: "bg-amber-50 border-amber-200",
    capabilities: ["Storage costs", "Access logs", "Object inventory"],
  },
  power_bi: {
    name: "Power BI",
    icon: "📊",
    color: "bg-yellow-50 border-yellow-200",
    capabilities: ["Report usage", "Dataset refresh costs", "Workspace metrics"],
  },
  bigquery: {
    name: "BigQuery",
    icon: "🔷",
    color: "bg-indigo-50 border-indigo-200",
    capabilities: ["Job cost attribution", "Storage costs", "Dataset metadata", "IAM policy lineage"],
  },
  discovery_replay: {
    name: "Discovery Replay",
    icon: "🔄",
    color: "bg-purple-50 border-purple-200",
    capabilities: ["Metadata replay", "Asset discovery", "Schema inference"],
  },
};

const UNKNOWN_PLATFORM: PlatformInfo = {
  name: "Unknown Platform",
  icon: "🔌",
  color: "bg-gray-50 border-gray-200",
  capabilities: [],
};

const statusConfig = {
  connected: { label: "Connected", icon: CheckCircle2, className: "text-emerald-600" },
  syncing: { label: "Syncing...", icon: Loader2, className: "text-blue-500 animate-spin" },
  error: { label: "Error", icon: AlertCircle, className: "text-red-500" },
  disconnected: { label: "Disconnected", icon: AlertCircle, className: "text-gray-400" },
};

export default function SetupPage() {
  const { data, loading } = useConnectors();
  const { data: orgInfo } = useOrgInfo();
  const { toastSuccess, toastError } = useToast();
  const [syncingConnectorId, setSyncingConnectorId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Setup" subtitle="Manage connectors, teams, and organization settings" />
        <PageShell>
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </PageShell>
      </div>
    );
  }

  const connectors = data ?? [];

  return (
    <div className="min-h-screen">
      <PageHeader title="Setup" subtitle="Manage connectors, teams, and organization settings" />

      <PageShell>
        {/* Connectors Section */}
        <section>
          <SectionHeader
            title="Platform Connectors"
            subtitle="Connect your data platforms to ingest cost, usage, and metadata."
            action={
              <Button size="sm" className="text-xs h-8" disabled title="Available in production — connector wizard not included in demo">
                <Plus className="h-3 w-3 mr-1" />
                Add Connector
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((conn) => {
              const platform = platformConfig[conn.platform] ?? { ...UNKNOWN_PLATFORM, name: conn.platform };
              const status = statusConfig[conn.status] ?? statusConfig.disconnected;
              const StatusIcon = status.icon;
              return (
                <div
                  key={conn.id}
                  className={card.container}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg ${platform.color}`}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{conn.name}</h3>
                        <p className="text-xs text-gray-400">{platform.name}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${status.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Products Found</p>
                      <p className="text-lg font-semibold text-gray-900 mt-0.5">{conn.productsFound}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Last Sync</p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {conn.lastSync ? formatRelativeTime(conn.lastSync) : "Never"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <CoverageBar value={conn.costCoverage} label="Cost coverage" />
                    <CoverageBar value={conn.usageCoverage} label="Usage coverage" />
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {platform.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-[10px] bg-gray-50">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 flex-1"
                      disabled={!canMutate || syncingConnectorId === conn.id}
                      title={!canMutate ? "API unavailable in offline demo mode" : ""}
                      onClick={async () => {
                        setSyncingConnectorId(conn.id);
                        try {
                          await apiPost(`/connectors/${conn.id}/sync`, {});
                          toastSuccess(`Sync initiated for ${conn.name}`);
                        } catch {
                          toastError(`Failed to sync ${conn.name}`);
                        } finally {
                          setSyncingConnectorId(null);
                        }
                      }}
                    >
                      {syncingConnectorId === conn.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Sync Now"
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-8" disabled title="Available in production" aria-label="Connector settings">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add new connector card */}
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5 flex flex-col items-center justify-center min-h-[280px]">
              <Plus className="h-8 w-8 text-gray-300 mb-3" />
              <h3 className="text-sm font-semibold text-gray-600">Add another platform</h3>
              <p className="text-xs text-gray-400 mt-1 text-center max-w-xs">
                Connect Snowflake, Databricks, or other supported platforms.
              </p>
              <Button variant="outline" size="sm" className="mt-3 text-xs h-8" disabled title="Available in production — connector wizard not included in demo">
                Connect Platform
              </Button>
            </div>
          </div>
        </section>

        {/* Data Import */}
        <section>
          <SectionHeader
            title="Data Import"
            subtitle="Bulk import data products and value declarations from CSV files"
          />
          <Link href="/setup/import" className="block">
            <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/30 p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-teal-300 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 flex-shrink-0">
                <Upload className="h-5 w-5 text-teal-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Import from CSV</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload product catalogs or value declarations. Templates provided for correct column mapping.
                </p>
              </div>
              <Button size="sm" className="text-xs h-8 bg-teal-600 hover:bg-teal-700 flex-shrink-0">
                Start Import
              </Button>
            </div>
          </Link>
        </section>

        {/* Quick Settings */}
        <section>
          <SectionHeader title="Organization" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Teams & Users</h3>
                  <p className="text-xs text-gray-400">{orgInfo?.teamCount ?? 0} teams, {orgInfo?.userCount ?? 0} users</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8 w-full" disabled title="Available in production">
                Manage
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Roles & Permissions</h3>
                  <p className="text-xs text-gray-400">{orgInfo?.roleCount ?? 0} roles configured</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8 w-full" disabled title="Available in production">
                Manage
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">ROI Configuration</h3>
                  <p className="text-xs text-gray-400">Weights: {orgInfo?.valueWeights ?? "—"}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8 w-full" disabled title="Available in production">
                Configure
              </Button>
            </div>
          </div>
        </section>
      </PageShell>
    </div>
  );
}
