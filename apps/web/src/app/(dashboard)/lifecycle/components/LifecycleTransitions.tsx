"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { ArrowRight } from "lucide-react";
import type { LifecycleTransition } from "@/lib/types";

export interface LifecycleTransitionsProps {
  transitions: LifecycleTransition[];
}

export function LifecycleTransitions({ transitions }: LifecycleTransitionsProps) {
  return (
    <Card>
      <SectionHeader title="Lifecycle Transitions This Quarter" />
      <div className="grid grid-cols-5 gap-4">
        {transitions.map((t) => (
          <div key={`${t.from}-${t.to}`} className="flex items-center gap-2 rounded-lg border border-border p-3">
            <LifecyclePill stage={t.from} size="xs" />
            <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
            <LifecyclePill stage={t.to} size="xs" />
            <span className="text-sm font-semibold text-gray-700 ml-auto">{t.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
