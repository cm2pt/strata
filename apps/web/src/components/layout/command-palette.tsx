"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Recycle,
  Store,
  FlaskConical,
  Settings,
  BookOpen,
  PieChart,
  DollarSign,
  Brain,
  Inbox,
  Gauge,
  TrendingDown,
  FileText,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useDataProducts, useDecisions, useCandidates } from "@/lib/api/hooks";

// ============================================================
// CommandPalette — Global ⌘K search
//
// Three search groups: Pages, Assets, Decisions, Candidates.
// Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows/Linux).
// ============================================================

const PAGES = [
  { href: "/portfolio", label: "Portfolio", icon: LayoutDashboard, description: "Capital performance overview" },
  { href: "/candidates", label: "Candidates", icon: Inbox, description: "Data product candidates" },
  { href: "/assets", label: "Assets", icon: Database, description: "All data products" },
  { href: "/lifecycle", label: "Lifecycle", icon: Recycle, description: "Lifecycle stage management" },
  { href: "/decisions", label: "Decisions", icon: BookOpen, description: "Decision log & queue" },
  { href: "/allocation", label: "Allocation", icon: PieChart, description: "Capital allocation view" },
  { href: "/capital-impact", label: "Capital Impact", icon: DollarSign, description: "Impact analysis" },
  { href: "/capital-review", label: "Capital Review", icon: Gauge, description: "Rebalance recommendations" },
  { href: "/capital-projection", label: "Capital Projection", icon: TrendingDown, description: "6-month forecast" },
  { href: "/ai-scorecard", label: "AI Scorecard", icon: Brain, description: "AI readiness scoring" },
  { href: "/marketplace", label: "Marketplace", icon: Store, description: "Internal data marketplace" },
  { href: "/simulate", label: "Simulate", icon: FlaskConical, description: "Scenario simulation" },
  { href: "/setup", label: "Setup", icon: Settings, description: "Organization settings" },
  { href: "/portfolio/board-view", label: "Board View", icon: FileText, description: "Executive summary" },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cached data — these hooks are already loaded by sidebar/pages
  const { data: productsData } = useDataProducts();
  const { data: decisionsData } = useDecisions();
  const { data: candidatesData } = useCandidates();

  const assets = useMemo(() => productsData?.items ?? [], [productsData]);
  const decisions = useMemo(() => decisionsData ?? [], [decisionsData]);
  const candidates = useMemo(() => candidatesData ?? [], [candidatesData]);

  // Global keyboard listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search pages, assets, decisions, and candidates"
    >
      <CommandInput placeholder="Search pages, assets, decisions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Pages */}
        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.label} ${page.description}`}
              onSelect={() => navigate(page.href)}
            >
              <page.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1">{page.label}</span>
              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                {page.description}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Assets */}
        {assets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Assets">
              {assets.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={`${asset.name} ${asset.domain} ${asset.businessUnit}`}
                  onSelect={() => navigate(`/assets/${asset.id}`)}
                >
                  <Database className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{asset.name}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[160px]">
                    {asset.domain}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Decisions">
              {decisions.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.title} ${d.productName} ${d.type} ${d.status}`}
                  onSelect={() => navigate(`/decisions/${d.id}`)}
                >
                  <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{d.title}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">
                    {d.status.replace(/_/g, " ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Candidates */}
        {candidates.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Candidates">
              {candidates.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nameSuggested} ${c.domainSuggested ?? ""} ${c.candidateType}`}
                  onSelect={() => navigate(`/candidates/${c.id}`)}
                >
                  <Inbox className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{c.nameSuggested}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">
                    {c.status.replace(/_/g, " ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate</span>
        <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">↵</kbd> select</span>
        <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">esc</kbd> close</span>
      </div>
    </CommandDialog>
  );
}
