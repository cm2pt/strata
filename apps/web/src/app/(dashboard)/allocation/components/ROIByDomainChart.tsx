"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";
import type { DomainData } from "./DomainDistributionCharts";

const AllocationROIChart = dynamic(
  () => import("@/components/charts/allocation-roi-chart").then(m => ({ default: m.AllocationROIChart })),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse bg-gray-100 rounded-lg" /> }
);

export interface ROIByDomainChartProps {
  byDomain: DomainData[];
}

export function ROIByDomainChart({ byDomain }: ROIByDomainChartProps) {
  return (
    <Card>
      <SectionHeader title="ROI by Domain" subtitle="Return on investment per domain — higher is better" icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50" />
      {byDomain.length > 0 ? (
        <div className="h-[260px]">
          <AllocationROIChart data={byDomain} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">No data available</div>
      )}
    </Card>
  );
}
