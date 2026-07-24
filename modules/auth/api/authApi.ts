import { apiFetch } from "../../../lib/api/client";
import { setSession, clearSession } from "../../../lib/session/client";
import type { Profile } from "../../../lib/domain";

export interface BootstrapPayload {
  email: string;
  password: string;
  fullName: string;
}

interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  profile: Profile;
}

/**
 * All HTTP calls the Auth module makes against needleye-api, in one place --
 * components never call apiFetch or Supabase directly. login/logout are the
 * only calls here with a side effect beyond the request itself: they own
 * writing/clearing the session cookies (lib/session/client) that every other
 * API call reads.
 */
export const authApi = {
  bootstrapStatus(): Promise<{ ownerExists: boolean }> {
    return apiFetch("/auth/bootstrap-status");
  },

  bootstrap(payload: BootstrapPayload): Promise<{ ok: true }> {
    return apiFetch("/auth/bootstrap", { method: "POST", body: JSON.stringify(payload) });
  },

  async login(payload: { email: string; password: string }): Promise<AuthSessionResponse> {
    const session: AuthSessionResponse = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  },

  async logout(): Promise<void> {
    // Best-effort revoke server-side -- the local session is cleared regardless of the outcome.
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
  },

  requestPasswordReset(payload: { email: string }): Promise<void> {
    return apiFetch("/auth/password-reset-request", { method: "POST", body: JSON.stringify(payload) });
  },

  /** Only used by the /auth/callback page, for a project configured for PKCE (a `?code=` link) rather than the implicit flow. */
  async exchangeCode(payload: { code: string }): Promise<AuthSessionResponse> {
    const session: AuthSessionResponse = await apiFetch("/auth/exchange-code", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  },

  updatePassword(payload: { newPassword: string }): Promise<void> {
    return apiFetch("/auth/password-update", { method: "POST", body: JSON.stringify(payload) });
  },

  /** Master Tailor QR login -- the token comes from the ?token= query param on the scanned QR's URL. */
  async qrLogin(payload: { token: string }): Promise<AuthSessionResponse> {
    const session: AuthSessionResponse = await apiFetch("/auth/qr-login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  },
};
