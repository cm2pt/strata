"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CostBreakdown } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { chartColors } from "@/lib/tokens";

const COLORS = chartColors.costBreakdown;
const LABELS = ["Compute", "Storage", "Pipeline", "Human (est.)"];

export function CostBreakdownDonut({
  breakdown,
  total,
}: {
  breakdown: CostBreakdown;
  total: number;
}) {
  const data = [
    { name: "Compute", value: breakdown.compute },
    { name: "Storage", value: breakdown.storage },
    { name: "Pipeline", value: breakdown.pipeline },
    { name: "Human (est.)", value: breakdown.humanEstimate },
  ];

  return (
    <div className="flex items-center gap-6">
      <div className="w-[140px] h-[140px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                    <p className="font-medium text-gray-700">{d.name}</p>
                    <p className="text-gray-500">
                      {formatCurrency(d.value, true)} · {Math.round((d.value / total) * 100)}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i] }}
              />
              <span className="text-gray-600 text-xs">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-900 font-mono">
                {formatCurrency(d.value, true)}
              </span>
              <span className="text-[11px] text-gray-400 w-8 text-right">
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
        <div className="pt-1.5 border-t border-border flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Total</span>
          <span className="text-xs font-semibold text-gray-900 font-mono">
            {formatCurrency(total, true)}
          </span>
        </div>
      </div>
    </div>
  );
}
