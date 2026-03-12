"use client";

/**
 * Strata — Route-Level Permission Guard
 *
 * Wraps the dashboard layout to check whether the current user
 * has access to the current route. Shows an access-denied screen
 * if the user lacks the required permission.
 */

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getRequiredPermission } from "@/lib/auth/permissions";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission, loading } = useAuth();

  // Still loading auth state — show nothing (avoids flicker)
  if (loading) return null;

  // Not authenticated — middleware handles redirect, but just in case
  if (!user) return null;

  const requiredPermission = getRequiredPermission(pathname);

  // No permission required for this route, or user has it
  if (!requiredPermission || hasPermission(requiredPermission)) {
    return <>{children}</>;
  }

  // User does NOT have permission — show access denied
  const roleName = user.roleMeta?.displayName ?? user.role;
  const defaultRoute = user.roleMeta?.defaultFocusRoute ?? "/portfolio";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
        <ShieldX className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-500 max-w-md mb-1">
        Your role (<span className="font-medium text-gray-700">{roleName}</span>) does
        not have the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">{requiredPermission}</code> permission
        required for this page.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Contact your admin to request access.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(defaultRoute)}
      >
        Go to {defaultRoute.replace("/", "").replace(/-/g, " ")}
      </Button>
    </div>
  );
}
