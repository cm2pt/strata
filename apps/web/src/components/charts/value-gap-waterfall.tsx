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
  ReferenceLine,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";

interface ValueGapWaterfallProps {
  totalDeclared: number;
  totalInferred: number;
  mismatchGap: number;
  undeclaredSpend: number;
  height?: number;
}

export function ValueGapWaterfall({
  totalDeclared,
  totalInferred,
  mismatchGap,
  undeclaredSpend,
  height = 260,
}: ValueGapWaterfallProps) {
  const data = [
    { name: "Declared", value: totalDeclared, fill: "#3B82F6", type: "base" },
    { name: "Mismatches", value: -mismatchGap, fill: "#F97316", type: "delta" },
    { name: "Undeclared", value: -undeclaredSpend, fill: "#EF4444", type: "delta" },
    { name: "Inferred", value: totalInferred, fill: "#10B981", type: "total" },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid {...chartAxis.cartesianGrid} horizontal vertical={false} />
        <XAxis dataKey="name" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} />
        <YAxis
          tick={chartAxis.tick}
          axisLine={chartAxis.axisLine}
          tickLine={false}
          tickFormatter={(v: number) => `$${Math.abs(v / 1000).toFixed(0)}K`}
        />
        <ReferenceLine y={0} stroke="#D1D5DB" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <p className="text-gray-500">{formatCurrency(Math.abs(d.value), true)}/mo</p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
