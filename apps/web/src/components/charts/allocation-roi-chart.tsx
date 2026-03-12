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

interface DomainROIData {
  name: string;
  cost: number;
  value: number;
  roi: number;
  count: number;
}

interface AllocationROIChartProps {
  data: DomainROIData[];
}

export function AllocationROIChart({ data }: AllocationROIChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
        <CartesianGrid {...chartAxis.cartesianGrid} horizontal={false} />
        <XAxis type="number" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
        <YAxis type="category" dataKey="name" tick={chartAxis.tick} axisLine={chartAxis.axisLine} tickLine={false} width={90} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <p className="text-gray-500">
                  ROI: {d.roi.toFixed(1)}x · Cost: {formatCurrency(d.cost, true)} · Value: {formatCurrency(d.value, true)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.roi >= 2 ? "#10B981" : d.roi >= 1 ? "#3B82F6" : "#EF4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
