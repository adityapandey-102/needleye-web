import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_MAX_AGE_ACCESS,
  COOKIE_MAX_AGE_REFRESH,
} from "./constants";
import { isExpired } from "./jwt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/**
 * Reachable without a session, and where an *existing* session should bounce
 * the user onward to /orders instead of showing the page (e.g. an already
 * logged-in user hitting /login).
 *
 * /update-password is intentionally NOT here: it's reached right after the
 * reset-password email link is exchanged for a session via /auth/callback,
 * so a present session there must NOT trigger the authenticated redirect
 * the way login/register do -- it needs to render normally so the user can
 * actually set a new password.
 */
const UNAUTHENTICATED_PATHS = ["/login", "/register", "/reset-password", "/auth/callback"];

/**
 * Reachable without a session at all (superset of UNAUTHENTICATED_PATHS).
 * /qr-login is here but NOT in UNAUTHENTICATED_PATHS: scanning a Master
 * Tailor's QR is an explicit intent to switch identity, so an existing
 * session (e.g. a shop tablet still logged in as someone else) must not
 * bounce away before the page can process the token and switch sessions.
 */
const NO_SESSION_REQUIRED_PATHS = [...UNAUTHENTICATED_PATHS, "/update-password", "/qr-login"];

type Tokens = { accessToken: string; refreshToken: string };

/**
 * Refreshes the session cookies (against needleye-api, never Supabase
 * directly) on every request and redirects unauthenticated users away from
 * the app shell. Named for Next.js 16's proxy.ts convention (formerly
 * middleware.ts) -- see root proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const noSessionRequired = NO_SESSION_REQUIRED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthOnlyPath = UNAUTHENTICATED_PATHS.some((path) => pathname.startsWith(path));

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  let refreshedTokens: Tokens | null = null;

  if ((!accessToken || isExpired(accessToken)) && refreshToken) {
    refreshedTokens = await refreshSession(refreshToken);
    accessToken = refreshedTokens?.accessToken ?? null;
  }

  const authenticated = Boolean(accessToken && !isExpired(accessToken));

  if (!authenticated && !noSessionRequired) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  if (authenticated && isAuthOnlyPath) {
    return applyTokens(NextResponse.redirect(new URL("/orders", request.url)), refreshedTokens);
  }

  return applyTokens(NextResponse.next({ request }), refreshedTokens);
}

async function refreshSession(refreshToken: string): Promise<Tokens | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

function applyTokens(response: NextResponse, tokens: Tokens | null) {
  if (!tokens) return response;

  const secure = process.env.NODE_ENV === "production";
  // Access token stays readable by browser JS (Bearer header on direct API
  // calls); refresh token is httpOnly so JS can never read it. Mirrors the
  // cookie flags in lib/session/server.ts.
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_ACCESS,
    httpOnly: false,
    sameSite: "lax",
    secure,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_REFRESH,
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
  return response;
}
