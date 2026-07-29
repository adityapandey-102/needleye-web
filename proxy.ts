import type { NextRequest } from "next/server";
import { updateSession } from "./lib/session/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets, Next internals, and the
     * /api/* route handlers -- the latter own the session cookies themselves
     * (see app/api/session/*), so the proxy must not intercept and redirect
     * them as if they were protected pages.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
