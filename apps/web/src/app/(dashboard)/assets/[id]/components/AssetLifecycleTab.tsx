import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { apiPost, apiPatch, canMutate } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DataProduct } from "@/lib/types";

export interface AssetLifecycleTabProps {
  product: DataProduct;
  productId: string;
}

export function AssetLifecycleTab({
  product,
  productId,
}: AssetLifecycleTabProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [retirementLoading, setRetirementLoading] = useState(false);
  const [dismissLoading, setDismissLoading] = useState(false);

  return (
    <TabsContent value="lifecycle" className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Lifecycle Journey
        </h3>
        <div className="flex items-center gap-2">
          {(
            [
              "draft",
              "active",
              "growth",
              "mature",
              "decline",
              "retired",
            ] as const
          ).map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium ${
                  stage === product.lifecycleStage
                    ? "ring-2 ring-offset-2 ring-blue-500"
                    : ""
                }`}
              >
                <LifecyclePill stage={stage} />
              </div>
              {i < 5 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Created {formatDate(product.createdAt)} · Last updated{" "}
          {formatDate(product.updatedAt)}
        </p>
      </div>
      {product.isRetirementCandidate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                Retirement Candidate
              </h3>
              <p className="text-xs text-amber-600 mt-1">
                This product has {product.monthlyConsumers} consumers (was{" "}
                {product.peakConsumers} at peak). Usage has declined{" "}
                {Math.abs(product.usageTrend)}% and costs{" "}
                {formatCurrency(product.monthlyCost, true)}/month.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="text-xs h-8 bg-amber-600 hover:bg-amber-700"
                  disabled={!canMutate || retirementLoading}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                  onClick={async () => {
                    if (!canMutate) return;
                    setRetirementLoading(true);
                    try {
                      await apiPost("/decisions", {
                        productId: productId,
                        type: "retirement_review",
                        title: "Retirement review: " + product.name,
                        capitalEstimate: product.monthlyCost,
                      });
                      toastSuccess("Retirement review created");
                      router.push("/decisions");
                    } catch (e: unknown) {
                      toastError(
                        e instanceof Error ? e.message : "An error occurred"
                      );
                    } finally {
                      setRetirementLoading(false);
                    }
                  }}
                >
                  {retirementLoading
                    ? "Starting\u2026"
                    : "Start Retirement Review"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-amber-300 text-amber-700"
                  disabled={!canMutate || dismissLoading}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                  onClick={async () => {
                    if (!canMutate) return;
                    setDismissLoading(true);
                    try {
                      await apiPatch(`/products/${productId}`, {
                        isRetirementCandidate: false,
                      });
                      toastSuccess("Retirement candidate dismissed");
                      window.location.reload();
                    } catch (e: unknown) {
                      toastError(
                        e instanceof Error ? e.message : "An error occurred"
                      );
                    } finally {
                      setDismissLoading(false);
                    }
                  }}
                >
                  {dismissLoading ? "Dismissing\u2026" : "Dismiss"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
