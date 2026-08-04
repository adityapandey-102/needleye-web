import type { Role } from "../constants/roles";
import type { GranularStatus } from "../constants/orderStatus";
import type { ProductCategory, PaymentStatus, PaymentMethod } from "../constants/productCategories";

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
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  recordedBy: string | null;
  recordedByName?: string;
  notes: string | null;
  createdAt: string;
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
  totalAmount?: number;
  amountPaid?: number;
  outstanding?: number;
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

export interface OrderStats {
  total: number;
  active: number;
  completed: number;
  thisMonth: number;
  inProduction: number;
  overdue: number;
  urgent: number;
  /** Absent entirely (not zero) when the API strips it server-side for a role without payments:read (master_tailor). */
  pendingPayments?: number;
  collectedRevenue?: number;
  outstandingRevenue?: number;
}

/** One accounting period's collected revenue, from GET /orders/revenue. */
export interface RevenuePeriod {
  periodStart: string;
  collected: number;
  paymentCount: number;
}

export interface RevenueReport {
  cycleStartDay: number;
  /** Inclusive date window (YYYY-MM-DD) the periods cover, echoed from the request. */
  from: string;
  to: string;
  periods: RevenuePeriod[];
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
  paymentPendingAmount: number;
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
  amount: number;
  method: string;
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

export interface TimelineSummary {
  statusLabel: "ON TRACK" | "DUE SOON" | "URGENT" | "OVERDUE" | "N/A";
  tone: "green" | "amber" | "red" | "dark-red" | "gray";
  daysRemainingLabel: string;
  orderAgeLabel: string;
  remainingDays: number | null;
}
