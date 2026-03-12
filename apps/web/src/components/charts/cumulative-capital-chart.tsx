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
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";

interface CumulativeCapitalChartProps {
  data: Array<{
    month: string;
    amount: number;
    cumulative: number;
  }>;
}

export function CumulativeCapitalChart({ data }: CumulativeCapitalChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis dataKey="month" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} />
        <YAxis tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">{d.month}</p>
                <p className="text-gray-500">Monthly: {formatCurrency(d.amount, true)}</p>
                <p className="text-emerald-600 font-medium">Cumulative: {formatCurrency(d.cumulative, true)}</p>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} fill="url(#cumulativeGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
