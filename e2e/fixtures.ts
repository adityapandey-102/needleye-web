/**
 * Provisions real fixture accounts against the real needleye-api (no
 * mocking -- see needleye-api's CLAUDE.md: E2E only for critical
 * workflows, and those workflows are meaningless if the backend is faked).
 * Mirrors the same pattern needleye-api/tests/rbac-matrix.mjs already
 * uses: log in as an existing Owner/Manager, create throwaway staff
 * accounts through the real `/users` endpoint.
 */
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:4000/api/v1";

export interface FixtureUser {
  email: string;
  password: string;
  id: string;
}

async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function loginAsOwner(): Promise<string> {
  const email = process.env.E2E_OWNER_EMAIL ?? "owner@needleeye.test";
  const password = process.env.E2E_OWNER_PASSWORD;
  if (!password) {
    throw new Error(
      "Set E2E_OWNER_PASSWORD to an existing owner_manager account's password before running the E2E suite " +
        "(run `npm run seed` in needleye-api first and use the printed Owner/Manager password).",
    );
  }
  const { accessToken } = await apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return accessToken;
}

export type FixtureRole = "designer" | "master_tailor" | "accountant" | "production_manager" | "worker" | "owner_manager";

export async function createFixtureStaff(ownerToken: string, role: FixtureRole, label: string): Promise<FixtureUser> {
  const stamp = Date.now();
  const email = `e2e-${role}-${stamp}-${Math.random().toString(36).slice(2, 6)}@needleeye.test`;
  const { userId, password } = await apiRequest<{ userId: string; password: string }>("/users", {
    method: "POST",
    token: ownerToken,
    body: JSON.stringify({ email, fullName: `E2E ${label}`, role }),
  });
  return { email, password, id: userId };
}

/**
 * A delivery due date no other run has used: a day in the ten years from
 * `startYear` (default 2040–2049) picked from
 * the current second. Orders count against their due date's delivery
 * capacity (10 a day by default), so a fixed date would fill up after a few
 * runs and every later create would hit 409 DELIVERY_DAY_FULL. Far enough
 * out to stay clear of real bookings and of rbac-matrix.mjs's 2032–2041 range;
 * a spec that deliberately fills a day uses its own decade (2050+).
 */
export function uniqueDueDate(startYear = 2040): string {
  const day = Math.floor(Date.now() / 1000) % 3650;
  return new Date(Date.UTC(startYear, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);
}

/** POST/GET against the API as someone, for test setup. */
export async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, { ...init, token });
}
