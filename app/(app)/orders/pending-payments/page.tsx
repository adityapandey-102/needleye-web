import Link from "next/link";
import { redirect } from "next/navigation";
import { hasCapability } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { Button } from "../../../../components/ui/Button";
import { PendingPaymentsClient } from "../../../../modules/orders/components/PendingPaymentsClient";
import { Icon } from "../../../../components/ui/Icon";

/**
 * Dedicated pending-payments page -- roles with payment visibility only
 * (payments:read; master_tailor has none). A focused table of orders with an
 * outstanding balance, filterable by overdue / upcoming, no dashboard stats.
 */
export default async function PendingPaymentsPage() {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "payments:read")) {
    redirect("/orders");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Pending Payments</h1>
          <p className="text-sm text-text-muted">Orders with money still to collect, by payment due status.</p>
        </div>
        <Link href="/orders">
          <Button variant="outline">
            <Icon name="chevron-right" size={16} className="rotate-180" />
            All Orders
          </Button>
        </Link>
      </div>
      <PendingPaymentsClient />
    </div>
  );
}
