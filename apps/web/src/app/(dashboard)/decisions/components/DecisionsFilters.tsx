import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DecisionType, DecisionStatus } from "@/lib/types";

const typeLabels: Record<string, string> = {
  all: "All Types",
  retirement: "Retirement",
  cost_investigation: "Cost Investigation",
  capital_reallocation: "Reallocation",
  pricing_activation: "Pricing",
  ai_project_review: "AI Review",
};

interface DecisionsFiltersProps {
  statusFilter: DecisionStatus | "all";
  typeFilter: DecisionType | "all";
  onStatusChange: (status: DecisionStatus | "all") => void;
  onTypeChange: (type: DecisionType | "all") => void;
  filteredCount: number;
}

export function DecisionsFilters({ statusFilter, typeFilter, onStatusChange, onTypeChange, filteredCount }: DecisionsFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter className="h-4 w-4 text-gray-400" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "under_review", "approved", "rejected", "delayed"] as const).map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => onStatusChange(s)}>
            {s === "all" ? "All Status" : s === "under_review" ? "Under Review" : s === "delayed" ? "Delayed" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <span className="text-gray-200">|</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "retirement", "cost_investigation", "capital_reallocation", "pricing_activation", "ai_project_review"] as const).map((t) => (
          <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => onTypeChange(t)}>
            {typeLabels[t]}
          </Button>
        ))}
      </div>
      <span className="text-xs text-gray-400 ml-auto">{filteredCount} decisions</span>
    </div>
  );
}
