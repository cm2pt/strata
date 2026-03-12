"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";

const SCENARIO_COLORS = {
  passive: "#7F1D1D",
  active: "#0F766E",
} as const;

interface ChartTooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
}

function DualAxisTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-gray-900 mb-1">Month {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {entry.name === "AI Spend" ? formatCurrency(entry.value, true) : `${entry.value.toFixed(1)}`}
        </p>
      ))}
    </div>
  );
}

interface AIExposureChartProps {
  data: Array<{
    month: number;
    "AI Spend": number;
    "Governance Score": number;
  }>;
}

export function AIExposureChart({ data }: AIExposureChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis dataKey="month" {...chartAxis.tick} />
        <YAxis yAxisId="left" {...chartAxis.tick} tickFormatter={(v) => formatCurrency(v, true)} />
        <YAxis yAxisId="right" orientation="right" {...chartAxis.tick} domain={[0, 100]} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<DualAxisTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="AI Spend"
          stroke={SCENARIO_COLORS.passive}
          fill={SCENARIO_COLORS.passive}
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="Governance Score"
          stroke={SCENARIO_COLORS.active}
          fill={SCENARIO_COLORS.active}
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
