"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================
// PageHeader — Unified page-level header replacing Topbar
//
// Adds: CTA slot, secondary actions, breadcrumbs, inline chips
// Same sticky positioning + backdrop blur as original Topbar
// ============================================================

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Primary action button (right side) */
  primaryAction?: React.ReactNode;
  /** Secondary action buttons (left of primary) */
  secondaryActions?: React.ReactNode;
  /** Breadcrumb trail for detail pages */
  breadcrumbs?: Breadcrumb[];
  /** Inline badges/chips next to title */
  chips?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  breadcrumbs,
  chips,
  className,
}: PageHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-sm isolate px-6",
          hasBreadcrumbs ? "py-2.5" : "py-0",
          className,
        )}
      >
        {/* Breadcrumb row */}
        {hasBreadcrumbs && (
          <nav className="flex items-center gap-1 mb-1.5" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-xs text-gray-600 font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Main row: title/subtitle + actions */}
        <div
          className={cn(
            "flex items-center justify-between",
            !hasBreadcrumbs && "h-14",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h1>
                {chips}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {secondaryActions}
            {primaryAction}
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-600"
              aria-label="Help"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About {title}</DialogTitle>
            <DialogDescription>
              {subtitle || "Strata Data Capital Management"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Global search</span>
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono text-gray-600">⌘K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Navigate back</span>
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono text-gray-600">⌘[</kbd>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Quick Links</h4>
              <div className="space-y-1.5">
                <a href="/setup" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Platform Setup
                </a>
                <a href="/portfolio" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Portfolio Overview
                </a>
              </div>
            </div>
            <p className="text-xs text-gray-400 pt-2 border-t border-border">
              Strata v1.0 — Data Capital Management Platform
            </p>
            <p className="text-xs text-gray-400">
              Build: {process.env.NEXT_PUBLIC_BUILD_ID || "dev"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
