"use client";

import { Eye, EyeOff } from "lucide-react";
import { useExplainability } from "@/lib/contexts/explainability-context";
import { cn } from "@/lib/utils";

export function ExplainabilityToggle() {
  const { showDataSources, toggleDataSources } = useExplainability();

  return (
    <button
      onClick={toggleDataSources}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium shadow-lg transition-all",
        showDataSources
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-white text-gray-600 border border-border hover:bg-gray-50 hover:text-gray-900"
      )}
      title={showDataSources ? "Hide data source annotations" : "Show data source annotations"}
    >
      {showDataSources ? (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          <span>Hide Sources</span>
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" />
          <span>Show Sources</span>
        </>
      )}
    </button>
  );
}
