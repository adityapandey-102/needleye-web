import { GRANULAR_STATUS_VALUES, granularLabel, type GranularStatus } from "../constants/orderStatus";
import { ROLE_LABELS, ROLES, type Role } from "../constants/roles";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from "../constants/leads";
import { PAYMENT_METHODS, productCategoryDisplayName } from "../constants/productCategories";
import { formatCurrency } from "./currency";
import { formatDateOnly } from "./date";
import type { ActivityCategory, ActivityEvent } from "../types";

/** The daily activity feed's tabs, in order (needleye-api ADR 0008). */
export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "stages", label: "Stages" },
  { value: "payments", label: "Payments" },
  { value: "leads", label: "Leads" },
  { value: "accounts", label: "Sign-ins & accounts" },
];

/**
 * Turns one activity event into a plain sentence for the owner's feed ("Moved
 * ORD-2026-042 from Cutting to Stitching"), plus an optional second line with
 * the specifics (what an edit changed, a price change's reason). Unknown kinds
 * fall back to their dotted code, so a new kind never breaks the feed -- it
 * just reads technically until a line is added here.
 */
export interface ActivitySentence {
  text: string;
  /** A second line: what an edit changed, why a price moved, a note. */
  detail: string | null;
  /** Link target when the event is about an order that still exists. */
  orderId: string | null;
  /** Link target when the event is about a lead. */
  leadId: string | null;
  tone: "order" | "stage" | "payment" | "lead" | "account" | "session" | "warning";
}

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {});
const asString = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

function roleLabel(value: unknown): string | null {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value) ? ROLE_LABELS[value as Role] : null;
}

function stageLabel(value: unknown): string | null {
  return typeof value === "string" && (GRANULAR_STATUS_VALUES as readonly string[]).includes(value)
    ? granularLabel(value as GranularStatus)
    : null;
}

function leadStatusLabel(value: unknown): string | null {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value) ? LEAD_STATUS_LABELS[value as LeadStatus] : null;
}

function methodLabel(value: unknown): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? (asString(value) ?? "");
}

function money(value: unknown): string {
  return asString(value) ? formatCurrency(value as string) : "—";
}

/** How an edit's field reads in the feed. */
const FIELD_LABELS: Record<string, string> = {
  customerName: "Customer",
  phone: "Phone",
  billNumber: "Bill no.",
  bookingDate: "Booking date",
  dueDate: "Due date",
  nextPaymentDate: "Next payment",
  designerId: "Designer",
  masterTailorId: "Master tailor",
  productCategory: "Category",
  orderDetails: "Order details",
  handWork: "Hand work",
  machineWork: "Machine work",
  purchaseRequired: "Purchase",
  designerInstructions: "Designer instructions",
  specialNotes: "Special notes",
};
const DATE_FIELDS = new Set(["bookingDate", "dueDate", "nextPaymentDate"]);
/** Long text: the feed says it changed, without quoting it. */
const TEXT_FIELDS = new Set(["orderDetails", "designerInstructions", "specialNotes"]);

function fieldValue(field: string, value: unknown, label: unknown): string {
  if (asString(label)) return label as string;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (DATE_FIELDS.has(field)) return formatDateOnly(String(value));
  if (field === "productCategory") return productCategoryDisplayName(String(value));
  return String(value);
}

