import { getCapabilityScope } from "../../../../lib/shared/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { OrderDetailView } from "../../../../features/orders/components/OrderDetailView";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [{ profile }, { order }] = await Promise.all([
    apiFetchServer("/auth/me"),
    apiFetchServer(`/orders/${orderId}`),
  ]);

  const isAssignedDesigner = profile.role === "designer" && order.designerId === profile.id;
  const contentScope = getCapabilityScope(profile.role, "orders:edit:customer_product_fields");
  const pricingScope = getCapabilityScope(profile.role, "orders:edit:pricing_assignment");
  const canEdit =
    contentScope === true ||
    pricingScope === true ||
    (contentScope === "assigned" && isAssignedDesigner) ||
    (pricingScope === "assigned" && isAssignedDesigner);

  const canSeePayment = getCapabilityScope(profile.role, "payments:read") !== false;

  return <OrderDetailView order={order} canEdit={canEdit} canSeePayment={canSeePayment} />;
}
