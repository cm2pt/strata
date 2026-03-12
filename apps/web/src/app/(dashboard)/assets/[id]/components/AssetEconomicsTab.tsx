"use client";

import { useState } from "react";
import { Info, Sparkles, PencilLine, Check } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatROI, formatPercent } from "@/lib/format";
import { useUpdateProductValue } from "@/lib/api/hooks";
import dynamic from "next/dynamic";
import type { DataProduct, CostTrendPoint, ValueMethod } from "@/lib/types";

const CostValueTrend = dynamic(
  () =>
    import("@/components/charts/cost-value-trend").then((m) => ({
      default: m.CostValueTrend,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" />
    ),
  }
);

const METHOD_OPTIONS: { value: ValueMethod; label: string }[] = [
  { value: "revenue_attribution", label: "Revenue Attribution" },
  { value: "cost_avoidance", label: "Cost Avoidance" },
  { value: "efficiency_gain", label: "Efficiency Gain" },
  { value: "compliance", label: "Compliance Requirement" },
  { value: "strategic", label: "Strategic Enabler" },
];

export interface AssetEconomicsTabProps {
  product: DataProduct;
  costTrend: CostTrendPoint[] | null | undefined;
  onValueUpdated?: () => void;
}

export function AssetEconomicsTab({
  product,
  costTrend,
  onValueUpdated,
}: AssetEconomicsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValue, setFormValue] = useState(
    product.declaredValue?.toString() ?? ""
  );
  const [formMethod, setFormMethod] = useState<ValueMethod>(
    product.valueDeclaration?.method ?? "revenue_attribution"
  );
  const [formBasis, setFormBasis] = useState(
    product.valueDeclaration?.basis ?? ""
  );
  const [saved, setSaved] = useState(false);
  const { execute, loading } = useUpdateProductValue();

  const iv = product.inferredValue;
  const vd = product.valueDeclaration;

  const handleSubmit = async () => {
    const numValue = parseFloat(formValue);
    if (isNaN(numValue) || numValue <= 0) return;
    await execute({
      productId: product.id,
      value: numValue,
      method: formMethod,
      basis: formBasis || `Value declaration for ${product.name}`,
    });
    setSaved(true);
    setTimeout(() => {
      setDialogOpen(false);
      setSaved(false);
      onValueUpdated?.();
    }, 800);
  };

  // Confidence tier for visual display
  const confidenceTier = iv
    ? iv.confidence >= 0.7
      ? "high"
      : iv.confidence >= 0.5
        ? "medium"
        : "low"
    : null;

  const confidenceColor = {
    high: "text-teal-700 bg-teal-50 border-teal-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low: "text-gray-500 bg-gray-50 border-gray-200",
  };

  return (
    <TabsContent value="economics" className="space-y-6">
      {/* Inferred Value Card */}
      {iv && (
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Engine-Inferred Value
              </h3>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${confidenceTier ? confidenceColor[confidenceTier] : ""}`}
            >
              {formatPercent(iv.confidence)} confidence
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Low
              </p>
              <p className="font-mono text-sm font-semibold text-gray-600">
                {formatCurrency(iv.annualBand.low / 12, true)}
                <span className="text-[10px] text-gray-400">/mo</span>
              </p>
            </div>
            <div className="text-center border-x border-indigo-100">
              <p className="text-[10px] uppercase tracking-wider text-indigo-500 mb-1">
                Mid (Best Estimate)
              </p>
              <p className="font-mono text-lg font-bold text-indigo-700">
                {formatCurrency(iv.monthlyMid, true)}
                <span className="text-xs text-indigo-400">/mo</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                High
              </p>
              <p className="font-mono text-sm font-semibold text-gray-600">
                {formatCurrency(iv.annualBand.high / 12, true)}
                <span className="text-[10px] text-gray-400">/mo</span>
              </p>
            </div>
          </div>

          {product.valueSource === "blended" && (
            <div className="text-xs text-gray-500 border-t border-indigo-100 pt-3">
              <span className="font-medium text-gray-700">Blended value:</span>{" "}
              {formatCurrency(iv.blendedMonthly, true)}/mo — weighted mix of
              your declaration and engine inference
            </div>
          )}

          <div className="text-[11px] text-gray-400 mt-2">
            Based on usage signals, structural position, executive adoption,
            decision linkage, and stability metrics.
          </div>
        </div>
      )}

      {/* Value Declaration Card */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Value Declaration
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <PencilLine className="h-3 w-3" />
            {vd ? "Update Value" : "Declare Value"}
          </Button>
        </div>

        {vd ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-gray-500">Declared Value</span>
              <span className="font-mono font-semibold text-gray-900">
                {formatCurrency(vd.value, true)}/mo
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-gray-500">Method</span>
              <span className="text-gray-700">
                {METHOD_OPTIONS.find((m) => m.value === vd.method)?.label ??
                  vd.method}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-gray-500">Declared by</span>
              <span className="text-gray-700">
                {vd.declaredBy}
                <span className="text-gray-400 ml-1">
                  · {vd.declaredByTitle}
                </span>
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-gray-500">Status</span>
              <div className="flex gap-1.5">
                {vd.status.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5"
                  >
                    <Check className="h-2.5 w-2.5" />
                    {s === "peer_reviewed" ? "Peer Reviewed" : "CFO Acknowledged"}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Next Review</span>
              <span
                className={`text-gray-700 ${vd.isExpiring ? "text-amber-600 font-medium" : ""}`}
              >
                {vd.nextReview}
                {vd.isExpiring && " (expiring soon)"}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-6 text-center">
            <p className="text-sm text-amber-700 font-medium mb-1">
              No value declared
            </p>
            <p className="text-xs text-amber-600/80">
              Declaring a value enables accurate ROI calculation and capital
              governance scoring.
              {iv && (
                <>
                  {" "}
                  The engine estimates this product at{" "}
                  <span className="font-mono font-semibold">
                    {formatCurrency(iv.monthlyMid, true)}/mo
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Cost vs Value Trend Chart */}
      {(costTrend ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Cost vs. Value Trend
          </h3>
          <CostValueTrend data={costTrend!} height={260} />
          <div className="flex items-center gap-4 mt-2 px-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Cost
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Composite Value
            </div>
          </div>
        </div>
      )}

      {/* ROI Calculation */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            ROI Calculation
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                How this is calculated →
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs">
              ROI = Composite Value / Total Cost. Composite Value = 70% Declared
              Value + 30% Usage-Implied Value.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-gray-500">Declared Value</span>
            <span className="font-mono font-medium text-gray-900">
              {product.declaredValue
                ? formatCurrency(product.declaredValue, true)
                : "\u2014"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-gray-500">Usage-Implied Value</span>
            <span className="font-mono font-medium text-gray-900">
              {formatCurrency(product.usageImpliedValue, true)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-gray-500">
              Composite Value
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="inline h-3 w-3 ml-1 text-gray-300" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-xs">
                  Composite Value = 70% × Declared Value + 30% × Usage-Implied
                  Value
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="font-mono font-semibold text-gray-900">
              {formatCurrency(product.compositeValue, true)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-gray-500">Total Cost of Ownership</span>
            <span className="font-mono font-medium text-gray-900">
              {formatCurrency(product.monthlyCost, true)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-900 font-semibold">ROI</span>
            <span className="font-mono font-bold text-lg text-gray-900">
              {formatROI(product.roi)}
            </span>
          </div>
        </div>
      </div>

      {/* Value Declaration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {vd ? "Update" : "Declare"} Value for {product.name}
            </DialogTitle>
            <DialogDescription>
              Enter the monthly business value this data product delivers.
              {iv && (
                <>
                  {" "}
                  The engine estimates{" "}
                  <span className="font-mono font-semibold">
                    {formatCurrency(iv.monthlyMid, true)}/mo
                  </span>{" "}
                  ({formatPercent(iv.confidence)} confidence).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="value">Monthly Value (USD)</Label>
              <Input
                id="value"
                type="number"
                min={0}
                step={1000}
                placeholder={
                  iv ? `Engine suggests ${formatCurrency(iv.monthlyMid, true)}` : "e.g. 50000"
                }
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Valuation Method</Label>
              <Select
                value={formMethod}
                onValueChange={(v) => setFormMethod(v as ValueMethod)}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basis">Justification</Label>
              <Input
                id="basis"
                placeholder="Why is this product worth this amount?"
                value={formBasis}
                onChange={(e) => setFormBasis(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formValue || parseFloat(formValue) <= 0}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              ) : loading ? (
                "Saving..."
              ) : (
                "Save Declaration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
