import Link from "next/link";
import { hasCapability } from "../../../lib/domain";
import { apiFetchServer } from "../../../lib/api/server";
import { Button } from "../../../components/ui/Button";
import { OrdersListClient } from "../../../modules/orders/components/OrdersListClient";
import { OrderStatCards } from "../../../modules/orders/components/OrderStatCards";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const { profile } = await apiFetchServer("/auth/me");
  const { bucket } = await searchParams;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">Orders</h1>
          <p className="text-sm text-text-muted">An at-a-glance view of every order in your scope.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasCapability(profile.role, "reports:staff") && (
            <Link href="/orders/staff-report">
              <Button variant="outline">📊 Staff Report</Button>
            </Link>
          )}
          {hasCapability(profile.role, "orders:create") && (
            <Link href="/orders/new">
              <Button>✦ Create New Order</Button>
            </Link>
          )}
        </div>
      </div>
      <OrderStatCards role={profile.role} />
      <OrdersListClient role={profile.role} userId={profile.id} initialBucket={bucket} />
    </div>
  );
}
