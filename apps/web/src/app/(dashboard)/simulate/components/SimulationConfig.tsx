"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Play, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { PricingModel, DataProduct } from "@/lib/types";

const pricingModels: { value: PricingModel; label: string; description: string }[] = [
  { value: "cost_plus", label: "Cost-plus", description: "Cost + fixed markup %" },
  { value: "usage_based", label: "Usage-based", description: "Base fee + per-query charge" },
  { value: "tiered", label: "Tiered", description: "Usage tiers with decreasing rates" },
  { value: "flat", label: "Flat subscription", description: "Fixed monthly fee per team" },
  { value: "value_share", label: "Value-share", description: "% of declared value" },
];

export { pricingModels };

export interface SimulationConfigProps {
  products: DataProduct[];
  selectedProduct: DataProduct;
  onProductChange: (id: string) => void;
  model: PricingModel;
  setModel: (model: PricingModel) => void;
  markup: number;
  setMarkup: (value: number) => void;
  baseFee: number;
  setBaseFee: (value: number) => void;
  perQuery: number;
  setPerQuery: (value: number) => void;
  freeTier: number;
  setFreeTier: (value: number) => void;
  adoptionSlider: number;
  setAdoptionSlider: (value: number) => void;
  revenueNeutral: boolean;
  setRevenueNeutral: (value: boolean) => void;
  onRunSimulation: () => void;
}

export function SimulationConfig({
  products,
  selectedProduct,
  onProductChange,
  model,
  setModel,
  markup,
  setMarkup,
  baseFee,
  setBaseFee,
  perQuery,
  setPerQuery,
  freeTier,
  setFreeTier,
  adoptionSlider,
  setAdoptionSlider,
  revenueNeutral,
  setRevenueNeutral,
  onRunSimulation,
}: SimulationConfigProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      {/* Product selector */}
      <Card>
        <SectionHeader title="Apply to" className="mb-3" />
        <div className="relative">
          <select
            value={selectedProduct?.id ?? ""}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-blue-200 bg-blue-50/50 p-3 pr-8 text-sm font-medium text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {selectedProduct && (
          <p className="text-xs text-gray-500 mt-2 px-1">
            {selectedProduct.monthlyConsumers} consumers · {formatCurrency(selectedProduct.monthlyCost, true)}/mo cost
          </p>
        )}
      </Card>

      {/* Pricing Model */}
      <Card>
        <SectionHeader title="Pricing Model" className="mb-3" />
        <div className="space-y-2">
          {pricingModels.map((m) => (
            <button
              key={m.value}
              onClick={() => setModel(m.value)}
              className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                model === m.value ? "border-blue-300 bg-blue-50/50" : "border-border hover:bg-gray-50"
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${model === m.value ? "border-blue-500" : "border-gray-300"}`}>
                {model === m.value && <div className="h-2 w-2 rounded-full bg-blue-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-400">{m.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Parameters */}
      <Card>
        <SectionHeader title="Parameters" className="mb-3" />
        {model === "cost_plus" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Markup %</Label>
              <Input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="h-9 text-sm mt-1" />
            </div>
          </div>
        )}
        {model === "usage_based" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Base fee per team ($/mo)</Label>
              <Input type="number" value={baseFee} onChange={(e) => setBaseFee(Number(e.target.value))} className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Per-query cost ($)</Label>
              <Input type="number" step={0.01} value={perQuery} onChange={(e) => setPerQuery(Number(e.target.value))} className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Free tier (queries/mo)</Label>
              <Input type="number" value={freeTier} onChange={(e) => setFreeTier(Number(e.target.value))} className="h-9 text-sm mt-1" />
            </div>
          </div>
        )}
        {(model !== "cost_plus" && model !== "usage_based") && (
          <p className="text-xs text-gray-400 italic">Parameters for {pricingModels.find(m => m.value === model)?.label} model coming soon.</p>
        )}
      </Card>

      {/* Strategy Controls */}
      <Card>
        <SectionHeader title="Strategy Controls" className="mb-3" />
        <div className="space-y-4">
          {/* Adoption impact slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-gray-500">Adoption Impact Estimate</Label>
              <span className="text-xs font-semibold text-gray-900 font-mono">{adoptionSlider}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              value={adoptionSlider}
              onChange={(e) => setAdoptionSlider(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>No impact</span>
              <span>High price sensitivity</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Estimated % reduction in usage when price is introduced. Higher pricing &rarr; lower adoption.</p>
          </div>

          {/* Revenue neutral toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">Revenue Neutrality Target</p>
              <p className="text-[10px] text-gray-400">Adjust prices to exactly cover product cost</p>
            </div>
            <button
              onClick={() => setRevenueNeutral(!revenueNeutral)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${revenueNeutral ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}
            >
              {revenueNeutral ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {revenueNeutral ? "On" : "Off"}
            </button>
          </div>
        </div>
      </Card>

      <Button className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-sm font-medium" onClick={onRunSimulation}>
        <Play className="h-4 w-4 mr-2" />
        Run Simulation
      </Button>
    </div>
  );
}
