"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency } from "@/lib/format";
import { PieChart as PieChartIcon } from "lucide-react";
import dynamic from "next/dynamic";

const AllocationDonutChart = dynamic(
  () => import("@/components/charts/allocation-donut-chart").then(m => ({ default: m.AllocationDonutChart })),
  { ssr: false, loading: () => <div className="h-[180px] animate-pulse bg-gray-100 rounded-lg" /> }
);

export interface DomainData {
  name: string;
  cost: number;
  value: number;
  roi: number;
  count: number;
}

export interface DomainDistributionChartsProps {
  byDomain: DomainData[];
  totalCost: number;
  totalValue: number;
  domainColors: string[];
}

export function DomainDistributionCharts({
  byDomain,
  totalCost,
  totalValue,
  domainColors,
}: DomainDistributionChartsProps) {
  const costData = byDomain.map(d => ({ name: d.name, value: d.cost }));
  const valueData = byDomain.map(d => ({ name: d.name, value: d.value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <SectionHeader title="Cost by Domain" subtitle="Monthly spend distribution" icon={PieChartIcon} iconColor="text-red-600" iconBg="bg-red-50" />
        <div className="flex items-center gap-6">
          {costData.length > 0 ? (
          <>
            <div className="w-[180px] h-[180px] flex-shrink-0">
              <AllocationDonutChart data={costData} colors={domainColors} totalValue={totalCost} />
            </div>
            <div className="flex-1 space-y-2">
              {byDomain.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: domainColors[i % domainColors.length] }} />
                    <span className="text-gray-600 text-xs">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-900 font-mono">{formatCurrency(d.cost, true)}</span>
                    <span className="text-[11px] text-gray-400 w-8 text-right">{Math.round((d.cost / totalCost) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">No data available</div>
        )}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Value by Domain" subtitle="Composite value distribution" icon={PieChartIcon} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <div className="flex items-center gap-6">
          {valueData.length > 0 ? (
          <>
            <div className="w-[180px] h-[180px] flex-shrink-0">
              <AllocationDonutChart data={valueData} colors={domainColors} totalValue={totalValue} />
            </div>
            <div className="flex-1 space-y-2">
              {byDomain.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: domainColors[i % domainColors.length] }} />
                    <span className="text-gray-600 text-xs">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-900 font-mono">{formatCurrency(d.value, true)}</span>
                    <span className="text-[11px] text-gray-400 w-8 text-right">{totalValue > 0 ? Math.round((d.value / totalValue) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">No data available</div>
        )}
        </div>
      </Card>
    </div>
  );
}
