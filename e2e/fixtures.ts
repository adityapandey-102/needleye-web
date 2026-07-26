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

export async function createFixtureStaff(ownerToken: string, role: "designer" | "master_tailor", label: string): Promise<FixtureUser> {
  const stamp = Date.now();
  const email = `e2e-${role}-${stamp}-${Math.random().toString(36).slice(2, 6)}@needleeye.test`;
  const { userId, password } = await apiRequest<{ userId: string; password: string }>("/users", {
    method: "POST",
    token: ownerToken,
    body: JSON.stringify({ email, fullName: `E2E ${label}`, role }),
  });
  return { email, password, id: userId };
}
