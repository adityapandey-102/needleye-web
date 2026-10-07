import { redirect } from "next/navigation";
import { hasCapability, type LeadDetail } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { OrderForm } from "../../../../modules/orders/components/OrderForm";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  const { profile } = await apiFetchServer("/auth/me");

  if (!hasCapability(profile.role, "orders:create")) {
    redirect("/orders");
  }

  // "Create an order for this lead" (from a lead's Converted button): pre-fill
  // the customer. A lead the user can't see (or a bad id) just opens a blank form.
  const { leadId } = await searchParams;
  let fromLead: { id: string; leadNumber: string; customerName: string; phone: string; requirement: string } | undefined;
  if (leadId && /^[0-9a-f-]{36}$/i.test(leadId) && hasCapability(profile.role, "leads:read")) {
    const detail = (await apiFetchServer(`/leads/${leadId}`).catch(() => null)) as LeadDetail | null;
    if (detail?.actions.canConvert) {
      const { lead } = detail;
      fromLead = { id: lead.id, leadNumber: lead.leadNumber, customerName: lead.customerName, phone: lead.phone, requirement: lead.requirement };
    }
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
        fromLead={fromLead}
      />
    </div>
  );
}
