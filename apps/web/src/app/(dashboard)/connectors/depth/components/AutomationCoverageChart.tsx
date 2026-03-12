"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Bot } from "lucide-react";
import type { AutomationSummary } from "@/lib/types";

interface Props {
  summary: AutomationSummary;
}

export function AutomationCoverageChart({ summary }: Props) {
  const { fullyAutomated, semiAutomated, manual, total, coveragePct } = summary;

  const fullyPct = total > 0 ? Math.round((fullyAutomated / total) * 100) : 0;
  const semiPct = total > 0 ? Math.round((semiAutomated / total) * 100) : 0;
  const manualPct = total > 0 ? Math.round((manual / total) * 100) : 0;

  return (
    <Card>
      <SectionHeader
        title="Automation Coverage"
        subtitle="Portfolio-wide field tracking by automation level"
        icon={Bot}
        iconColor="text-teal-600"
        iconBg="bg-teal-50"
      />

      {/* Stacked bar */}
      <div className="mt-5 mb-6">
        <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden flex">
          {fullyPct > 0 && (
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${fullyPct}%` }}
              title={`Fully automated: ${fullyPct}%`}
            />
          )}
          {semiPct > 0 && (
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${semiPct}%` }}
              title={`Semi-automated: ${semiPct}%`}
            />
          )}
          {manualPct > 0 && (
            <div
              className="h-full bg-red-400 transition-all"
              style={{ width: `${manualPct}%` }}
              title={`Manual: ${manualPct}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
            <span className="text-[11px] text-gray-500">Fully Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-gray-500">Semi-Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-[11px] text-gray-500">Manual</span>
          </div>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Total Fields</p>
          <p className="text-xl font-semibold text-gray-900 mt-1 font-mono tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-teal-600">Fully Automated</p>
          <p className="text-xl font-semibold text-teal-700 mt-1 font-mono tabular-nums">{fullyAutomated.toLocaleString()}</p>
          <p className="text-[10px] text-teal-500 mt-0.5">{fullyPct}%</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-600">Semi-Automated</p>
          <p className="text-xl font-semibold text-amber-700 mt-1 font-mono tabular-nums">{semiAutomated.toLocaleString()}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">{semiPct}%</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-red-600">Manual</p>
          <p className="text-xl font-semibold text-red-700 mt-1 font-mono tabular-nums">{manual.toLocaleString()}</p>
          <p className="text-[10px] text-red-500 mt-0.5">{manualPct}%</p>
        </div>
      </div>
    </Card>
  );
}
