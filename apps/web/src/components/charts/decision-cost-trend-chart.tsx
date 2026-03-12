"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DecisionCostTrendChartProps {
  data: Array<{
    month: string;
    cost: number;
  }>;
  resolvedAt?: string | null;
}

export function DecisionCostTrendChart({ data, resolvedAt }: DecisionCostTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip
          formatter={((v: number) => [`$${v.toLocaleString()}`, "Monthly Cost"]) as any}
        />
        {resolvedAt && (
          <ReferenceLine
            x={resolvedAt.slice(0, 7)}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: "Decision", position: "top", fontSize: 10 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#6366f1"
          fill="url(#costFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
