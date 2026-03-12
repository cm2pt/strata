"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";
import { CHART_SEMANTIC, CHART_COLORS, CHART_GRID } from "@/lib/chart-colors";
import type { ChartTooltipPayload } from "@/lib/chart-colors";
import type { CapitalFlowDataPoint } from "@/lib/types";

interface CapitalFlowChartProps {
  data: CapitalFlowDataPoint[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-md text-xs">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-mono font-semibold tabular-nums text-gray-900">
            {formatCurrency(entry.value, true)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CapitalFlowChart({
  data,
  height = 280,
}: CapitalFlowChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} />
        <XAxis dataKey="month" {...chartAxis.tick} />
        <YAxis
          {...chartAxis.tick}
          tickFormatter={(v: number) => formatCurrency(v, true)}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={6}
          wrapperStyle={{ fontSize: "11px", color: "#9CA3AF" }}
        />
        <Bar
          dataKey="totalSpend"
          name="Total Spend"
          fill={CHART_SEMANTIC.negative}
          fillOpacity={0.2}
          radius={[2, 2, 0, 0]}
        />
        <Bar
          dataKey="misallocated"
          name="Misallocated"
          fill={CHART_SEMANTIC.risk}
          fillOpacity={0.6}
          radius={[2, 2, 0, 0]}
        />
        <Bar
          dataKey="freed"
          name="Capital Freed"
          fill={CHART_SEMANTIC.positive}
          fillOpacity={0.8}
          radius={[2, 2, 0, 0]}
        />
        <Bar
          dataKey="recovered"
          name="Recovered"
          fill={CHART_COLORS.primary}
          fillOpacity={0.7}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
