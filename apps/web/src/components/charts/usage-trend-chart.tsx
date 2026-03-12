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
import type { UsageTrendPoint } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { chartAxis } from "@/lib/tokens";
import { CHART_COLORS, CHART_GRID } from "@/lib/chart-colors";
import type { ChartTooltipPayload } from "@/lib/chart-colors";

interface UsageTrendTooltipProps {
  active?: boolean;
  payload?: readonly ChartTooltipPayload[];
  label?: string | number;
}

export function UsageTrendChart({
  data,
  height = 180,
}: {
  data: UsageTrendPoint[];
  height?: number;
}) {
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
          <linearGradient id="colorConsumers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
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
          width={40}
        />
        <Tooltip
          content={({ active, payload, label }: UsageTrendTooltipProps) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-medium text-gray-700 mb-1">{label}</p>
                <p className="text-gray-500">
                  Consumers: {formatNumber(payload[0].value as number)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="consumers"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#colorConsumers)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
