"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Gauge, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import type { CEIResponse } from "@/lib/types";

const ROITrendChart = dynamic(
  () => import("@/components/charts/roi-trend-chart").then(m => ({ default: m.ROITrendChart })),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" /> }
);

const COMPONENT_LABELS: Record<string, { label: string; color: string }> = {
  roi_coverage: { label: "ROI Coverage", color: "#10B981" },
  action_rate: { label: "Action Rate", color: "#3B82F6" },
  savings_accuracy: { label: "Savings Accuracy", color: "#8B5CF6" },
  capital_freed_ratio: { label: "Capital Freed", color: "#F59E0B" },
  value_governance: { label: "Value Governance", color: "#EC4899" },
  ai_exposure: { label: "AI Exposure", color: "#06B6D4" },
};

export interface CapitalEfficiencySectionProps {
  cei: CEIResponse | null;
}

export function CapitalEfficiencySection({ cei }: CapitalEfficiencySectionProps) {
  const ceiBarData = cei
    ? Object.entries(cei.components).map(([key, comp]) => ({
        name: COMPONENT_LABELS[key]?.label ?? key,
        score: comp.score,
        max: comp.max,
        fill: COMPONENT_LABELS[key]?.color ?? "#94A3B8",
      }))
    : [];

  return (
    <>
      <SectionHeader title="Capital Efficiency Index" icon={Gauge} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CEI Score + Component Breakdown */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <span className="text-2xl font-bold font-mono">{cei?.score ?? 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Composite Score</h3>
              <p className="text-xs text-gray-500">6 components, configurable weights</p>
            </div>
          </div>

          <div className="space-y-3">
            {ceiBarData.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{item.name}</span>
                  <span className="text-xs font-mono text-gray-500">
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.max > 0 ? (item.score / item.max) * 100 : 0}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Component detail text */}
          {cei && (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              {Object.entries(cei.components).map(([key, comp]) => (
                <p key={key} className="text-[11px] text-gray-500">
                  <span className="font-medium text-gray-600">{COMPONENT_LABELS[key]?.label ?? key}:</span>{" "}
                  {comp.detail}
                </p>
              ))}
            </div>
          )}
        </Card>

        {/* CEI Trend Chart */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Portfolio ROI Trend</h3>
          <p className="text-xs text-gray-500 mb-4">6-month trailing average ROI and cumulative capital freed</p>
          {cei && cei.trend.length > 0 ? (
            <ROITrendChart data={cei.trend} />
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <EmptyState icon={TrendingUp} title="No trend data" description="ROI trend data will appear once multiple months of data are available." />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
