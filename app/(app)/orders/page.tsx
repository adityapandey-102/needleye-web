import Link from "next/link";
import { redirect } from "next/navigation";
import { hasCapability } from "../../../lib/domain";
import { apiFetchServer } from "../../../lib/api/server";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { OrdersListClient } from "../../../modules/orders/components/OrdersListClient";
import { OrderStatCards } from "../../../modules/orders/components/OrderStatCards";
import { DeliveryCalendarButton } from "../../../modules/orders/components/DeliveryCalendarButton";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const { profile } = await apiFetchServer("/auth/me");
  // Workers have no dashboard -- send them to their scan landing.
  if (profile.role === "worker") redirect("/scan");
  const { bucket } = await searchParams;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-sm text-text-muted">An at-a-glance view of every order in your scope.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* The delivery calendar with per-day order lists: owner and production manager. */}
          {(profile.role === "owner_manager" || profile.role === "production_manager") && <DeliveryCalendarButton />}
          {hasCapability(profile.role, "orders:create") && (
            <Link href="/orders/new">
              <Button>
                <Icon name="sparkles" size={16} /> Create New Order
              </Button>
            </Link>
          )}
        </div>
      </div>
      <OrderStatCards role={profile.role} />
      <OrdersListClient role={profile.role} initialBucket={bucket} />
    </div>
  );
}
