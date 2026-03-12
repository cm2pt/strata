"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { ChartTooltip } from "./chart-tooltip";

interface ROITrendChartProps {
  data: Array<{
    month: string;
    average_roi: number;
    capital_freed_cumulative: number;
  }>;
}

export function ROITrendChart({ data }: ROITrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="freedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis
          dataKey="month"
          {...chartAxis.tick}
          tickFormatter={(v) => {
            const d = new Date(v);
            return d.toLocaleDateString("en-US", { month: "short" });
          }}
        />
        <YAxis yAxisId="left" {...chartAxis.tick} tickFormatter={(v) => `${v}x`} />
        <YAxis yAxisId="right" orientation="right" {...chartAxis.tick} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <ReferenceLine
          yAxisId="left"
          y={1}
          stroke="#9CA3AF"
          strokeDasharray="4 4"
          label={{ value: "1.0x breakeven", position: "insideTopLeft", fontSize: 10, fill: "#9CA3AF" }}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              title={label ? new Date(String(label)).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined}
              entries={payload?.map((p) => ({
                label: p.dataKey === "average_roi" ? "Avg ROI" : "Capital Freed",
                value: p.dataKey === "average_roi"
                  ? `${(p.value as number).toFixed(2)}x`
                  : `$${(p.value as number).toLocaleString()}`,
                color: p.color,
              }))}
            />
          )}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="average_roi"
          stroke="#3B82F6"
          fill="url(#roiGrad)"
          strokeWidth={2}
          dot={false}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="capital_freed_cumulative"
          stroke="#10B981"
          fill="url(#freedGrad)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
