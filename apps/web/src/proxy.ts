/**
 * Strata — Edge Proxy
 *
 * Redirects unauthenticated users to /login.
 * Token presence is checked via the dao_token cookie or header.
 * Since we store the JWT in localStorage (not a cookie), the proxy
 * uses a lightweight approach: it checks a `dao_session` cookie that the
 * AuthProvider sets after login. This avoids reading localStorage at the edge.
 *
 * Alternatively, in demo/dev mode we skip the redirect to avoid
 * blocking seed-only usage.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Paths that never require authentication */
const PUBLIC_PATHS = ["/login", "/api", "/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Landing page is always public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth cookie (set by AuthProvider after login)
  const hasSession = request.cookies.get("dao_session")?.value === "1";

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
