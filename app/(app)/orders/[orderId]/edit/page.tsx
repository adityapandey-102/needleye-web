import { redirect } from "next/navigation";
import { getCapabilityScope } from "@needleye/shared";
import { apiFetchServer } from "../../../../../lib/api/server";
import { OrderForm } from "../../../../../features/orders/components/OrderForm";

export default async function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [{ profile }, { order }] = await Promise.all([
    apiFetchServer("/auth/me"),
    apiFetchServer(`/orders/${orderId}`),
  ]);

  const isAssignedDesigner = profile.role === "designer" && order.designerId === profile.id;

  const contentScope = getCapabilityScope(profile.role, "orders:edit:customer_product_fields");
  const pricingScope = getCapabilityScope(profile.role, "orders:edit:pricing_assignment");

  const canEditCustomerProduct = contentScope === true || (contentScope === "assigned" && isAssignedDesigner);
  const canEditPricing = pricingScope === true || (pricingScope === "assigned" && isAssignedDesigner);

  if (!canEditCustomerProduct && !canEditPricing) {
    redirect(`/orders/${orderId}`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-text-primary">Edit Order {order.orderNumber}</h1>
        <p className="text-sm text-text-muted">{order.customerName}</p>
      </div>
      <OrderForm
        mode="edit"
        order={order}
        canEditCustomerProduct={canEditCustomerProduct}
        canEditPricing={canEditPricing}
        currentUserId={profile.id}
        currentUserRole={profile.role}
      />
    </div>
  );
}
