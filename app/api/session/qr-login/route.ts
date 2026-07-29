import { NextResponse, type NextRequest } from "next/server";
import { postToAuthApi } from "../../../../lib/session/api-proxy";
import { setSession } from "../../../../lib/session/server";

/** Master Tailor QR login, proxied server-side so the refresh token is set httpOnly. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const { status, data } = await postToAuthApi("/auth/qr-login", { token: body.token }, request);

  if (status !== 200) {
    return NextResponse.json({ error: data.error ?? "QR login failed", code: data.code }, { status });
  }

  await setSession({ accessToken: String(data.accessToken), refreshToken: String(data.refreshToken) });
  return NextResponse.json({ profile: data.profile });
}
