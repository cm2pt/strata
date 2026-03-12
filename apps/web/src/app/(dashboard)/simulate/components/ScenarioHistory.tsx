"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency } from "@/lib/format";
import { History, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PricingModel } from "@/lib/types";
import type { SimResult } from "./SimulationResults";

export interface SavedScenario {
  id: string;
  timestamp: string;
  productName: string;
  model: PricingModel;
  result: SimResult;
  params: {
    markup: number;
    baseFee: number;
    perQuery: number;
    freeTier: number;
    adoptionSlider: number;
    revenueNeutral: boolean;
  };
}

const STORAGE_KEY = "strata_simulation_history";

function loadHistory(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(scenarios: SavedScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios.slice(0, 20))); // Keep last 20
}

export function useScenarioHistory() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);

  useEffect(() => {
    setScenarios(loadHistory());
  }, []);

  const addScenario = (scenario: Omit<SavedScenario, "id" | "timestamp">) => {
    const newScenario: SavedScenario = {
      ...scenario,
      id: `sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newScenario, ...scenarios].slice(0, 20);
    setScenarios(updated);
    saveHistory(updated);
    return newScenario;
  };

  const removeScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id);
    setScenarios(updated);
    saveHistory(updated);
  };

  const clearHistory = () => {
    setScenarios([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { scenarios, addScenario, removeScenario, clearHistory };
}

interface ScenarioHistoryProps {
  scenarios: SavedScenario[];
  onRestore: (scenario: SavedScenario) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const MODEL_LABELS: Record<PricingModel, string> = {
  usage_based: "Usage-Based",
  cost_plus: "Cost-Plus",
  tiered: "Tiered",
  flat: "Flat Fee",
  value_share: "Value Share",
};

export function ScenarioHistory({ scenarios, onRestore, onRemove, onClear }: ScenarioHistoryProps) {
  if (scenarios.length === 0) return null;

  return (
    <Card>
      <SectionHeader
        title="Scenario History"
        subtitle="Previously saved pricing scenarios"
        icon={History}
        iconColor="text-gray-600"
        iconBg="bg-gray-100"
        action={
          <Button variant="ghost" size="sm" className="text-xs h-7 text-gray-400 hover:text-red-500" onClick={onClear}>
            Clear all
          </Button>
        }
      />
      <div className="space-y-2">
        {scenarios.slice(0, 8).map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{s.productName}</p>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {MODEL_LABELS[s.model]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                <span className="font-mono tabular-nums">
                  Net: <span className={s.result.netPosition >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {s.result.netPosition >= 0 ? "+" : ""}{formatCurrency(s.result.netPosition, true)}
                  </span>
                </span>
                <span>
                  Risk: <span className={
                    s.result.behavioralRisk === "high" ? "text-red-500" :
                    s.result.behavioralRisk === "moderate" ? "text-amber-500" : "text-emerald-500"
                  }>{s.result.behavioralRisk}</span>
                </span>
                <span>{new Date(s.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRestore(s)} title="Restore this scenario">
                <RotateCcw className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRemove(s.id)} title="Remove">
                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
