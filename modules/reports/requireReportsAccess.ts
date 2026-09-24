import { redirect } from "next/navigation";
import { hasCapability } from "../../lib/domain";
import { apiFetchServer } from "../../lib/api/server";

/**
 * Server-side gate for every /reports page: owner_manager only
 * (reports:staff). Anyone else is sent to /orders. The API enforces the same
 * rule on every /reports endpoint -- this just keeps them off the page.
 */
export async function requireReportsAccess(): Promise<void> {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "reports:staff")) {
    redirect("/orders");
  }
}
