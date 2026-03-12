"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatROI } from "@/lib/format";
import { Globe } from "lucide-react";
import type { BenchmarkDataPoint } from "@/lib/types";

export interface IndustryBenchmarksProps {
  benchmarkData: BenchmarkDataPoint[];
  yourROI: number;
  currentPortfolioROI: number;
}

export function IndustryBenchmarks({
  benchmarkData,
  yourROI,
  currentPortfolioROI,
}: IndustryBenchmarksProps) {
  return (
    <Card>
      <SectionHeader
        title="Industry Benchmarks"
        subtitle="How your portfolio compares (Beta — anonymized cross-company data)"
        icon={Globe}
        iconColor="text-gray-500"
        iconBg="bg-gray-100"
        action={
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Beta</span>
        }
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Industry</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Median ROI</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">ROI Range (P25-P75)</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Cost per Consumer</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Your Position</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Sample</th>
            </tr>
          </thead>
          <tbody>
            {benchmarkData.map((b) => {
              const position = yourROI > b.p75ROI ? "Top quartile" : yourROI > b.medianROI ? "Above median" : yourROI > b.p25ROI ? "Below median" : "Bottom quartile";
              const posColor = yourROI > b.p75ROI ? "text-emerald-600" : yourROI > b.medianROI ? "text-blue-600" : yourROI > b.p25ROI ? "text-amber-600" : "text-red-600";
              return (
                <tr key={b.industry} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{b.label}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 text-right font-mono">{b.medianROI.toFixed(1)}x</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 text-right font-mono">{b.p25ROI.toFixed(1)}x – {b.p75ROI.toFixed(1)}x</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 text-right font-mono">${b.medianCostPerConsumer}</td>
                  <td className={`px-4 py-2.5 text-xs font-semibold text-right ${posColor}`}>{position}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 text-right">{b.sampleSize} companies</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        Benchmarks based on anonymized, aggregated data from participating organizations. Your portfolio ROI ({formatROI(currentPortfolioROI)}) is compared against industry medians.
        Sample sizes vary by industry. Data refreshed quarterly.
      </p>
    </Card>
  );
}
