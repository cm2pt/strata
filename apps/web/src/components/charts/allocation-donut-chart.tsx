"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

interface AllocationDonutChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  totalValue: number;
}

export function AllocationDonutChart({ data, colors, totalValue }: AllocationDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { name: string; value: number };
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                <p className="font-medium text-gray-700">{d.name}</p>
                <p className="text-gray-500">{formatCurrency(d.value, true)} · {totalValue > 0 ? Math.round((d.value / totalValue) * 100) : 0}%</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
