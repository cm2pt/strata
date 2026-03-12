"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { CardSkeleton } from "@/components/shared/skeleton";
import { useDataProducts, useDisplayConfig } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { useToast } from "@/components/shared/toast";
import type { PricingModel } from "@/lib/types";
import {
  SimulationConfig,
  SimulationResults,
  ActivatePolicyDialog,
  ScenarioHistory,
  useScenarioHistory,
  pricingModels,
} from "./components";
import type { SimResult, SavedScenario } from "./components";

export default function SimulatePage() {
  const { hasPermission } = useAuth();
  const { toastError, toastSuccess, toastWarning } = useToast();
  const canActivate = hasPermission(PERM.PRICING_ACTIVATE);

  const [model, setModel] = useState<PricingModel>("usage_based");
  const [markup, setMarkup] = useState(25);
  const [baseFee, setBaseFee] = useState(500);
  const [perQuery, setPerQuery] = useState(1.25);
  const [freeTier, setFreeTier] = useState(500);
  const [adoptionSlider, setAdoptionSlider] = useState(12); // % usage reduction estimate
  const [revenueNeutral, setRevenueNeutral] = useState(false);
  const { data: cfg } = useDisplayConfig();

  // Sync pricing defaults from display config when loaded
  useEffect(() => {
    if (cfg?.pricingSimulationDefaults) {
      const d = cfg.pricingSimulationDefaults;
      setMarkup(d.markup);
      setBaseFee(d.baseFee);
      setPerQuery(d.perQuery);
      setFreeTier(d.freeTier);
      setAdoptionSlider(d.adoptionSlider);
    }
  }, [cfg]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);

  const { scenarios, addScenario, removeScenario, clearHistory } = useScenarioHistory();

  const { data: productsData, loading } = useDataProducts();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const dataProducts = productsData?.items ?? [];
  const activeProducts = useMemo(
    () => dataProducts.filter((p) => p.lifecycleStage !== "retired" && p.monthlyConsumers > 0),
    [dataProducts],
  );
  const selectedProduct = activeProducts.find((p) => p.id === selectedProductId) ?? activeProducts[0];

  const handleProductChange = useCallback((id: string) => {
    setSelectedProductId(id);
    setResult(null);
    setActivateSuccess(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Pricing Strategy" subtitle="Model pricing, chargeback, and adoption scenarios" />
        <PageShell>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <CardSkeleton />
            </div>
            <div className="lg:col-span-3">
              <CardSkeleton />
            </div>
          </div>
        </PageShell>
      </div>
    );
  }

  const runSimulation = () => {
    if (!selectedProduct) return;
    const p = selectedProduct;
    const teams = p.consumerTeams;
    const totalQueries = p.totalQueries;

    let teamImpacts: SimResult["teamImpacts"];
    let totalRevenue: number;
    let adoptionImpact = adoptionSlider;
    let behavioralRisk: SimResult["behavioralRisk"] = "low";

    if (model === "usage_based") {
      // Adjust for adoption impact
      const adjustedQueries = Math.round(totalQueries * (1 - adoptionSlider / 100));

      teamImpacts = teams.map((t) => {
        const teamQueries = Math.round(adjustedQueries * (t.percentage / 100));
        const billableQueries = Math.max(0, teamQueries - freeTier);
        const charge = baseFee + billableQueries * perQuery;
        return {
          team: t.name,
          usage: Math.round(t.consumers * (1 - adoptionSlider / 200)), // partial adoption reduction
          charge: Math.round(charge),
          budgetStatus: charge > (cfg?.teamBudgetThreshold.amount ?? 4500) ? "over" as const : "within" as const,
          overBy: charge > (cfg?.teamBudgetThreshold.amount ?? 4500) ? Math.round(charge - (cfg?.teamBudgetThreshold.amount ?? 4500)) : undefined,
        };
      });
      totalRevenue = teamImpacts.reduce((s, t) => s + t.charge, 0);
      behavioralRisk = adoptionSlider > 20 ? "high" : adoptionSlider > 10 ? "moderate" : "low";
    } else if (model === "cost_plus") {
      const effectiveMarkup = revenueNeutral ? 0 : markup;
      totalRevenue = Math.round(p.monthlyCost * (1 + effectiveMarkup / 100));
      teamImpacts = teams.map((t) => ({
        team: t.name,
        usage: t.consumers,
        charge: Math.round(totalRevenue * (t.percentage / 100)),
        budgetStatus: "within" as const,
      }));
      adoptionImpact = effectiveMarkup > 30 ? 15 : effectiveMarkup > 15 ? 8 : 3;
      behavioralRisk = effectiveMarkup > 30 ? "moderate" : "low";
    } else {
      totalRevenue = Math.round(p.monthlyCost * 1.2);
      teamImpacts = teams.map((t) => ({
        team: t.name,
        usage: t.consumers,
        charge: Math.round(totalRevenue * (t.percentage / 100)),
        budgetStatus: "within" as const,
      }));
      adoptionImpact = 5;
      behavioralRisk = "low";
    }

    // Revenue neutral adjustment
    if (revenueNeutral) {
      const target = p.monthlyCost;
      const ratio = target / totalRevenue;
      teamImpacts = teamImpacts.map(t => ({ ...t, charge: Math.round(t.charge * ratio) }));
      totalRevenue = target;
    }

    const predictions: Record<PricingModel, string> = {
      usage_based: `At $${perQuery.toFixed(2)}/query with ${freeTier} free queries, estimated ${adoptionSlider}% reduction in casual queries. Heavy users (Marketing, Sales) bear proportional cost. ${revenueNeutral ? "Revenue-neutral target applied — prices adjusted to match product cost." : "Consider adjusting per-query rate to achieve target recovery."}`,
      cost_plus: `Straightforward model with ${revenueNeutral ? "0" : markup}% markup. ${revenueNeutral ? "Revenue-neutral: teams cover exact cost share." : `${adoptionImpact}% estimated usage reduction from price sensitivity.`} All teams absorb proportional cost.`,
      tiered: "Tiered pricing encourages heavy users while protecting lighter consumers. Moderate behavioral shift expected.",
      flat: "Flat fee simplifies budgeting but doesn't incentivize efficient usage. Minimal behavioral change.",
      value_share: "Value-share aligns incentives but requires robust value declarations. High engagement expected.",
    };

    const simResult: SimResult = {
      totalRevenue,
      totalCost: p.monthlyCost,
      netPosition: totalRevenue - p.monthlyCost,
      teamImpacts,
      behavioralPrediction: predictions[model],
      adoptionImpact,
      behavioralRisk,
    };
    setResult(simResult);

    // Auto-save to local scenario history
    addScenario({
      productName: p.name,
      model,
      result: simResult,
      params: { markup, baseFee, perQuery, freeTier, adoptionSlider, revenueNeutral },
    });
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Pricing Strategy" subtitle="Model pricing, chargeback, and adoption scenarios" />

      <PageShell>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Configuration */}
          <SimulationConfig
            products={activeProducts}
            selectedProduct={selectedProduct}
            onProductChange={handleProductChange}
            model={model}
            setModel={setModel}
            markup={markup}
            setMarkup={setMarkup}
            baseFee={baseFee}
            setBaseFee={setBaseFee}
            perQuery={perQuery}
            setPerQuery={setPerQuery}
            freeTier={freeTier}
            setFreeTier={setFreeTier}
            adoptionSlider={adoptionSlider}
            setAdoptionSlider={setAdoptionSlider}
            revenueNeutral={revenueNeutral}
            setRevenueNeutral={setRevenueNeutral}
            onRunSimulation={runSimulation}
          />

          {/* RIGHT: Results */}
          <div className="lg:col-span-3">
            <SimulationResults
              result={result}
              selectedProduct={selectedProduct}
              model={model}
              markup={markup}
              baseFee={baseFee}
              perQuery={perQuery}
              freeTier={freeTier}
              adoptionSlider={adoptionSlider}
              revenueNeutral={revenueNeutral}
              canActivate={canActivate}
              activateSuccess={activateSuccess}
              onRunSimulation={runSimulation}
              onShowActivateDialog={() => setShowActivateDialog(true)}
              toastSuccess={toastSuccess}
              toastWarning={toastWarning}
              toastError={toastError}
            />
          </div>
        </div>
        {/* Scenario History */}
        <ScenarioHistory
          scenarios={scenarios}
          onRestore={(s: SavedScenario) => {
            setModel(s.model);
            setMarkup(s.params.markup);
            setBaseFee(s.params.baseFee);
            setPerQuery(s.params.perQuery);
            setFreeTier(s.params.freeTier);
            setAdoptionSlider(s.params.adoptionSlider);
            setRevenueNeutral(s.params.revenueNeutral);
            setResult(s.result);
            toastSuccess("Scenario restored");
          }}
          onRemove={removeScenario}
          onClear={clearHistory}
        />

        {/* Narrative Flow → Capital Projection */}
        <NextStepCard
          title="See how pricing scenarios affect your outlook"
          description="Model how active pricing policies and governance actions compound across a 12-month capital projection."
          href="/capital-projection"
          ctaLabel="Capital Projection"
        />
      </PageShell>

      {/* Activate Policy Dialog */}
      <ActivatePolicyDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        model={model}
        selectedProduct={selectedProduct}
        result={result}
        baseFee={baseFee}
        perQuery={perQuery}
        freeTier={freeTier}
        markup={markup}
        activateLoading={activateLoading}
        setActivateLoading={setActivateLoading}
        setActivateSuccess={setActivateSuccess}
        toastSuccess={toastSuccess}
        toastError={toastError}
      />
    </div>
  );
}
