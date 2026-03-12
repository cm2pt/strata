"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Zap, TrendingDown, Clock, Repeat, AlertTriangle, DollarSign, CreditCard, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/lib/api/hooks";
import { apiPatch, apiPost, canMutate } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import type { Notification } from "@/lib/types";

// ── Icon + color per notification type ──────────────────────────────────────

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: typeof Zap; iconClass: string; dotClass: string }
> = {
  cost_spike:          { icon: Zap,            iconClass: "text-red-500",    dotClass: "bg-red-500" },
  usage_drop:          { icon: TrendingDown,   iconClass: "text-amber-500",  dotClass: "bg-amber-500" },
  value_expiring:      { icon: Clock,          iconClass: "text-blue-500",   dotClass: "bg-blue-500" },
  lifecycle_change:    { icon: Repeat,         iconClass: "text-purple-500", dotClass: "bg-purple-500" },
  retirement_candidate:{ icon: AlertTriangle,  iconClass: "text-amber-500",  dotClass: "bg-amber-500" },
  capital_freed:       { icon: DollarSign,     iconClass: "text-emerald-500",dotClass: "bg-emerald-500" },
  pricing_activated:   { icon: CreditCard,     iconClass: "text-emerald-500",dotClass: "bg-emerald-500" },
  ai_project_flagged:  { icon: Brain,          iconClass: "text-indigo-500", dotClass: "bg-indigo-500" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNavigationUrl(n: Notification): string {
  if (n.type === "retirement_candidate") return "/decisions";
  if (n.type === "lifecycle_change") return "/lifecycle";
  if (n.productId) return `/assets/${n.productId}`;
  return "/portfolio";
}

// ── Component ───────────────────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const { data: notifications, refetch } = useNotifications();
  const { toastError, toastSuccess } = useToast();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;

  // Update browser tab title with unread count
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [unreadCount]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiPost("/notifications/mark-all-read", {});
      toastSuccess("All notifications marked as read");
      refetch();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to mark all read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickNotification = async (n: Notification) => {
    // Mark as read
    if (!n.isRead && canMutate) {
      try {
        await apiPatch(`/notifications/${n.id}/read`, {});
        refetch();
      } catch {
        // Silent — navigation is primary action
      }
    }
    setOpen(false);
    router.push(getNavigationUrl(n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-gray-400 hover:text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0 z-[100]" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-700 h-7"
              onClick={handleMarkAllRead}
              disabled={!canMutate || markingAll}
              title={!canMutate ? "API unavailable in offline demo mode" : ""}
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>
          )}
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {items.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.cost_spike;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    aria-label={`${n.isRead ? "" : "Unread: "}${n.title}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.iconClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.timestamp)}</p>
                    </div>
                    {!n.isRead && (
                      <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
