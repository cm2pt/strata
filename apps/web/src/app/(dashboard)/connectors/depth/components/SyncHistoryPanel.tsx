"use client";

import { Fragment, useState } from "react";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton } from "@/components/shared/skeleton";
import { History, ChevronDown, ChevronRight } from "lucide-react";
import { useConnectorSyncLog } from "@/lib/api/hooks";
import type { ConnectorDepthSummary, SyncLogEntry } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  success: "bg-teal-50 text-teal-700",
  partial: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  connectors: ConnectorDepthSummary[];
}

export function SyncHistoryPanel({ connectors }: Props) {
  const [selectedId, setSelectedId] = useState(connectors[0]?.connectorId ?? "");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data, loading } = useConnectorSyncLog(selectedId);

  return (
    <Card>
      <SectionHeader
        title="Sync History"
        subtitle="Recent sync executions and object diffs"
        icon={History}
        iconColor="text-gray-600"
        iconBg="bg-gray-100"
        action={
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setExpandedRow(null); }}
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {connectors.map((c) => (
              <option key={c.connectorId} value={c.connectorId}>
                {c.connectorName}
              </option>
            ))}
          </select>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-6 pb-2" />
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Started</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Duration</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Discovered</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Updated</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Deleted</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((log: SyncLogEntry) => {
                const isExpanded = expandedRow === log.id;
                const hasDiff = log.diffSummary && (log.diffSummary.added.length > 0 || log.diffSummary.removed.length > 0 || log.diffSummary.changed.length > 0);

                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`border-b border-border/50 ${hasDiff ? "cursor-pointer hover:bg-gray-50" : ""}`}
                      onClick={() => hasDiff && setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <td className="py-2.5 pr-1">
                        {hasDiff && (
                          isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">{formatDate(log.syncStartedAt)}</td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500 font-mono">{formatDuration(log.durationSeconds)}</td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700 text-right font-mono">{log.objectsDiscovered}</td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700 text-right font-mono">{log.objectsUpdated}</td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700 text-right font-mono">{log.objectsDeleted}</td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[log.status] ?? "bg-gray-50 text-gray-500"}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && log.diffSummary && (
                      <tr>
                        <td colSpan={7} className="px-6 py-3 bg-gray-50 border-b border-border/50">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            {log.diffSummary.added.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-teal-600 font-medium mb-1">Added</p>
                                {log.diffSummary.added.map((a) => (
                                  <p key={a} className="text-gray-600 font-mono text-[11px]">+ {a}</p>
                                ))}
                              </div>
                            )}
                            {log.diffSummary.removed.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-red-600 font-medium mb-1">Removed</p>
                                {log.diffSummary.removed.map((r) => (
                                  <p key={r} className="text-gray-600 font-mono text-[11px]">- {r}</p>
                                ))}
                              </div>
                            )}
                            {log.diffSummary.changed.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-amber-600 font-medium mb-1">Changed</p>
                                {log.diffSummary.changed.map((ch) => (
                                  <p key={ch} className="text-gray-600 font-mono text-[11px]">~ {ch}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          {log.errors && log.errors.length > 0 && (
                            <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-wider text-red-600 font-medium mb-1">Errors</p>
                              {log.errors.map((err, i) => (
                                <p key={i} className="text-xs text-red-700 font-mono">
                                  {typeof err === "object" && err !== null && "message" in err ? String((err as Record<string, unknown>).message) : JSON.stringify(err)}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
