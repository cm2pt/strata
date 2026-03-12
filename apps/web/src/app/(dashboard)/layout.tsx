"use client";

import { useState } from "react";
import { Sidebar, MobileMenuButton } from "@/components/layout/sidebar";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoModeBanner } from "@/components/shared/demo-mode-banner";
import { RouteProgress } from "@/components/shared/route-progress";
import { CommandPalette } from "@/components/layout/command-palette";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { WebVitalsReporter } from "@/components/shared/web-vitals-reporter";
import { ExplainabilityProvider } from "@/lib/contexts/explainability-context";
import { ExplainabilityToggle } from "@/components/shared/explainability-toggle";
import { HelpDrawer } from "@/components/shared/help-drawer";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <ExplainabilityProvider>
      <TooltipProvider delayDuration={200}>
        <KeyboardShortcutsProvider>
          <RouteProgress />
          <DemoModeBanner />
          <div className="flex min-h-screen bg-background">
            <Sidebar
              mobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
            <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
            <main className="flex-1 ml-0 lg:ml-60 pt-16 lg:pt-0 min-h-screen">
              <PermissionGuard>{children}</PermissionGuard>
            </main>
          </div>
          <CommandPalette />
          <OfflineIndicator />
          <WebVitalsReporter />
          <ExplainabilityToggle />
          <HelpDrawer open={helpOpen} onOpenChange={setHelpOpen} />
        </KeyboardShortcutsProvider>
      </TooltipProvider>
    </ExplainabilityProvider>
  );
}
