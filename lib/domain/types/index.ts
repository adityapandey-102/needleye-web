import type { Role } from "../constants/roles";
import type { GranularStatus } from "../constants/orderStatus";
import type { ProductCategory, PaymentStatus, PaymentMethod } from "../constants/productCategories";
import type { LeadSource, LeadStatus } from "../constants/leads";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface OrderImage {
  id: string;
  orderId: string;
  slot: 1 | 2 | 3 | 4;
  storagePath: string;
  url: string;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  status: GranularStatus;
  label: string | null;
  changedBy: string | null;
  changedByName?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  /** Money as a 2dp string (see lib/domain/utils/money.ts). */
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  recordedBy: string | null;
  recordedByName?: string;
  notes: string | null;
  createdAt: string;
  /** Dated in a month whose books are closed: it can't be edited or removed (ADR 0008 phase 5). */
  monthClosed: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  billNumber: string;
  bookingDate: string;
  dueDate: string;
  designerId: string;
  designerName?: string;
  masterTailorId: string;
  masterTailorName?: string;
  productCategory: ProductCategory;
  orderDetails: string;
  handWork: boolean;
  machineWork: boolean;
  purchaseRequired: boolean;
  /** Absent when the API strips it server-side for a role without payments:read (master_tailor) -- not just hidden in the UI. */
  paymentStatus?: PaymentStatus;
  // Money as 2dp strings (see lib/domain/utils/money.ts). totalAmount and
  // outstanding are null while the order has no price (ADR 0008).
  totalAmount?: string | null;
  amountPaid?: string;
  outstanding?: string | null;
  /** Whether the order has a price -- sent to EVERY role (it's not an amount). */
  priceSet: boolean;
  productionStatus: GranularStatus;
  designerInstructions: string | null;
  specialNotes: string | null;
  /** Date the next payment is expected (payment-due tracking); null when unset or fully paid. */
  nextPaymentDate: string | null;
  images: OrderImage[];
  /** Optimistic-lock version -- echoed back when editing so a concurrent edit is rejected (ORDER_MODIFIED) instead of clobbered. */
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A row of GET /orders: an Order without `images` (lists never show photos, so
 * the API skips loading and signing them). Open the order for its images.
 */
export type OrderListItem = Omit<Order, "images">;

/**
 * GET /orders/delivery-load -- orders due per day (shop-wide), plus the
 * thresholds the calendar colours by. A day missing from `days` has 0.
 */
export interface DeliveryLoad {
  capacity: number;
  nearCapacity: number;
  days: { date: string; count: number }[];
}

export interface OrderStats {
  total: number;
  active: number;
  /** Every delivered order ever (deprecated in the API; the dashboard shows deliveredThisMonth). */
  completed: number;
  /** Reached Delivered since the 1st of this month (shop timezone). */
  deliveredThisMonth: number;
  /** In Ready now -- finished, waiting for the customer. */
  ready: number;
  thisMonth: number;
  inProduction: number;
  overdue: number;
  urgent: number;
  /** Absent entirely (not zero) when the API strips it server-side for a role without payments:read (master_tailor). */
  pendingPayments?: number;
  /** Orders with no price yet. Absent like pendingPayments. */
  notPriced?: number;
  // Money as 2dp strings.
  collectedRevenue?: string;
  outstandingRevenue?: string;
  /** Orders not yet delivered, by pipeline group (they add up to `active`). */
  pipeline?: { design: number; received: number; production: number; checks: number; ready: number };
}

/**
 * "set" = the first price; "correction" = any later change, up or down (Owner /
 * Accountant, with a reason). "raise" / "discount" only appear on older history
 * rows from before discounts were dropped -- they read as corrections too.
 */
export type PriceChangeKind = "set" | "correction" | "raise" | "discount";

/** The two price changes that can be made now (what PUT /orders/:id/price records). */
export type PriceAction = "set" | "correction";

/** One row of an order's price history (GET /orders/:id/price-history). */
export interface PriceChange {
  id: string;
  orderId: string;
  kind: PriceChangeKind;
  previousTotal: string | null;
  newTotal: string;
  collected: string;
  reason: string | null;
  changedBy: string | null;
  changedByName: string | null;
  createdAt: string;
}

// -- Revenue (GET /ledger/*, reports:financial) -- needleye-api ADR 0008 phase 4 --

/** A period's ledger figures (a month, or a whole range). Money as 2dp strings. */
export interface LedgerFigures {
  ordersBooked: number;
  /** Booked orders without a price yet (not in `total`). */
  ordersNotPriced: number;
  /** Value of the orders booked in the period (as priced now). */
  total: string;
  /** Paid so far, on any date, on those orders. */
  paidSoFar: string;
  /** total - paidSoFar. */
  outstanding: string;
  /** Money received in the period, from any order. */
  cashCollected: string;
  paymentsCount: number;
}

/** A month's books (ADR 0008 phase 5). */
export interface LedgerMonthBooks {
  /** closed: no payment dated in the month can be added, edited or removed. */
  status: "open" | "closed";
  /** The month has ended, so it can be closed (this month never has). */
  ended: boolean;
  /** The latest close (closed only). */
  closedAt: string | null;
  closedByName: string | null;
}

export interface LedgerMonth extends LedgerFigures {
  /** YYYY-MM -- always a calendar month. */
  month: string;
  books: LedgerMonthBooks;
}

/** One close or reopen of a month. */
export interface LedgerClosing {
  id: string;
  month: string;
  action: "closed" | "reopened";
  /** The month's figures at closing -- the closing record (closed only). */
  figures: LedgerFigures | null;
  /** Why it was reopened (reopened only). */
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

/** GET /ledger/months/:month/closings */
export interface LedgerMonthClosings {
  month: string;
  books: LedgerMonthBooks;
  /** The month's figures now -- compare with the closing record. */
  figuresNow: LedgerFigures;
  /** Closes and reopens, newest first (at most 50). */
  history: LedgerClosing[];
  total: number;
}

/** One run of the check: the register against a recount of every order and payment. */
export interface LedgerReconciliation {
  id: string;
  kind: "nightly" | "manual";
  requestedByName: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "verified" | "problems";
  daysChecked: number;
  mismatchedDays: number;
  /** Up to 50 mismatched days, newest first. */
  mismatches: { day: string; fields: { field: string; register: string; actual: string }[] }[];
  overpaidOrders: number;
  statusMismatches: number;
  closedMonthDrift: number;
  closedMonths: { month: string; closedCash: string; cashNow: string; closedPayments: number; paymentsNow: number }[];
}

/** GET /ledger/reconciliations/latest, POST /ledger/reconciliations */
export interface LedgerVerification {
  timeZone: string;
  latest: LedgerReconciliation | null;
  lastNightlyAt: string | null;
  /** Over 26 hours since the last nightly check -- the schedule has stopped. */
  nightlyOverdue: boolean;
}

/** GET /ledger/summary -- this month's cards. */
export interface LedgerSummary {
  month: string;
  /** The shop's today (YYYY-MM-DD). */
  asOf: string;
  timeZone: string;
  figures: LedgerFigures;
}

/** GET /ledger/months -- one page of a range, newest month first, with the range's totals. */
export interface LedgerMonthsPage {
  from: string;
  to: string;
  months: LedgerMonth[];
  /** Months in the range. */
  total: number;
  limit: number;
  offset: number;
  totals: LedgerFigures;
}

/** GET /ledger/months/export -- every month of a range (at most 240). */
export interface LedgerMonthsExport {
  from: string;
  to: string;
  timeZone: string;
  months: LedgerMonth[];
  totals: LedgerFigures;
}

/** One designer/master-tailor's monthly cohort board (orders booked that month) — GET /orders/staff-report. */
export interface StaffReportSummary {
  booked: number;
  active: number;
  inProduction: number;
  completed: number;
  overdue: number;
  urgent: number;
  paymentPendingCount: number;
  /** Money as a 2dp string. */
  paymentPendingAmount: string;
}

/** One week's throughput point for the staff report graph (Monday-started, oldest first). */
export interface StaffWeeklyPoint {
  weekStart: string;
  booked: number;
  completed: number;
}

export interface StaffReport {
  staff: { id: string; fullName: string; role: "designer" | "master_tailor" };
  summary: StaffReportSummary;
  /** The selected month's weeks (Monday-started, oldest first, zero-filled). */
  weekly: StaffWeeklyPoint[];
  /** The month the weekly breakdown covers, YYYY-MM. */
  month: string;
}

/** A payment's {amount, method} snapshot within a ledger event. */
export interface LedgerAmountSnapshot {
  /** Money as a 2dp string. */
  amount: string;
  method: string;
  /** The payment's date (YYYY-MM-DD). Absent from an API older than ADR 0008 phase 3. */
  paidAt?: string;
}

/** One payment-ledger activity event — GET /orders/ledger-events (reports:financial). */
export interface LedgerEvent {
  id: string;
  /** created = payment recorded, updated = edited, deleted = removed. */
  action: "created" | "updated" | "deleted";
  /** ISO-8601 UTC timestamp of the event. */
  at: string;
  /** Who did it (null if that account was since removed). */
  actorName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  /** created/deleted: the payment's amount+method. */
  snapshot?: LedgerAmountSnapshot;
  /** updated: values before the edit. */
  before?: LedgerAmountSnapshot;
  /** updated: values after the edit. */
  after?: LedgerAmountSnapshot;
}

/** Paginated ledger-activity feed envelope. */
export interface LedgerEventsResult {
  events: LedgerEvent[];
  total: number;
  limit: number;
  offset: number;
  from: string;
  to: string;
}

/** GET /orders/ledger-events/export -- one whole week/month, plus the shop timezone to show times in. */
export interface LedgerExportResult extends LedgerEventsResult {
  timeZone: string;
}

export interface TimelineSummary {
  statusLabel: "ON TRACK" | "DUE SOON" | "URGENT" | "OVERDUE" | "DELIVERED" | "N/A";
  tone: "green" | "amber" | "red" | "dark-red" | "gray";
  daysRemainingLabel: string;
  orderAgeLabel: string;
  remainingDays: number | null;
}

/** Owner Reports: who is Working vs Idle -- GET /reports/staff-activity. */
export type TrackedStaffRole = "designer" | "master_tailor" | "production_manager" | "worker";

export interface StaffActivityRow {
  id: string;
  fullName: string;
  role: TrackedStaffRole;
  status: "working" | "idle";
  /** Undelivered orders that make them Working. */
  openOrders: number;
  /** ISO-8601 UTC of the latest qualifying event (order created / stage move), or null. */
  lastWorkAt: string | null;
  /** ISO-8601 UTC of their latest audited action of any kind, or null. */
  lastSeenAt: string | null;
}

/** One page of GET /reports/staff-activity (searched, filtered and paged by the API). */
export interface StaffActivity {
  /** Look-back windows in days: designers by orders created, everyone else by stage moves. */
  windows: { designerDays: number; floorDays: number };
  /** Working / Idle across the search + role filter (ignores the status filter) -- the summary tiles. */
  counts: { working: number; idle: number };
  /** This page. */
  staff: StaffActivityRow[];
  /** Rows matching every filter. */
  total: number;
  limit: number;
  offset: number;
}

/** GET /reports/activity-days -- the 7 days the feed covers (shop timezone), newest first. */
export interface ActivityDays {
  timeZone: string;
  today: string;
  days: string[];
}

/** The daily activity feed's tabs -- each one its own log (needleye-api ADR 0008). */
export type ActivityCategory = "orders" | "stages" | "payments" | "leads" | "accounts";

/** One event in the owner's daily activity feed. */
export interface ActivityEvent {
  id: string;
  category: ActivityCategory;
  /** order.created, order.updated, price.raise, stage.moved, payment.updated, lead.assigned, auth.login, ... */
  kind: string;
  /** ISO-8601 UTC. */
  at: string;
  actorName: string | null;
  actorRole: string | null;
  orderId: string | null;
  orderNumber: string | null;
  leadId: string | null;
  leadNumber: string | null;
  targetName: string | null;
  /** The category's facts (an edit's changes, a price's before/after and reason, a stage's from/to...). */
  details: Record<string, unknown> | null;
}

/** GET /reports/activity -- one page of one category of one day, with every category's count. */
export interface ActivityDay {
  day: string;
  timeZone: string;
  category: ActivityCategory;
  counts: Record<ActivityCategory, number>;
  events: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

// -- Leads (GET/POST /leads*, the public enquiry form) -- docs: needleye-api docs/adr/0007 --

export interface Lead {
  id: string;
  leadNumber: string;
  customerName: string;
  /** 10-digit Indian mobile. */
  phone: string;
  requirement: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  /** A repeat enquiry not yet contacted. */
  urgent: boolean;
  enquiryCount: number;
  firstEnquiryAt: string;
  lastEnquiryAt: string;
  /** YYYY-MM-DD while in follow-up. */
  followUpOn: string | null;
  lostReason: string | null;
  convertedOrderId: string | null;
  convertedOrderNumber: string | null;
  createdBy: string | null;
  createdByName: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadComment {
  id: string;
  leadId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  actorId: string | null;
  /** Null = the public enquiry form. */
  actorName: string | null;
  kind: "created" | "enquiry_merged" | "assigned" | "status_changed" | "converted";
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  assignedTo: string | null;
  assignedToName: string | null;
  note: string | null;
  createdAt: string;
}

/** GET /leads/:id */
export interface LeadDetail {
  lead: Lead;
  comments: LeadComment[];
  events: LeadEvent[];
  /** Owner only: other leads from the same phone. */
  samePhone: Pick<Lead, "id" | "leadNumber" | "status" | "createdAt">[];
  /** What the signed-in person may do next -- the page shows only these. */
  actions: { nextStatuses: LeadStatus[]; canAssign: boolean; canConvert: boolean; canComment: boolean };
}

export interface LeadListResult {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export interface DesignerLeadStats {
  designerId: string;
  designerName: string;
  open: number;
  waiting: number;
  converted: number;
  lost: number;
}

/** GET /leads/summary */
export interface LeadSummary {
  byStatus: Record<LeadStatus, number>;
  urgent: number;
}

/** GET /leads/designers -- one page of the owner's Designers table. */
export interface DesignerStatsPage {
  designers: DesignerLeadStats[];
  total: number;
  limit: number;
  offset: number;
}

/** A designer picked in a type-ahead (filter, assign). */
export interface DesignerChoice {
  id: string;
  fullName: string;
}
