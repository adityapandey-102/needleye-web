import { redirect } from "next/navigation";
import { greetingFor, hasCapability, SHOP_TIME_ZONE } from "../../../lib/domain";
import { apiFetchServer } from "../../../lib/api/server";
import { ButtonLink } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { OrdersListClient } from "../../../modules/orders/components/OrdersListClient";
import { DashboardOverview } from "../../../modules/orders/components/dashboard/DashboardOverview";
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
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: SHOP_TIME_ZONE }).format(new Date());

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-sm text-text-muted">
            {greetingFor(profile.fullName)} · {today}
          </p>
        </div>
        <div className="page-actions">
          {/* The delivery calendar with per-day order lists: owner and production manager. */}
          {(profile.role === "owner_manager" || profile.role === "production_manager") && <DeliveryCalendarButton />}
          {hasCapability(profile.role, "orders:create") && (
            <ButtonLink href="/orders/new">
              <Icon name="sparkles" size={16} /> Create New Order
            </ButtonLink>
          )}
        </div>
      </div>
      <DashboardOverview role={profile.role} />
      <OrdersListClient role={profile.role} initialBucket={bucket} />
    </div>
  );
}
