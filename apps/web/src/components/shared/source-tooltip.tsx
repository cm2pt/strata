"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldProvenance } from "@/lib/types";

const LEVEL_LABEL: Record<string, string> = {
  fully_automated: "Fully Automated",
  semi_automated: "Semi-Automated",
  manual: "Manual",
};

interface SourceTooltipProps {
  children: React.ReactNode;
  fieldName: string;
  provenance?: FieldProvenance | null;
}

export function SourceTooltip({ children, fieldName, provenance }: SourceTooltipProps) {
  if (!provenance) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="border-b border-dashed border-gray-300 cursor-help">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 text-xs">
        <div className="space-y-1.5">
          <p className="font-semibold text-gray-800">{fieldName}</p>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Platform:</span>
            <span className="font-medium text-gray-700">{provenance.sourcePlatform}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Method:</span>
            <span className="font-mono text-gray-700">{provenance.extractionMethod}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Automation:</span>
            <span className="font-medium text-gray-700">{LEVEL_LABEL[provenance.automationLevel] ?? provenance.automationLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Confidence:</span>
            <span className="font-medium text-gray-700">{Math.round(provenance.confidence * 100)}%</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
