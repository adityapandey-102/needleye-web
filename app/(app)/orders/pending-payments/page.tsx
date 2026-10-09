import { redirect } from "next/navigation";
import { hasCapability } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { ButtonLink } from "../../../../components/ui/Button";
import { PendingPaymentsClient } from "../../../../modules/orders/components/PendingPaymentsClient";
import { Icon } from "../../../../components/ui/Icon";

/**
 * Dedicated pending-payments page -- roles with payment visibility only
 * (payments:read; master_tailor has none). A focused table of orders with an
 * outstanding balance, filterable by due today / overdue / upcoming, no
 * dashboard stats. `?tab=today|overdue|upcoming` opens that tab (the
 * dashboard's Collect today and Payment overdue link here).
 */
export default async function PendingPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "payments:read")) {
    redirect("/orders");
  }
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : undefined;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Pending Payments</h1>
          <p className="text-sm text-text-muted">Orders with money still to collect, by payment due status.</p>
        </div>
        <ButtonLink href="/orders" variant="outline">
          <Icon name="chevron-right" size={16} className="rotate-180" />
          All Orders
        </ButtonLink>
      </div>
      {/* Keyed by the tab, so following a link to another tab of this page starts that tab afresh. */}
      <PendingPaymentsClient key={tab ?? ""} initialTab={tab} />
    </div>
  );
}
