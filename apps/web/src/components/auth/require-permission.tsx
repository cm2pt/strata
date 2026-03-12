"use client";

/**
 * Strata — Permission-Gated Rendering
 *
 * Conditionally renders children based on the current user's permissions.
 * Used to hide action buttons, menu items, and sections from users who
 * lack the required permission.
 *
 * This is a UI convenience — all actions are also enforced server-side.
 */

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";

interface RequirePermissionProps {
  /** Permission string to check (e.g. "decisions:approve") */
  permission: string;
  /** Content to render if the user HAS the permission */
  children: ReactNode;
  /** Optional fallback content for unauthorized users (default: nothing) */
  fallback?: ReactNode;
}

/**
 * Only renders children when the current user has the specified permission.
 *
 * @example
 * <RequirePermission permission="decisions:approve">
 *   <Button>Approve</Button>
 * </RequirePermission>
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Renders children when the user has ANY of the specified permissions.
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAuth();

  const hasAny = permissions.some((p) => hasPermission(p));
  if (!hasAny) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
