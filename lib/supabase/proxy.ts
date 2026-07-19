import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Reachable without a session, and where an *existing* session should bounce
 * the user onward to /orders instead of showing the page (e.g. an already
 * logged-in user hitting /login).
 *
 * /update-password is intentionally NOT here: it's reached via a Supabase
 * "recovery" session set right after the reset-password email link is
 * followed, so a present `user` there must NOT trigger the authenticated
 * redirect the way login/register do -- it needs to render normally so the
 * user can actually set a new password.
 */
const UNAUTHENTICATED_PATHS = ["/login", "/register", "/reset-password", "/auth/callback"];

/** Reachable without a session at all (superset of UNAUTHENTICATED_PATHS). */
const NO_SESSION_REQUIRED_PATHS = [...UNAUTHENTICATED_PATHS, "/update-password"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated users away from the app shell. Named for Next.js 16's
 * proxy.ts convention (formerly middleware.ts) -- see root proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const noSessionRequired = NO_SESSION_REQUIRED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthOnlyPath = UNAUTHENTICATED_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !noSessionRequired) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  return response;
}