/** "Due date: 20 Oct 2026 → 25 Oct 2026 · Designer: Sunita → Anita · Special notes changed" */
function describeChanges(changes: Json): string | null {
  const parts = Object.keys(FIELD_LABELS)
    .filter((field) => field in changes)
    .map((field) => {
      const change = asObject(changes[field]);
      if (TEXT_FIELDS.has(field)) return `${FIELD_LABELS[field]} changed`;
      return `${FIELD_LABELS[field]}: ${fieldValue(field, change.from, change.fromLabel)} → ${fieldValue(field, change.to, change.toLabel)}`;
    });
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function describeActivity(event: ActivityEvent): ActivitySentence {
  // An event about an order that was since deleted has no number any more.
  const order = event.orderNumber ?? "a deleted order";
  const orderId = event.orderNumber ? event.orderId : null;
  const lead = event.leadNumber ?? "a lead";
  const who = event.targetName ?? "an account";
  const d = asObject(event.details);
  const base = { detail: null, orderId: null, leadId: null };

  switch (event.kind) {
    // -- Orders --------------------------------------------------------------
    case "order.created": {
      const facts = asObject(d.details);
      const override = asObject(facts.deliveryOverride);
      const due = asString(override.dueDate);
      return {
        ...base,
        text: `Created order ${order}${facts.leadId ? " from a lead" : ""}`,
        detail: due ? `Booked on a full delivery day (${formatDateOnly(due)}), confirmed with the Production Manager` : null,
        orderId,
        tone: due ? "warning" : "order",
      };
    }
    case "order.updated": {
      const facts = asObject(d.details);
      const override = asObject(facts.deliveryOverride);
      const due = asString(override.dueDate);
      // Rows from before ADR 0008 only named the fields.
      const legacyFields = Array.isArray(facts.fields) ? (facts.fields as unknown[]).map((f) => FIELD_LABELS[String(f)] ?? String(f)) : [];
      const changed = describeChanges(asObject(d.changes)) ?? (legacyFields.length > 0 ? `Changed: ${legacyFields.join(", ")}` : null);
      const overrideNote = due ? `Moved onto a full delivery day (${formatDateOnly(due)}), confirmed with the Production Manager` : null;
      return {
        ...base,
        text: `Edited order ${order}`,
        detail: [changed, overrideNote].filter(Boolean).join(" · ") || null,
        orderId,
        tone: due ? "warning" : "order",
      };
    }
    case "order.image_deleted":
      return { ...base, text: `Removed a reference image from ${order}`, orderId, tone: "order" };

    case "price.set":
      return { ...base, text: `Set the price of ${order}: ${money(d.newTotal)}`, orderId, tone: "order" };
    // Any change after the first price is a correction (older rows say raise / discount).
    case "price.correction":
    case "price.raise":
    case "price.discount":
      return {
        ...base,
        text: `Corrected the price of ${order}: ${money(d.previousTotal)} → ${money(d.newTotal)}`,
        detail: asString(d.reason),
        orderId,
        tone: "order",
      };

    // -- Stages --------------------------------------------------------------
    case "stage.moved": {
      const from = stageLabel(d.from);
      const to = stageLabel(d.to);
      const text = to ? (from ? `Moved ${order} from ${from} to ${to}` : `Moved ${order} to ${to}`) : `Moved ${order} to the next stage`;
      return { ...base, text, orderId, tone: d.to === "alteration" ? "warning" : "stage" };
    }

    // -- Payments ------------------------------------------------------------
    case "payment.created":
      return {
        ...base,
        text: `Recorded ${money(d.amount)} (${methodLabel(d.method)}) on ${order}`,
        detail: asString(d.paidAt) ? `Paid ${formatDateOnly(d.paidAt as string)}` : null,
        orderId,
        tone: "payment",
      };
    case "payment.updated": {
      const amount = d.previousAmount !== d.amount ? `${money(d.previousAmount)} → ${money(d.amount)}` : money(d.amount);
      const method =
        d.previousMethod && d.previousMethod !== d.method ? `${methodLabel(d.previousMethod)} → ${methodLabel(d.method)}` : methodLabel(d.method);
      const paidAt =
        asString(d.previousPaidAt) && d.previousPaidAt !== d.paidAt
          ? `Paid date ${formatDateOnly(d.previousPaidAt as string)} → ${formatDateOnly(String(d.paidAt))}`
          : null;
      return { ...base, text: `Edited a payment on ${order}: ${amount} (${method})`, detail: paidAt, orderId, tone: "warning" };
    }
    case "payment.deleted":
      return { ...base, text: `Removed a ${money(d.amount)} (${methodLabel(d.method)}) payment from ${order}`, orderId, tone: "warning" };

    // -- Leads ---------------------------------------------------------------
    case "lead.created":
      return {
        ...base,
        text: `New enquiry ${lead}${asString(d.customerName) ? ` from ${d.customerName as string}` : ""}`,
        leadId: event.leadId,
        tone: "lead",
      };
    case "lead.enquiry_merged":
      return { ...base, text: `Repeat enquiry on ${lead} (marked urgent)`, detail: asString(d.note), leadId: event.leadId, tone: "warning" };
    case "lead.assigned":
      return {
        ...base,
        text: `Assigned ${lead} to ${asString(d.assignedTo) ?? "a designer"}`,
        leadId: event.leadId,
        tone: "lead",
      };
    case "lead.status_changed": {
      const from = leadStatusLabel(d.from);
      const to = leadStatusLabel(d.to);
      const text = to ? (from ? `Moved ${lead} from ${from} to ${to}` : `Moved ${lead} to ${to}`) : `Updated ${lead}`;
      return { ...base, text, detail: asString(d.note), leadId: event.leadId, tone: "lead" };
    }
    case "lead.converted":
      return {
        ...base,
        text: event.orderNumber ? `Converted ${lead} into order ${event.orderNumber}` : `Converted ${lead} into an order`,
        orderId,
        leadId: event.leadId,
        tone: "lead",
      };

    // -- Sign-ins & accounts -------------------------------------------------
    case "auth.login":
      return { ...base, text: "Signed in", tone: "session" };
    case "auth.logout":
      return { ...base, text: "Signed out", tone: "session" };
    case "auth.password_changed":
      return { ...base, text: "Changed their password", tone: "session" };
    case "user.created": {
      const role = roleLabel(d.role);
      return { ...base, text: `Created an account for ${who}${role ? ` (${role})` : ""}`, tone: "account" };
    }
    case "user.updated":
      return { ...base, text: `Updated ${who}'s account`, tone: "account" };
    case "user.deactivated":
      return { ...base, text: `Deactivated ${who}`, tone: "warning" };
    case "user.reactivated":
      return { ...base, text: `Reactivated ${who}`, tone: "account" };
    case "user.password_regenerated":
      return { ...base, text: `Generated a new password for ${who}`, tone: "account" };
    case "user.qr_generated":
      return { ...base, text: `Generated a new login QR card for ${who}`, tone: "account" };

    default:
      return { ...base, text: event.kind, orderId, leadId: event.leadId, tone: "order" };
  }
}
