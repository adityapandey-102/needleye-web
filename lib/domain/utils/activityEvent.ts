import { GRANULAR_STATUS_VALUES, granularLabel, type GranularStatus } from "../constants/orderStatus";
import { ROLE_LABELS, ROLES, type Role } from "../constants/roles";
import type { ActivityEvent } from "../types";

/**
 * Turns one audit event into a plain sentence for the owner's activity feed
 * ("Moved ORD-2026-042 to Cutting"). Unknown actions fall back to their
 * dotted code, so a new audit action never breaks the feed -- it just reads
 * technically until a line is added here.
 */
export interface ActivitySentence {
  text: string;
  /** Link target when the event is about an order that still exists. */
  orderId: string | null;
  tone: "order" | "stage" | "account" | "session" | "warning";
}

function roleLabel(value: unknown): string | null {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value) ? ROLE_LABELS[value as Role] : null;
}

function stageLabel(value: unknown): string | null {
  return typeof value === "string" && (GRANULAR_STATUS_VALUES as readonly string[]).includes(value)
    ? granularLabel(value as GranularStatus)
    : null;
}

export function describeActivity(event: ActivityEvent): ActivitySentence {
  // An event about an order that was since deleted has no number any more.
  const order = event.orderNumber ?? "a deleted order";
  const orderId = event.entityType === "order" && event.orderNumber ? event.entityId : null;
  const who = event.targetName ?? "an account";
  const meta = event.metadata ?? {};

  switch (event.action) {
    case "auth.login":
      return { text: "Signed in", orderId: null, tone: "session" };
    case "auth.logout":
      return { text: "Signed out", orderId: null, tone: "session" };
    case "auth.password_changed":
      return { text: "Changed their password", orderId: null, tone: "session" };

    case "order.created":
      return { text: `Created order ${order}`, orderId, tone: "order" };
    case "order.updated":
      return { text: `Edited order ${order}`, orderId, tone: "order" };
    case "order.status_changed": {
      const stage = stageLabel(meta.to);
      return { text: stage ? `Moved ${order} to ${stage}` : `Moved ${order} to the next stage`, orderId, tone: "stage" };
    }
    case "order.image_deleted":
      return { text: `Removed a reference image from ${order}`, orderId, tone: "order" };
    case "order.delivery_override": {
      const date = typeof meta.dueDate === "string" ? ` (${meta.dueDate})` : "";
      return {
        text: `Booked ${order} on a full delivery day${date}, confirmed with the Production Manager`,
        orderId,
        tone: "warning",
      };
    }

    case "user.created": {
      const role = roleLabel(meta.role);
      return { text: `Created an account for ${who}${role ? ` (${role})` : ""}`, orderId: null, tone: "account" };
    }
    case "user.updated":
      return { text: `Updated ${who}'s account`, orderId: null, tone: "account" };
    case "user.deactivated":
      return { text: `Deactivated ${who}`, orderId: null, tone: "warning" };
    case "user.reactivated":
      return { text: `Reactivated ${who}`, orderId: null, tone: "account" };
    case "user.password_regenerated":
      return { text: `Generated a new password for ${who}`, orderId: null, tone: "account" };
    case "user.qr_generated":
      return { text: `Generated a new login QR card for ${who}`, orderId: null, tone: "account" };

    default:
      return { text: event.action, orderId, tone: "order" };
  }
}
