import { redirect } from "next/navigation";
import { getCapabilityScope, type Profile } from "../../lib/domain";
import { apiFetchServer } from "../../lib/api/server";

/**
 * Server-side gate for the /leads pages: the owner (every lead) and designers
 * (their own). Anyone else is sent to /orders; `ownerOnly` pages (adding a
 * lead) send designers back to /leads. The API enforces the same on every call.
 */
export async function requireLeadsAccess({ ownerOnly = false } = {}): Promise<{ profile: Profile; isOwner: boolean }> {
  const { profile } = (await apiFetchServer("/auth/me")) as { profile: Profile };
  if (getCapabilityScope(profile.role, "leads:read") === false) redirect("/orders");
  const isOwner = getCapabilityScope(profile.role, "leads:manage") === true;
  if (ownerOnly && !isOwner) redirect("/leads");
  return { profile, isOwner };
}
