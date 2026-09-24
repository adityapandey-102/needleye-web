import { redirect } from "next/navigation";
import { hasCapability } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { OrderForm } from "../../../../modules/orders/components/OrderForm";

export default async function NewOrderPage() {
  const { profile } = await apiFetchServer("/auth/me");

  if (!hasCapability(profile.role, "orders:create")) {
    redirect("/orders");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="page-title">Create New Product Order</h1>
        <p className="text-sm text-text-muted">Orders › New Order</p>
      </div>
      <OrderForm
        mode="create"
        canEditCustomerProduct
        canEditPricing
        currentUserId={profile.id}
        currentUserRole={profile.role}
      />
    </div>
  );
}
