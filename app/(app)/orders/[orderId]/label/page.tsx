import { notFound } from "next/navigation";
import { apiFetchServer, ApiError } from "../../../../../lib/api/server";
import { CustomerLabel } from "../../../../../modules/orders/components/CustomerLabel";

/**
 * Printable 8.5in x 2.75in package-box sticker for a single order. Reuses the order
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

  return <CustomerLabel order={order} />;
}
