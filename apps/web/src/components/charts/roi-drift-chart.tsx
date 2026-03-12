"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartAxis } from "@/lib/tokens";

const SCENARIO_COLORS = {
  passive: "#7F1D1D",
  governance: "#B45309",
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

function ScenarioTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-gray-900 mb-1">Month {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(2)}x
        </p>
      ))}
    </div>
  );
}

interface ROIDriftChartProps {
  data: Array<{
    month: number;
    Passive: number;
    Governance: number;
    Active: number;
  }>;
}

export function ROIDriftChart({ data }: ROIDriftChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis dataKey="month" {...chartAxis.tick} label={{ value: "Month", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "#9CA3AF" } }} />
        <YAxis {...chartAxis.tick} tickFormatter={(v) => `${v.toFixed(1)}x`} domain={["auto", "auto"]} />
        <Tooltip content={<ScenarioTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
        <Line type="monotone" dataKey="Passive" stroke={SCENARIO_COLORS.passive} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Governance" stroke={SCENARIO_COLORS.governance} strokeWidth={2} dot={false} strokeDasharray="6 3" />
        <Line type="monotone" dataKey="Active" stroke={SCENARIO_COLORS.active} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
