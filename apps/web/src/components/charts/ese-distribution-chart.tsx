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

interface ESEDistributionChartProps {
  /** Array of ESE scores (0-100) */
  scores: number[];
  height?: number;
}

const BINS = [
  { label: "0–20", min: 0, max: 20, color: "#EF4444" },
  { label: "20–40", min: 20, max: 40, color: "#F97316" },
  { label: "40–60", min: 40, max: 60, color: "#EAB308" },
  { label: "60–80", min: 60, max: 80, color: "#3B82F6" },
  { label: "80–100", min: 80, max: 101, color: "#10B981" },
];

export function ESEDistributionChart({ scores, height = 220 }: ESEDistributionChartProps) {
  const data = BINS.map((bin) => ({
    ...bin,
    count: scores.filter((s) => s >= bin.min && s < bin.max).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid {...chartAxis.cartesianGrid} horizontal={true} vertical={false} />
        <XAxis dataKey="label" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} />
        <YAxis tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} allowDecimals={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">ESE {d.label}</p>
                <p className="text-gray-500">{d.count} products</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
