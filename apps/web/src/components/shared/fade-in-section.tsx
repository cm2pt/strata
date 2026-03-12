"use client";

import { cn } from "@/lib/utils";
import { useFadeInOnScroll } from "@/lib/hooks/use-fade-in-on-scroll";
import type { ReactNode } from "react";

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  /** Render as <section> or <div>. Default: "div" */
  as?: "section" | "div";
}

/**
 * Wrapper that fades children in when they scroll into view.
 *
 * Uses the `.fade-in-up` / `.visible` CSS classes and
 * the `useFadeInOnScroll` IntersectionObserver hook.
 */
export function FadeInSection({
  children,
  className,
  as: Tag = "div",
}: FadeInSectionProps) {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <Tag
      ref={ref}
      className={cn("fade-in-up", isVisible && "visible", className)}
    >
      {children}
    </Tag>
  );
}
