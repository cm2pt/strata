"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency, formatROI } from "@/lib/format";
import { DollarSign } from "lucide-react";
import type { BoardCapitalSummary, CEIResponse } from "@/lib/types";

export interface CapitalOverviewKPIsProps {
  board: BoardCapitalSummary | null;
  cei: CEIResponse | null;
  onProvenanceClick?: (metricKey: string) => void;
}

export function CapitalOverviewKPIs({ board, cei, onProvenanceClick }: CapitalOverviewKPIsProps) {
  return (
    <>
      <SectionHeader title="Capital Overview" icon={DollarSign} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Capital Freed"
          value={formatCurrency(board?.totalCapitalFreed ?? 0, true)}
          trend={{
            value: `${formatCurrency(board?.totalCapitalFreedAnnual ?? 0, true)}/yr`,
            direction: "up",
          }}
          variant="positive"
          info="Total monthly savings from all approved decisions."
          metricKey="capital_freed"
          onProvenanceClick={onProvenanceClick}
        />
        <KPICard
          label="Confirmed Savings"
          value={formatCurrency(board?.confirmedSavings ?? 0, true)}
          trend={{
            value: `${formatCurrency(board?.projectedSavings ?? 0, true)} projected`,
            direction: "neutral",
          }}
          info="Savings verified by impact validation vs still projected."
          metricKey="confirmed_savings"
          onProvenanceClick={onProvenanceClick}
        />
        <KPICard
          label="Portfolio ROI"
          value={formatROI(board?.portfolioRoiCurrent ?? 0)}
          trend={{
            value: `${board?.portfolioRoiDelta && board.portfolioRoiDelta > 0 ? "+" : ""}${formatROI(board?.portfolioRoiDelta ?? 0)} MoM`,
            direction: (board?.portfolioRoiDelta ?? 0) > 0 ? "up" : (board?.portfolioRoiDelta ?? 0) < 0 ? "down" : "neutral",
          }}
          metricKey="portfolio_average_roi"
          onProvenanceClick={onProvenanceClick}
        />
        <KPICard
          label="Capital Efficiency"
          value={`${cei?.score ?? 0}/100`}
          trend={{
            value: "6-component index",
            direction: "neutral",
          }}
          info="Composite score across ROI coverage, action rate, savings accuracy, capital freed, value governance, and AI exposure."
          metricKey="cei_score"
          onProvenanceClick={onProvenanceClick}
        />
      </div>
    </>
  );
}
