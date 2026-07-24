import { getAccessToken, getRefreshToken, setSession, clearSession } from "../session/client";
import { isExpired } from "../session/jwt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/** Refreshes against needleye-api (never Supabase) if the current access token is missing or expired. */
async function ensureFreshAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isExpired(token)) return token;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = await response.json();
  setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

/** Browser-side fetch wrapper for the Express API -- attaches the current session's access token. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await ensureFreshAccessToken();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

/** Like apiFetch, but for multipart/form-data uploads -- no Content-Type header (the browser sets the boundary). */
export async function apiUpload(path: string, formData: FormData) {
  const token = await ensureFreshAccessToken();

  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: formData, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return response.json();
}
