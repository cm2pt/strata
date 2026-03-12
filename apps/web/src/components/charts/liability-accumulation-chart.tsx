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

const LIABILITY_COLORS = {
  aiExposure: "#1E40AF",
  declineWaste: "#6D28D9",
  missedRetirement: "#B45309",
  governanceErosion: "#6B7280",
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

function CurrencyTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-gray-900 mb-1">Month {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, true)}
        </p>
      ))}
    </div>
  );
}

interface LiabilityAccumulationChartProps {
  data: Array<{
    month: number;
    "AI Exposure": number;
    "Decline Waste": number;
    "Missed Retirement": number;
    "Governance Erosion": number;
  }>;
}

export function LiabilityAccumulationChart({ data }: LiabilityAccumulationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LIABILITY_COLORS.aiExposure} stopOpacity={0.8} />
            <stop offset="95%" stopColor={LIABILITY_COLORS.aiExposure} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="gradDecline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LIABILITY_COLORS.declineWaste} stopOpacity={0.8} />
            <stop offset="95%" stopColor={LIABILITY_COLORS.declineWaste} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="gradRetirement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LIABILITY_COLORS.missedRetirement} stopOpacity={0.8} />
            <stop offset="95%" stopColor={LIABILITY_COLORS.missedRetirement} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="gradGovernance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LIABILITY_COLORS.governanceErosion} stopOpacity={0.8} />
            <stop offset="95%" stopColor={LIABILITY_COLORS.governanceErosion} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis dataKey="month" {...chartAxis.tick} />
        <YAxis {...chartAxis.tick} tickFormatter={(v) => formatCurrency(v, true)} />
        <Tooltip content={<CurrencyTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
        <Area type="monotone" dataKey="AI Exposure" stackId="liability" stroke={LIABILITY_COLORS.aiExposure} fill="url(#gradAI)" />
        <Area type="monotone" dataKey="Decline Waste" stackId="liability" stroke={LIABILITY_COLORS.declineWaste} fill="url(#gradDecline)" />
        <Area type="monotone" dataKey="Missed Retirement" stackId="liability" stroke={LIABILITY_COLORS.missedRetirement} fill="url(#gradRetirement)" />
        <Area type="monotone" dataKey="Governance Erosion" stackId="liability" stroke={LIABILITY_COLORS.governanceErosion} fill="url(#gradGovernance)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
