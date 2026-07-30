import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetchServer } from "../../../../../lib/api/server";
import { Button } from "../../../../../components/ui/Button";
import { BucketOrdersClient } from "../../../../../modules/orders/components/BucketOrdersClient";
import { BUCKET_META, bucketMeta } from "../../../../../modules/orders/buckets";

/**
 * A dedicated, focused view for one dashboard bucket -- just the filtered
 * table (no dashboard stats), reached by clicking a summary card. Payment
 * buckets are handled by the richer /orders/pending-payments page, so those
 * redirect there.
 */
export default async function OrderBucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  if (["pending_payment", "payment_overdue", "payment_upcoming"].includes(bucket)) {
    redirect("/orders/pending-payments");
  }
  // Unknown buckets fall back to the full orders list rather than an empty page.
  if (!BUCKET_META[bucket]) redirect("/orders");

  const { profile } = await apiFetchServer("/auth/me");
  const meta = bucketMeta(bucket);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">{meta.title}</h1>
          <p className="text-sm text-text-muted">{meta.subtitle}</p>
        </div>
        <Link href="/orders">
          <Button variant="outline">← All Orders</Button>
        </Link>
      </div>
      <BucketOrdersClient bucket={bucket} role={profile.role} />
    </div>
  );
}
