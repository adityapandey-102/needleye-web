/**
 * Dashboard "bucket" metadata -- the filtered views the summary cards deep-link
 * into. Titles/subtitles are shared by the dedicated bucket page and any filter
 * banners so a card and the page it opens always describe the same thing. The
 * bucket VALUES themselves match the API's bucketCondition (see
 * needleye-api drizzle-orders.repository.ts).
 */
export interface BucketMeta {
  title: string;
  subtitle: string;
}

/** Generic order buckets rendered by /orders/bucket/[bucket]. Payment buckets live on the dedicated /orders/pending-payments page instead. */
export const BUCKET_META: Record<string, BucketMeta> = {
  active: { title: "Active Orders", subtitle: "Not yet delivered" },
  production: { title: "In Production", subtitle: "Cutting → Quality Check" },
  completed: { title: "Completed Orders", subtitle: "Ready for delivery or delivered" },
  ready: { title: "Ready for Delivery", subtitle: "Finished, awaiting handover" },
  delivered: { title: "Delivered Orders", subtitle: "Handed over to the customer" },
  overdue: { title: "Overdue Orders", subtitle: "Past their delivery due date" },
  urgent: { title: "Urgent Orders", subtitle: "Due within the next 3 days" },
  this_month: { title: "Booked This Month", subtitle: "Orders created this calendar month" },
};

export function bucketMeta(bucket: string): BucketMeta {
  return BUCKET_META[bucket] ?? { title: "Filtered Orders", subtitle: "Matching your selection" };
}
