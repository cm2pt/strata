"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for power users.
 *
 * Navigation: `G` then `P/D/L/B/A/C/S/M` (go to page)
 * Actions: Available per-page via optional config
 *
 * Uses a two-key chord system: press G, then within 1s press the target key.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let pendingPrefix: string | null = null;
    let prefixTimeout: ReturnType<typeof setTimeout> | null = null;

    function clearPrefix() {
      pendingPrefix = null;
      if (prefixTimeout) {
        clearTimeout(prefixTimeout);
        prefixTimeout = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire in input/textarea/contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't fire when modifier keys are held (except shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // First key of chord: G for "go to"
      if (key === "g" && !pendingPrefix) {
        pendingPrefix = "g";
        prefixTimeout = setTimeout(clearPrefix, 1000); // 1s window
        return;
      }

      // Second key of chord
      if (pendingPrefix === "g") {
        clearPrefix();
        const routes: Record<string, string> = {
          p: "/portfolio",
          d: "/decisions",
          l: "/lifecycle",
          b: "/portfolio/board-view",
          a: "/assets",
          c: "/capital-impact",
          s: "/simulate",
          m: "/marketplace",
          r: "/capital-projection",
          k: "/capital-review",
        };
        if (routes[key]) {
          e.preventDefault();
          router.push(routes[key]);
        }
        return;
      }

      // Question mark for help
      if (key === "?" && e.shiftKey) {
        // Help dialog is handled by page-header; we emit a custom event
        window.dispatchEvent(new CustomEvent("strata:open-help"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPrefix();
    };
  }, [router]);
}

/** Shortcut definitions for display in help dialogs */
export const KEYBOARD_SHORTCUTS = [
  { keys: ["G", "P"], description: "Go to Portfolio" },
  { keys: ["G", "D"], description: "Go to Decisions" },
  { keys: ["G", "L"], description: "Go to Lifecycle" },
  { keys: ["G", "B"], description: "Go to Board View" },
  { keys: ["G", "A"], description: "Go to Assets" },
  { keys: ["G", "C"], description: "Go to Capital Impact" },
  { keys: ["G", "R"], description: "Go to Capital Projection" },
  { keys: ["G", "K"], description: "Go to Capital Review" },
  { keys: ["G", "S"], description: "Go to Simulate" },
  { keys: ["G", "M"], description: "Go to Marketplace" },
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Open help" },
] as const;
