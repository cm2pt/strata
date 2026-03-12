"use client";

import { formatCurrency } from "@/lib/format";

interface DomainMetrics {
  name: string;
  eseScore: number;
  roi: number;
  costTrend: number;
  count: number;
  cost: number;
}

interface DomainHeatmapProps {
  data: DomainMetrics[];
}

const METRICS: { key: keyof DomainMetrics; label: string; format: (v: number) => string; thresholds: [number, number] }[] = [
  { key: "eseScore", label: "ESE", format: (v) => Math.round(v).toString(), thresholds: [40, 70] },
  { key: "roi", label: "ROI", format: (v) => `${v.toFixed(1)}x`, thresholds: [1, 2.5] },
  { key: "costTrend", label: "Cost Δ", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`, thresholds: [-5, 5] },
  { key: "count", label: "Products", format: (v) => v.toString(), thresholds: [3, 10] },
];

function cellColor(value: number, thresholds: [number, number], invertBetter = false): string {
  const [low, high] = thresholds;
  if (invertBetter) {
    // Lower is better (e.g., cost trend)
    if (value <= low) return "bg-emerald-100 text-emerald-700";
    if (value <= high) return "bg-amber-50 text-amber-700";
    return "bg-red-100 text-red-700";
  }
  // Higher is better
  if (value >= high) return "bg-emerald-100 text-emerald-700";
  if (value >= low) return "bg-amber-50 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function DomainHeatmap({ data }: DomainHeatmapProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 min-w-[120px]">Domain</th>
            {METRICS.map((m) => (
              <th key={m.key} className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400">{m.label}</th>
            ))}
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.name} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{d.name}</td>
              {METRICS.map((m) => {
                const val = d[m.key] as number;
                const invertBetter = m.key === "costTrend";
                return (
                  <td key={m.key} className="px-3 py-1.5 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 font-mono font-semibold ${cellColor(val, m.thresholds, invertBetter)}`}>
                      {m.format(val)}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(d.cost, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
