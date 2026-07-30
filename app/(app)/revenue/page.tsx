import { redirect } from "next/navigation";
import { hasCapability } from "../../../lib/domain";
import { apiFetchServer } from "../../../lib/api/server";
import { RevenueClient } from "../../../modules/revenue/components/RevenueClient";

/**
 * Financial reporting dashboard -- owner_manager / accountant only
 * (reports:financial). Server-guards the route, then hands off to the
 * client component that fetches the stats + monthly revenue report.
 */
export default async function RevenuePage() {
  const { profile } = await apiFetchServer("/auth/me");

  if (!hasCapability(profile.role, "reports:financial")) {
    redirect("/orders");
  }

  return <RevenueClient />;
}
