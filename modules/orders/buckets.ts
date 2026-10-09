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
  all: { title: "All Orders", subtitle: "Every order, newest first" },
  active: { title: "Active Orders", subtitle: "Not yet delivered" },
  production: { title: "In Production", subtitle: "Falls / Kutchu → Alteration" },
  completed: { title: "Completed Orders", subtitle: "Delivered to the customer" },
  ready: { title: "Ready for Delivery", subtitle: "Finished, waiting for the customer" },
  delivered: { title: "Delivered Orders", subtitle: "Handed over to the customer" },
  delivered_this_month: { title: "Delivered This Month", subtitle: "Handed over since the 1st of this month" },
  overdue: { title: "Overdue Orders", subtitle: "Past their delivery due date" },
  urgent: { title: "Urgent Orders", subtitle: "Due within the next 3 days" },
  due_today: { title: "Deliver Today", subtitle: "Not yet delivered, and due for delivery today" },
  booked_today: { title: "Booked Today", subtitle: "Orders booked today" },
  this_month: { title: "Booked This Month", subtitle: "Orders created this calendar month" },
  not_priced: { title: "Price Not Set", subtitle: "Orders still waiting for their price — they can't take payments or be delivered" },
  // The dashboard pipeline's steps (the same stages each step counts).
  pipeline_design: { title: "Design", subtitle: "Design pending or approved" },
  pipeline_received: { title: "Received", subtitle: "With the production manager" },
  pipeline_production: { title: "On the Floor", subtitle: "Falls / Kutchu → Finishing" },
  pipeline_checks: { title: "Final Checks", subtitle: "Quality check · Alteration" },
};

/**
 * The payment buckets, each a tab of /orders/pending-payments, keyed by the
 * `?tab=` value that opens it there (the full list has no key). The dashboard
 * and the bucket page's redirect both link to a tab through this one map.
 */
export const PAYMENT_TABS = [
  { tab: "", bucket: "pending_payment", label: "All outstanding", short: "All" },
  { tab: "today", bucket: "payment_due_today", label: "Due today", short: "Due today" },
  { tab: "overdue", bucket: "payment_overdue", label: "Overdue", short: "Overdue" },
  { tab: "upcoming", bucket: "payment_upcoming", label: "Upcoming", short: "Upcoming" },
] as const;

export type PaymentTab = (typeof PAYMENT_TABS)[number];

/** The tab a `?tab=` value names; anything else (or nothing) is All outstanding. */
export function paymentTab(value: string | null | undefined): PaymentTab {
  return PAYMENT_TABS.find((t) => t.tab !== "" && t.tab === value) ?? PAYMENT_TABS[0];
}

/** The Pending payments page, opened on the tab that shows this payment bucket. */
export function pendingPaymentsHref(bucket: string): string {
  const tab = PAYMENT_TABS.find((t) => t.bucket === bucket)?.tab;
  return tab ? `/orders/pending-payments?tab=${tab}` : "/orders/pending-payments";
}

export function bucketMeta(bucket: string): BucketMeta {
  return BUCKET_META[bucket] ?? { title: "Filtered Orders", subtitle: "Matching your selection" };
}
