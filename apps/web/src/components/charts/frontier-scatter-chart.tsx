"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { chartAxis } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";

interface FrontierPoint {
  productId: string;
  name: string;
  monthlyCost: number;
  eseScore: number;
  isFrontier: boolean;
}

interface FrontierScatterChartProps {
  data: FrontierPoint[];
  height?: number;
}

export function FrontierScatterChart({ data, height = 340 }: FrontierScatterChartProps) {
  const frontier = data.filter((d) => d.isFrontier);
  const nonFrontier = data.filter((d) => !d.isFrontier);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid {...chartAxis.cartesianGrid} />
        <XAxis
          type="number"
          dataKey="monthlyCost"
          name="Monthly Cost"
          tick={chartAxis.tick}
          axisLine={chartAxis.axisLine}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
          label={{ value: "Monthly Cost", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "#9CA3AF" } }}
        />
        <YAxis
          type="number"
          dataKey="eseScore"
          name="ESE Score"
          tick={chartAxis.tick}
          axisLine={chartAxis.axisLine}
          tickLine={false}
          domain={[0, 100]}
          label={{ value: "ESE Score", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10, fill: "#9CA3AF" } }}
        />
        <ReferenceLine y={40} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <p className="text-gray-500">
                  Cost: {formatCurrency(d.monthlyCost, true)} · ESE: {Math.round(d.eseScore)}
                </p>
                {d.isFrontier && <p className="text-emerald-600 font-medium">Pareto frontier</p>}
              </div>
            );
          }}
        />
        <Scatter name="Non-frontier" data={nonFrontier} fill="#94A3B8" fillOpacity={0.5} r={4} />
        <Scatter name="Frontier" data={frontier} fill="#10B981" fillOpacity={0.8} r={6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
