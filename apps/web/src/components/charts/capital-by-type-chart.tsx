"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";

interface CapitalByTypeChartProps {
  data: Array<{
    type: string;
    amount: number;
    label: string;
  }>;
  typeColors: Record<string, string>;
}

export function CapitalByTypeChart({ data, typeColors }: CapitalByTypeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
      >
        <CartesianGrid {...chartAxis.cartesianGrid} horizontal={false} />
        <XAxis type="number" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="label" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} width={110} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">{d.label}</p>
                <p className="text-gray-500">{formatCurrency(d.amount, true)}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {data.map((item, i) => (
            <Cell key={i} fill={typeColors[item.type] ?? "#6B7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
