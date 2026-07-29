import { NextResponse } from "next/server";
import { getAccessToken, clearSession } from "../../../../lib/session/server";

/** Revokes the session server-side (best-effort) and clears both cookies. */
export async function POST() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    // The API's /auth/logout needs the bearer token; forward it and ignore the outcome.
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL!}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }).catch(() => {});
  }

  await clearSession();
  return new NextResponse(null, { status: 204 });
}
