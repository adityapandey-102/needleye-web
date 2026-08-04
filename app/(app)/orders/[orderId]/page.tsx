import { notFound } from "next/navigation";
import { getCapabilityScope } from "../../../../lib/domain";
import { apiFetchServer, ApiError } from "../../../../lib/api/server";
import { OrderDetailView } from "../../../../modules/orders/components/OrderDetailView";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [{ profile }, { order }] = await Promise.all([
    apiFetchServer("/auth/me"),
    // A 404 here means the order doesn't exist OR is outside the caller's row
    // scope (e.g. a Master Tailor opening an order assigned to someone else) --
    // the API returns 404, not 403, so existence isn't confirmed. Show the
    // clean not-found page instead of letting the Server Component crash.
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
  // only on their OWN orders; master never. So an authenticated "outsider"
  // viewing a non-assigned order (see below) never sees payments.
  const paymentsReadScope = getCapabilityScope(profile.role, "payments:read");
  const canSeePayment = paymentsReadScope === true || (paymentsReadScope === "assigned" && isAssignedDesigner);
  const paymentsManageScope = getCapabilityScope(profile.role, "payments:manage");
  const canManagePayments = paymentsManageScope === true || (paymentsManageScope === "assigned" && isAssignedDesigner);

  const designStageScope = getCapabilityScope(profile.role, "orders:status:design_stages");
  const productionStageScope = getCapabilityScope(profile.role, "orders:status:production_stages");
  const canChangeDesignStage = designStageScope === true || (designStageScope === "assigned" && isAssignedDesigner);
  const canChangeProductionStage = productionStageScope === true || (productionStageScope === "assigned" && isAssignedMasterTailor);

  // View-only: an authenticated user who isn't the owner/manager, accountant, or
  // this order's assigned designer/master. They can see the order (reached via
  // QR/link) but not payments, status changes, or edits -- all the can* flags
  // above are already false for them; this drives the read-only banner.
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
      canEdit={canEdit}
      canSeePayment={canSeePayment}
      canManagePayments={canManagePayments}
      canChangeDesignStage={canChangeDesignStage}
      canChangeProductionStage={canChangeProductionStage}
    />
  );
}
