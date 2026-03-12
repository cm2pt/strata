"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Recycle,
  Store,
  FlaskConical,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PieChart,
  DollarSign,
  Brain,
  Inbox,
  LogOut,
  Gauge,
  TrendingDown,
  Layers,
  GitBranch,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StrataLogo } from "@/components/shared/strata-logo";
import { PersonaSwitcher } from "@/components/layout/persona-switcher";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/context";
import { useOrgInfo } from "@/lib/api/hooks";
import { ROUTE_PERMISSIONS } from "@/lib/auth/permissions";
import type { LucideIcon } from "lucide-react";

// ============================================================
// Navigation Groups — workflow-oriented structure
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Discover",
    items: [
      { href: "/candidates", label: "Candidates", icon: Inbox },
      { href: "/assets", label: "Assets", icon: Database },
    ],
  },
  {
    label: "Govern",
    items: [
      { href: "/lifecycle", label: "Lifecycle", icon: Recycle },
      { href: "/decisions", label: "Decisions", icon: BookOpen },
    ],
  },
  {
    label: "Optimize",
    items: [
      { href: "/allocation", label: "Allocation", icon: PieChart },
      { href: "/capital-impact", label: "Capital Impact", icon: DollarSign },
      { href: "/ai-scorecard", label: "AI Scorecard", icon: Brain },
      { href: "/simulate", label: "Simulate", icon: FlaskConical },
    ],
  },
  {
    label: "Measure",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: LayoutDashboard },
      { href: "/capital-review", label: "Capital Review", icon: Gauge },
      { href: "/capital-projection", label: "Projection", icon: TrendingDown },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Store },
      { href: "/lineage", label: "Lineage Center", icon: GitBranch },
      { href: "/connectors/depth", label: "Connector Depth", icon: Layers },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: "/setup", label: "Setup", icon: Settings },
];

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ============================================================
// Helpers
// ============================================================

/* Pastel avatar colors */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];
function avatarColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ============================================================
// Mobile Hamburger Button (rendered outside sidebar, in layout)
// ============================================================

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white shadow-sm text-gray-600 hover:text-gray-900 transition-colors"
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

// ============================================================
// Sidebar
// ============================================================

interface SidebarProps {
  /** Mobile drawer open state (controlled from layout) */
  mobileOpen?: boolean;
  /** Close the mobile drawer */
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const { data: orgInfo } = useOrgInfo();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) onMobileClose?.();
    },
    [mobileOpen, onMobileClose],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Determine which nav items are emphasized for the current role
  const navPriority = user?.roleMeta?.navPriority ?? [];
  const navPrioritySet = new Set(navPriority);

  // Filter nav groups: only show routes the user has permission to access
  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const requiredPerm = ROUTE_PERMISSIONS[item.href];
            if (!requiredPerm) return true;
            return hasPermission(requiredPerm);
          }),
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission],
  );

  // User display info
  const userName = user?.name ?? "User";
  const userRole = user?.roleMeta?.displayName ?? user?.role ?? "";

  /** Open command palette via keyboard event */
  function openCommandPalette() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <StrataLogo variant="mark" theme="light" size="md" />
        {!collapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-900 truncate">Strata</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{orgInfo?.name ?? "Strata"}</span>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden ml-auto h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search trigger — opens CommandPalette via ⌘K */}
      <div className="px-3 py-3">
        <button
          onClick={openCommandPalette}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600",
            collapsed ? "h-9 justify-center px-0" : "h-9 px-3"
          )}
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs flex-1 text-left">Search...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-white px-1.5 text-[10px] font-medium text-gray-400">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Grouped Navigation — filtered by role permissions */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {visibleGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="ledger-divider mb-3" />}
            {!collapsed && (
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium px-3 mb-2">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const isPriority = navPrioritySet.has(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-teal-50/50 text-gray-900 font-semibold border-l-2 border-teal-600"
                        : isPriority
                          ? "text-gray-700 font-medium hover:bg-gray-50"
                          : "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn(
                      "h-[18px] w-[18px] flex-shrink-0",
                      isActive ? "text-teal-700" : isPriority ? "text-gray-600" : "text-gray-400"
                    )} />
                    {!collapsed && (
                      <span>{item.label}</span>
                    )}
                    {/* Priority dot for non-active priority items */}
                    {!collapsed && isPriority && !isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="space-y-0.5 px-3 pb-2">
        {bottomNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isPriority = navPrioritySet.has(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-teal-50/50 text-gray-900 font-semibold border-l-2 border-teal-600"
                  : isPriority
                    ? "text-gray-700 font-medium hover:bg-gray-50"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] flex-shrink-0",
                isActive ? "text-teal-700" : isPriority ? "text-gray-600" : "text-gray-400"
              )} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User / collapse */}
      <div className="border-t border-border px-3 py-3">
        {DEMO_MODE ? (
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-1")}>
            <div className={collapsed ? "" : "flex-1 min-w-0"}>
              <PersonaSwitcher collapsed={collapsed} />
            </div>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-300 hover:text-gray-600 flex-shrink-0"
                onClick={logout}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hidden lg:flex flex-shrink-0"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0",
                    avatarColor(userName),
                  )}
                >
                  {initials(userName)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-700 truncate">{userName}</span>
                  <span className="text-[10px] text-gray-400 truncate">{userRole}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-300 hover:text-gray-600 flex-shrink-0 ml-auto"
                  onClick={logout}
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-white flex-col transition-all duration-200",
          "hidden lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-60 border-r border-border bg-white flex flex-col transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
