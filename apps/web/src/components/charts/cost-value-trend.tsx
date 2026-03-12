"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CostTrendPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { chartAxis } from "@/lib/tokens";
import { CHART_SEMANTIC, CHART_GRID } from "@/lib/chart-colors";
import { ChartTooltip } from "./chart-tooltip";

interface CostValueTrendProps {
  data: CostTrendPoint[];
  height?: number;
}

export function CostValueTrend({ data, height = 220 }: CostValueTrendProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.cost} stopOpacity={0.1} />
            <stop offset="95%" stopColor={CHART_SEMANTIC.cost} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.revenue} stopOpacity={0.1} />
            <stop offset="95%" stopColor={CHART_SEMANTIC.revenue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} vertical={false} />
        <XAxis
          dataKey="month"
          tick={chartAxis.tick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={chartAxis.tick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, true)}
          width={55}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              title={String(label ?? "")}
              entries={payload?.map((p) => ({
                label: p.dataKey === "cost" ? "Cost" : "Value",
                value: formatCurrency(p.value as number, true),
                color: p.color,
              }))}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_SEMANTIC.revenue}
          strokeWidth={2}
          fill="url(#colorValue)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke={CHART_SEMANTIC.cost}
          strokeWidth={2}
          fill="url(#colorCost)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
