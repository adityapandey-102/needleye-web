import { notFound } from "next/navigation";
import { getCapabilityScope, hasCapability } from "../../../../lib/domain";
import { apiFetchServer, ApiError } from "../../../../lib/api/server";
import { OrderDetailView } from "../../../../modules/orders/components/OrderDetailView";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ scan?: string }>;
}) {
  const { orderId } = await params;
  // A QR scan opens this page with `?scan=1`; opening it from the dashboard,
  // search, or table has no such param. Only the scan flow shows the proactive
  // "product received for X" status popup (see StatusAdvancePrompt).
  const viaScan = (await searchParams).scan === "1";

  const [{ profile }, { order }] = await Promise.all([
    apiFetchServer("/auth/me"),
    // A 404 here means the order doesn't exist OR is outside the caller's row
    // scope -- the API returns 404, not 403, so existence isn't confirmed. Show
    // the clean not-found page instead of letting the Server Component crash.
    apiFetchServer(`/orders/${orderId}`).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
  ]);

  const isAssignedDesigner = profile.role === "designer" && order.designerId === profile.id;
  const isAssignedMasterTailor = profile.role === "master_tailor" && order.masterTailorId === profile.id;
  const contentScope = getCapabilityScope(profile.role, "orders:edit:customer_product_fields");
  const pricingScope = getCapabilityScope(profile.role, "orders:edit:pricing_assignment");
  const canEdit =
    contentScope === true ||
    pricingScope === true ||
    (contentScope === "assigned" && isAssignedDesigner) ||
    (pricingScope === "assigned" && isAssignedDesigner);

  // Payment visibility is scope-aware: owner/accountant on any order; a designer
  // only on their OWN orders; master/worker/PM never.
  const paymentsReadScope = getCapabilityScope(profile.role, "payments:read");
  const canSeePayment = paymentsReadScope === true || (paymentsReadScope === "assigned" && isAssignedDesigner);
  const paymentsManageScope = getCapabilityScope(profile.role, "payments:manage");
  const canManagePayments = paymentsManageScope === true || (paymentsManageScope === "assigned" && isAssignedDesigner);

  // Status changes are gated purely by role tier (no assignment) -- whoever
  // receives the garment on the floor can advance it. The specific stages a
  // role may set (and forward-only) are decided in OrderStatusControl /
  // StatusAdvancePrompt from `role`.
  const canChangeStatus =
    hasCapability(profile.role, "orders:status:design") ||
    hasCapability(profile.role, "orders:status:pm_received") ||
    hasCapability(profile.role, "orders:status:production") ||
    hasCapability(profile.role, "orders:status:finalization");

  // View-only: an authenticated user who isn't the owner/manager, accountant, or
  // this order's assigned designer/master -- they see the order (via QR/link)
  // but not payments, edits, or the detailed status-history feed. Note: the
  // status *control* is NOT gated by this; a production worker scanning an
  // unassigned order must still be able to advance its stage.
  const viewOnly =
    profile.role !== "owner_manager" &&
    profile.role !== "accountant" &&
    !isAssignedDesigner &&
    !isAssignedMasterTailor;

  return (
    <OrderDetailView
      order={order}
      role={profile.role}
      viewOnly={viewOnly}
      viaScan={viaScan}
      canEdit={canEdit}
      canSeePayment={canSeePayment}
      canManagePayments={canManagePayments}
      canChangeStatus={canChangeStatus}
    />
  );
}
