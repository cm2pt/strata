import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { formatPlatform } from "@/lib/format";
import type { DataProduct } from "@/lib/types";

export interface AssetHeaderBarProps {
  product: DataProduct;
}

export function AssetHeaderBar({ product }: AssetHeaderBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <LifecyclePill stage={product.lifecycleStage} />
          {product.isCertified && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Certified
            </Badge>
          )}
          {product.hasCostSpike && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-amber-50 text-amber-700 border-amber-200"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Cost Spike
            </Badge>
          )}
          <Badge variant="outline" className="text-[11px]">
            {formatPlatform(product.platform)}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>
          Owner:{" "}
          <span className="text-gray-600 font-medium">
            {product.owner?.name ?? "Unassigned"}
          </span>
        </span>
        <span>·</span>
        <span>
          {product.owner?.title ?? ""}
          {product.owner?.team ? `, ${product.owner.team}` : ""}
        </span>
      </div>
    </div>
  );
}
