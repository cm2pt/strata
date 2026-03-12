"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { exportToCSV, formatCurrencyCSV } from "@/lib/utils/csv-export";
import {
  FlaskConical,
  Play,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { apiPost, canMutate } from "@/lib/api/client";
import type { PricingModel, DataProduct } from "@/lib/types";

export interface SimResult {
  totalRevenue: number;
  totalCost: number;
  netPosition: number;
  teamImpacts: {
    team: string;
    usage: number;
    charge: number;
    budgetStatus: "within" | "over";
    overBy?: number;
  }[];
  behavioralPrediction: string;
  adoptionImpact: number;
  behavioralRisk: "low" | "moderate" | "high";
}

export interface SimulationResultsProps {
  result: SimResult | null;
  selectedProduct: DataProduct | undefined;
  model: PricingModel;
  markup: number;
  baseFee: number;
  perQuery: number;
  freeTier: number;
  adoptionSlider: number;
  revenueNeutral: boolean;
  canActivate: boolean;
  activateSuccess: boolean;
  onRunSimulation: () => void;
  onShowActivateDialog: () => void;
  toastSuccess: (msg: string) => void;
  toastWarning: (msg: string) => void;
  toastError: (msg: string) => void;
}

export function SimulationResults({
  result,
  selectedProduct,
  model,
  markup,
  baseFee,
  perQuery,
  freeTier,
  adoptionSlider,
  revenueNeutral,
  canActivate,
  activateSuccess,
  onRunSimulation,
  onShowActivateDialog,
  toastSuccess,
  toastWarning,
  toastError,
}: SimulationResultsProps) {
  if (!result) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="Model your data economics"
        description="Choose a pricing model and strategy controls, then run the simulation to see how internal chargeback would affect teams, usage, and cost recovery."
        action={
          <Button className="bg-purple-600 hover:bg-purple-700 text-xs" onClick={onRunSimulation}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Run First Simulation
          </Button>
        }
        className="h-full"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <SectionHeader title="Simulation Results" className="mb-3" />
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Chargeback Revenue</p>
            <p className="text-xl font-semibold text-gray-900 font-mono mt-1">{formatCurrency(result.totalRevenue, true)}</p>
            <p className="text-[10px] text-gray-400">/month</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Product Cost</p>
            <p className="text-xl font-semibold text-gray-900 font-mono mt-1">{formatCurrency(result.totalCost, true)}</p>
            <p className="text-[10px] text-gray-400">/month</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Net Position</p>
            <p className={`text-xl font-semibold font-mono mt-1 ${result.netPosition >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {result.netPosition >= 0 ? "+" : ""}{formatCurrency(result.netPosition, true)}
            </p>
            <p className="text-[10px] text-gray-400">/month {result.netPosition >= 0 ? "surplus" : "deficit"}</p>
          </div>
        </div>
      </Card>

      {/* Behavioral Risk Indicator */}
      <div className={`rounded-lg border p-3 flex items-center gap-3 ${
        result.behavioralRisk === "high" ? "border-red-200 bg-red-50/50" :
        result.behavioralRisk === "moderate" ? "border-amber-200 bg-amber-50/50" :
        "border-emerald-200 bg-emerald-50/50"
      }`}>
        <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
          result.behavioralRisk === "high" ? "text-red-500" :
          result.behavioralRisk === "moderate" ? "text-amber-500" :
          "text-emerald-500"
        }`} />
        <div>
          <p className={`text-xs font-semibold ${
            result.behavioralRisk === "high" ? "text-red-700" :
            result.behavioralRisk === "moderate" ? "text-amber-700" :
            "text-emerald-700"
          }`}>
            Behavioral Risk: {result.behavioralRisk.charAt(0).toUpperCase() + result.behavioralRisk.slice(1)}
          </p>
          <p className={`text-[11px] mt-0.5 ${
            result.behavioralRisk === "high" ? "text-red-600" :
            result.behavioralRisk === "moderate" ? "text-amber-600" :
            "text-emerald-600"
          }`}>
            Estimated {result.adoptionImpact}% usage reduction from price introduction.
            {result.behavioralRisk === "high" && " Consider lower pricing to maintain adoption."}
            {result.behavioralRisk === "moderate" && " Monitor adoption closely after rollout."}
            {result.behavioralRisk === "low" && " Minimal impact on current usage patterns expected."}
          </p>
        </div>
      </div>

      {/* Team Impact */}
      <Card>
        <SectionHeader title="Team Impact" className="mb-3" />
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Team</th>
              <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Users</th>
              <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Charge</th>
              <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.teamImpacts.map((t) => (
              <tr key={t.team} className="border-b border-border last:border-0">
                <td className="py-2.5 text-sm text-gray-700">{t.team}</td>
                <td className="py-2.5 text-sm text-gray-500 text-right font-mono">{t.usage}</td>
                <td className="py-2.5 text-sm text-gray-900 font-medium text-right font-mono">{formatCurrency(t.charge, true)}</td>
                <td className="py-2.5 text-right">
                  <span className={`text-xs font-medium ${t.budgetStatus === "within" ? "text-emerald-600" : "text-red-600"}`}>
                    {t.budgetStatus === "within" ? "Within budget" : `Over by ${formatCurrency(t.overBy || 0, true)}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Behavioral Prediction */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-purple-800">Behavioral Prediction</h3>
            <p className="text-xs text-purple-600 mt-1">{result.behavioralPrediction}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => {
          if (!result || !selectedProduct) return;
          exportToCSV(
            result.teamImpacts,
            [
              { header: "Team", accessor: (t) => t.team },
              { header: "Users", accessor: (t) => t.usage },
              { header: "Monthly Charge", accessor: (t) => formatCurrencyCSV(t.charge) },
              { header: "Budget Status", accessor: (t) => t.budgetStatus === "within" ? "Within budget" : `Over by ${formatCurrencyCSV(t.overBy || 0)}` },
            ],
            `simulation-${selectedProduct.name.replace(/\s+/g, "-").toLowerCase()}-${model}.csv`,
          );
          toastSuccess("Simulation results exported");
        }}>
          <Download className="h-3 w-3 mr-1" />
          Export Summary
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" disabled={!canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""} onClick={async () => {
          try {
            await apiPost("/simulations/save", { productId: selectedProduct?.id, model, params: { markup, baseFee, perQuery, freeTier }, adoptionSlider, revenueNeutral, result });
            toastSuccess("Scenario saved");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to save scenario";
            toastError(msg);
          }
        }}>
          Save Scenario
        </Button>
        {activateSuccess ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Policy Activated
          </div>
        ) : canActivate ? (
          <Button
            size="sm"
            className="text-xs h-8 bg-purple-600 hover:bg-purple-700"
            onClick={onShowActivateDialog}
            disabled={!canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
          >
            <Zap className="h-3 w-3 mr-1" />
            Activate as Policy
          </Button>
        ) : null}
      </div>
    </div>
  );
}
