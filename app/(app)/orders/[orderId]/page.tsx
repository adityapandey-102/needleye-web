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

  const canSeePayment = getCapabilityScope(profile.role, "payments:read") !== false;
  const paymentsManageScope = getCapabilityScope(profile.role, "payments:manage");
  const canManagePayments = paymentsManageScope === true || (paymentsManageScope === "assigned" && isAssignedDesigner);

  const designStageScope = getCapabilityScope(profile.role, "orders:status:design_stages");
  const productionStageScope = getCapabilityScope(profile.role, "orders:status:production_stages");
  const canChangeDesignStage = designStageScope === true || (designStageScope === "assigned" && isAssignedDesigner);
  const canChangeProductionStage = productionStageScope === true || (productionStageScope === "assigned" && isAssignedMasterTailor);

  return (
    <OrderDetailView
      order={order}
      canEdit={canEdit}
      canSeePayment={canSeePayment}
      canManagePayments={canManagePayments}
      canChangeDesignStage={canChangeDesignStage}
      canChangeProductionStage={canChangeProductionStage}
    />
  );
}
