import { getAccessToken } from "../session/client";
import { isExpired } from "../session/jwt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/**
 * Ensures a usable access token. When the current one is missing/expired, the
 * refresh goes through the same-origin `/api/session/refresh` route -- which
 * reads the httpOnly refresh cookie server-side and rotates both cookies --
 * rather than the browser holding a refresh token itself. The new access
 * cookie is set by that route's response; we also use the returned token
 * directly to avoid a cookie-read race.
 */
async function ensureFreshAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isExpired(token)) return token;

  const response = await fetch("/api/session/refresh", { method: "POST" });
  if (!response.ok) return null;

  const data = (await response.json().catch(() => ({}))) as { accessToken?: string };
  return data.accessToken ?? getAccessToken();
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
