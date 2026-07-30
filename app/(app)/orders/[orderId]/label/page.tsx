import { notFound } from "next/navigation";
import { apiFetchServer, ApiError } from "../../../../../lib/api/server";
import { CustomerLabel } from "../../../../../modules/orders/components/CustomerLabel";

/**
 * Printable A4 customer/package label for a single order. Reuses the order
 * read endpoint (so row-scoping still applies -- a 404 means missing OR out of
 * scope). Renders only the label; the app chrome is `print:hidden`, so
 * printing this route emits a clean single sheet.
 */
export default async function OrderLabelPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { order } = await apiFetchServer(`/orders/${orderId}`).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  return <CustomerLabel order={order} qrUrl={`${process.env.NEXT_PUBLIC_WEB_APP_URL}/orders/${order.id}`} />;
}
