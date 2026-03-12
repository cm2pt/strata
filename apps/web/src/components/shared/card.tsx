"use client";

import { cn } from "@/lib/utils";
import { card as cardTokens } from "@/lib/tokens";

interface CardProps {
  children: React.ReactNode;
  /** Enable hover shadow elevation */
  hover?: boolean;
  /** Card hierarchy variant */
  variant?: "primary" | "standard" | "inset";
  /** Additional class names */
  className?: string;
  /** onClick makes it a clickable card */
  onClick?: () => void;
}

/**
 * Base card component with token-consistent shadow, border, and radius.
 * Pass `hover` for interactive elevation, or `onClick` for full clickable behavior.
 * Use `variant` to control hierarchy: primary (hero), standard (default), inset (nested).
 */
export function Card({ children, hover = false, variant, className, onClick }: CardProps) {
  let base: string;

  if (variant) {
    base = cardTokens[variant];
  } else if (onClick) {
    base = cardTokens.interactive;
  } else if (hover) {
    base = `${cardTokens.base} ${cardTokens.hover}`;
  } else {
    base = cardTokens.base;
  }

  const padding = variant === "inset" ? "p-4" : cardTokens.padding;

  return (
    <div
      className={cn(base, padding, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {children}
    </div>
  );
}
