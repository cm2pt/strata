"use client";

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from "recharts";
import type { DataProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { chartColors, chartAxis } from "@/lib/tokens";
import { useRouter } from "next/navigation";

interface BCGMatrixProps {
  products: DataProduct[];
  /** When true, replace BCG quadrant labels with capital-oriented financial labels */
  showFinancialLabels?: boolean;
  /** Product IDs without value declarations — rendered with dashed ring overlay */
  lowConfidenceIds?: string[];
}

export function BCGMatrix({ products, showFinancialLabels = false, lowConfidenceIds = [] }: BCGMatrixProps) {
  const lowConfidenceSet = new Set(lowConfidenceIds);
  const router = useRouter();

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    x: p.monthlyConsumers,
    y: p.monthlyCost,
    z: Math.max(p.monthlyCost / 800, 6), // dot radius
    stage: p.lifecycleStage,
    roi: p.roi,
    roiBand: p.roiBand,
  }));

  const maxConsumers = Math.max(...data.map((d) => d.x), 100);
  const maxCost = Math.max(...data.map((d) => d.y), 10000);
  const midX = maxConsumers * 0.35;
  const midY = maxCost * 0.4;

  return (
    <div className="relative w-full h-[380px]">
      {/* Quadrant labels */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <span className="absolute top-3 left-16 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
          {showFinancialLabels ? "High Burn / Low Usage" : "Question Marks"}
        </span>
        <span className="absolute top-3 right-4 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
          {showFinancialLabels ? "High Burn / High Usage" : "Stars"}
        </span>
        <span className="absolute bottom-8 left-16 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
          {showFinancialLabels ? "Low Burn / Low Usage" : "Dogs"}
        </span>
        <span className="absolute bottom-8 right-4 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
          {showFinancialLabels ? "Low Burn / High Usage" : "Cash Cows"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid {...chartAxis.cartesianGrid} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, maxConsumers * 1.1]}
            tick={chartAxis.tick}
            axisLine={chartAxis.axisLine}
            tickLine={false}
          >
            <Label value="Monthly Consumers →" position="bottom" offset={0} style={{ fontSize: 11, fill: chartColors.tick }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, maxCost * 1.1]}
            tick={chartAxis.tick}
            axisLine={chartAxis.axisLine}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v, true)}
          >
            <Label value="Monthly Cost →" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 11, fill: chartColors.tick }} />
          </YAxis>
          <ReferenceLine x={midX} stroke={chartColors.axis} strokeDasharray="4 4" />
          <ReferenceLine y={midY} stroke={chartColors.axis} strokeDasharray="4 4" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    Cost: {formatCurrency(d.y, true)} · Consumers: {d.x}
                    {d.roi !== null && ` · ROI: ${d.roi.toFixed(1)}x`}
                  </p>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            cursor="pointer"
            onClick={(d) => {
              if (d?.id) router.push(`/assets/${d.id}`);
            }}
          >
            {data.map((entry, i) => {
              const isLowConf = lowConfidenceSet.has(entry.id);
              return (
                <Cell
                  key={i}
                  fill={chartColors.lifecycle[entry.stage]}
                  fillOpacity={isLowConf ? 0.4 : 0.75}
                  stroke={isLowConf ? "#B45309" : chartColors.lifecycle[entry.stage]}
                  strokeWidth={isLowConf ? 2 : 1.5}
                  strokeDasharray={isLowConf ? "4 3" : undefined}
                  r={entry.z}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
