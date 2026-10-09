import { redirect } from "next/navigation";
import { apiFetchServer } from "../../../../../lib/api/server";
import { ButtonLink } from "../../../../../components/ui/Button";
import { BucketOrdersClient } from "../../../../../modules/orders/components/BucketOrdersClient";
import { BUCKET_META, PAYMENT_TABS, bucketMeta, pendingPaymentsHref } from "../../../../../modules/orders/buckets";
import { Icon } from "../../../../../components/ui/Icon";

/**
 * A dedicated, focused view for one dashboard bucket -- just the filtered
 * table (no dashboard stats), reached by clicking a summary card. Payment
 * buckets are handled by the richer /orders/pending-payments page, so those
 * redirect there.
 */
export default async function OrderBucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  // Payment buckets open Pending payments on the tab that shows the same orders.
  if (PAYMENT_TABS.some((t) => t.bucket === bucket)) {
    redirect(pendingPaymentsHref(bucket));
  }
  // Unknown buckets fall back to the full orders list rather than an empty page.
  if (!BUCKET_META[bucket]) redirect("/orders");

  const { profile } = await apiFetchServer("/auth/me");
  const meta = bucketMeta(bucket);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{meta.title}</h1>
          <p className="text-sm text-text-muted">{meta.subtitle}</p>
        </div>
        <ButtonLink href="/orders" variant="outline">
          <Icon name="chevron-right" size={16} className="rotate-180" />
          All Orders
        </ButtonLink>
      </div>
      <BucketOrdersClient bucket={bucket} role={profile.role} />
    </div>
  );
}
