"use client";

import { useState } from "react";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton } from "@/components/shared/skeleton";
import { Grid3X3, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { useExtractionMatrix } from "@/lib/api/hooks";
import type { ConnectorDepthSummary, ExtractionCapability } from "@/lib/types";

interface Props {
  connectors: ConnectorDepthSummary[];
}

export function ExtractionMatrixTable({ connectors }: Props) {
  const [selectedId, setSelectedId] = useState(connectors[0]?.connectorId ?? "");
  const { data, loading } = useExtractionMatrix(selectedId);

  // Group capabilities by category
  const grouped = (data?.capabilities ?? []).reduce<Record<string, ExtractionCapability[]>>((acc, cap) => {
    const key = cap.capabilityCategory;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cap);
    return acc;
  }, {});

  return (
    <Card>
      <SectionHeader
        title="Extraction Matrix"
        subtitle="Platform capabilities and extraction methods"
        icon={Grid3X3}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
        action={
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
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
        <TableSkeleton rows={6} />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Category</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Capability</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Available</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Method</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 pb-2 pr-4">Refresh</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 pb-2">Elevated</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, caps]) => (
                caps.map((cap, idx) => (
                  <tr key={`${category}-${idx}`} className="border-b border-border/50 last:border-b-0">
                    {idx === 0 && (
                      <td
                        rowSpan={caps.length}
                        className="py-2.5 pr-4 text-xs font-medium text-gray-700 align-top"
                      >
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                          {category.replace(/_/g, " ")}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 pr-4 text-xs text-gray-700">{cap.capabilityName}</td>
                    <td className="py-2.5 pr-4 text-center">
                      {cap.isAvailable ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-500 inline-block" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 inline-block" />
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500 font-mono">{cap.extractionMethod}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{cap.refreshFrequency}</td>
                    <td className="py-2.5 text-center">
                      {cap.requiresElevatedAccess && (
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500 inline-block" />
                      )}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
