import Link from "next/link";
import { hasCapability } from "@needleye/shared";
import { apiFetchServer } from "../../../lib/api/server";
import { Button } from "../../../components/ui/Button";
import { OrdersListClient } from "../../../features/orders/components/OrdersListClient";

export default async function OrdersPage() {
  const { profile } = await apiFetchServer("/auth/me");

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">Orders</h1>
          <p className="text-sm text-text-muted">
            Stat cards and the production Kanban board land in Phases 4 &amp; 5.
          </p>
        </div>
        {hasCapability(profile.role, "orders:create") && (
          <Link href="/orders/new">
            <Button>✦ Create New Order</Button>
          </Link>
        )}
      </div>
      <OrdersListClient role={profile.role} />
    </div>
  );
}
