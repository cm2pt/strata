"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { apiPost, canMutate } from "@/lib/api/client";
import type { PricingModel, DataProduct } from "@/lib/types";
import type { SimResult } from "./SimulationResults";
import { pricingModels } from "./SimulationConfig";

export interface ActivatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: PricingModel;
  selectedProduct: DataProduct | undefined;
  result: SimResult | null;
  baseFee: number;
  perQuery: number;
  freeTier: number;
  markup: number;
  activateLoading: boolean;
  setActivateLoading: (loading: boolean) => void;
  setActivateSuccess: (success: boolean) => void;
  toastSuccess: (msg: string) => void;
  toastError: (msg: string) => void;
}

export function ActivatePolicyDialog({
  open,
  onOpenChange,
  model,
  selectedProduct,
  result,
  baseFee,
  perQuery,
  freeTier,
  markup,
  activateLoading,
  setActivateLoading,
  setActivateSuccess,
  toastSuccess,
  toastError,
}: ActivatePolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Pricing Policy</DialogTitle>
          <DialogDescription>
            Activate a <strong>{pricingModels.find(m => m.value === model)?.label}</strong> pricing policy on{" "}
            <strong>{selectedProduct?.name}</strong>. This creates a versioned policy, logs a decision, and starts tracking revenue.
          </DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-purple-400">Model:</span>
                  <span className="ml-1 font-medium text-purple-700">{pricingModels.find(m => m.value === model)?.label}</span>
                </div>
                <div>
                  <span className="text-purple-400">Projected Revenue:</span>
                  <span className="ml-1 font-medium text-purple-700">{formatCurrency(result.totalRevenue, true)}/mo</span>
                </div>
                <div>
                  <span className="text-purple-400">Net Position:</span>
                  <span className={`ml-1 font-medium ${result.netPosition >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {result.netPosition >= 0 ? "+" : ""}{formatCurrency(result.netPosition, true)}/mo
                  </span>
                </div>
                <div>
                  <span className="text-purple-400">Behavioral Risk:</span>
                  <span className={`ml-1 font-medium ${result.behavioralRisk === "high" ? "text-red-600" : result.behavioralRisk === "moderate" ? "text-amber-600" : "text-emerald-600"}`}>
                    {result.behavioralRisk}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            disabled={activateLoading || !canMutate}
            onClick={async () => {
              if (!canMutate) return;
              setActivateLoading(true);
              try {
                const params: Record<string, number> = {};
                if (model === "usage_based") {
                  params.baseFee = baseFee;
                  params.perQuery = perQuery;
                  params.freeTier = freeTier;
                } else if (model === "cost_plus") {
                  params.markup = markup;
                }
                await apiPost("/pricing/activate", {
                  productId: selectedProduct?.id,
                  model,
                  params,
                  projectedRevenue: result?.totalRevenue ?? 0,
                });
                setActivateSuccess(true);
                toastSuccess("Pricing policy activated");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Failed to activate pricing policy";
                toastError(msg);
              } finally {
                setActivateLoading(false);
                onOpenChange(false);
              }
            }}
          >
            {activateLoading ? "Activating..." : "Activate Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
