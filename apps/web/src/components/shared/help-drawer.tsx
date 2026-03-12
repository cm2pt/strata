"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, BookOpen } from "lucide-react";
import { getHelpContent } from "@/lib/help-content";
import { KEYBOARD_SHORTCUTS } from "@/lib/hooks/use-keyboard-shortcuts";
import { brand } from "@/lib/tokens";

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Slide-in help drawer showing contextual guidance for the current page,
 * keyboard shortcuts, and a glossary of key terms.
 */
export function HelpDrawer({ open, onOpenChange }: HelpDrawerProps) {
  const pathname = usePathname();
  const content = getHelpContent(pathname);

  // Listen for custom event from keyboard shortcut
  useEffect(() => {
    function handleOpenHelp() {
      onOpenChange(true);
    }
    window.addEventListener("strata:open-help", handleOpenHelp);
    return () => window.removeEventListener("strata:open-help", handleOpenHelp);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[380px] max-w-[90vw] bg-white border-l z-50 shadow-xl overflow-y-auto"
        style={{ borderColor: brand.borderLight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: brand.borderLight }}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: brand.accentGreen }} />
            <h2 className="text-sm font-semibold" style={{ color: brand.graphite }}>
              {content.title}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close help"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Summary */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {content.summary}
          </p>

          {/* Key points */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Key Points
            </h3>
            <ul className="space-y-2">
              {content.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {/* Glossary */}
          {content.glossary && content.glossary.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Glossary
              </h3>
              <div className="space-y-2">
                {content.glossary.map((item) => (
                  <div key={item.term} className="rounded-lg border border-gray-100 p-2.5">
                    <p className="text-xs font-semibold text-gray-800">
                      {item.term}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-1">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-xs text-gray-600">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-mono text-gray-500"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="border-t pt-4" style={{ borderColor: brand.borderSubtle }}>
            <p className="text-[11px] text-gray-400">
              Need more help? Contact your Strata account team or refer to the methodology appendix in Board View.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
