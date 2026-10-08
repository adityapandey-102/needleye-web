import { describe, expect, it } from "vitest";
import { describeActivity } from "./activityEvent";
import type { ActivityEvent } from "../types";

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "e1",
    category: "orders",
    kind: "order.created",
    at: "2026-09-24T10:00:00.000Z",
    actorName: "Asha",
    actorRole: "designer",
    orderId: "order-1",
    orderNumber: "ORD-2026-042",
    leadId: null,
    leadNumber: null,
    targetName: null,
    details: null,
    ...overrides,
  };
}

describe("describeActivity (ADR 0008 categories)", () => {
  it("orders: created / edited name the order and link to it", () => {
    expect(describeActivity(event({}))).toMatchObject({ text: "Created order ORD-2026-042", orderId: "order-1", tone: "order", detail: null });
    const edited = describeActivity(
      event({
        kind: "order.updated",
        details: {
          changes: {
            dueDate: { from: "2026-10-20", to: "2026-10-25" },
            designerId: { from: "d1", to: "d2", fromLabel: "Sunita", toLabel: "Anita" },
            handWork: { from: false, to: true },
            specialNotes: { from: null, to: "Rush" },
          },
        },
      }),
    );
    expect(edited.text).toBe("Edited order ORD-2026-042");
    expect(edited.detail).toBe("Due date: 20 Oct 2026 → 25 Oct 2026 · Designer: Sunita → Anita · Hand work: No → Yes · Special notes changed");
  });

  it("orders: an old edit row (before the split logs) lists the fields it touched", () => {
    const e = event({ kind: "order.updated", details: { details: { fields: ["customerName", "dueDate"] } } });
    expect(describeActivity(e).detail).toBe("Changed: Customer, Due date");
  });

  it("orders: a full-day booking is flagged", () => {
    const e = event({ details: { details: { deliveryOverride: { dueDate: "2026-10-08", bookedBefore: 10, capacity: 10 } } } });
    expect(describeActivity(e)).toMatchObject({ tone: "warning" });
    expect(describeActivity(e).detail).toContain("full delivery day (08 Oct 2026)");
  });

  it("orders: price changes show before -> after and the reason", () => {
    expect(describeActivity(event({ kind: "price.set", details: { newTotal: "25000.00" } })).text).toBe("Set the price of ORD-2026-042: ₹25,000");
    const fixed = describeActivity(event({ kind: "price.correction", details: { previousTotal: "20000.00", newTotal: "25000.00", reason: "Extra work" } }));
    expect(fixed).toMatchObject({ text: "Corrected the price of ORD-2026-042: ₹20,000 → ₹25,000", detail: "Extra work", tone: "order" });
    // Older rows read the same way.
    expect(describeActivity(event({ kind: "price.discount", details: { previousTotal: "25000.00", newTotal: "22000.00", reason: "Offer" } })).text).toBe(
      "Corrected the price of ORD-2026-042: ₹25,000 → ₹22,000",
    );
  });

  it("stages: from -> to with the stage labels; an unknown stage never leaks raw", () => {
    const e = event({ category: "stages", kind: "stage.moved", details: { from: "dyeing", to: "marking" } });
    expect(describeActivity(e)).toMatchObject({ text: "Moved ORD-2026-042 from Dyeing to Marking", tone: "stage" });
    expect(describeActivity(event({ kind: "stage.moved", details: { to: "??" } })).text).toBe("Moved ORD-2026-042 to the next stage");
    expect(describeActivity(event({ kind: "stage.moved", details: { from: "ready", to: "alteration" } })).tone).toBe("warning");
  });

  it("payments: amount, method and date", () => {
    const rec = describeActivity(event({ category: "payments", kind: "payment.created", details: { amount: "5000.00", method: "upi", paidAt: "2026-10-08" } }));
    expect(rec).toMatchObject({ text: "Recorded ₹5,000 (UPI) on ORD-2026-042", detail: "Paid 08 Oct 2026", tone: "payment" });
    const edit = describeActivity(
      event({ kind: "payment.updated", details: { amount: "5000.00", method: "cash", previousAmount: "500.00", previousMethod: "upi", paidAt: "2026-10-08", previousPaidAt: "2026-10-07" } }),
    );
    expect(edit.text).toBe("Edited a payment on ORD-2026-042: ₹500 → ₹5,000 (UPI → Cash)");
    expect(edit.detail).toBe("Paid date 07 Oct 2026 → 08 Oct 2026");
    expect(describeActivity(event({ kind: "payment.deleted", details: { amount: "500.00", method: "cash" } })).text).toBe(
      "Removed a ₹500 (Cash) payment from ORD-2026-042",
    );
  });

  it("leads: link to the lead, with readable stages", () => {
    const base = { category: "leads" as const, orderId: null, orderNumber: null, leadId: "lead-1", leadNumber: "LEAD-2026-007" };
    expect(describeActivity(event({ ...base, kind: "lead.created", details: { customerName: "Ananya" } }))).toMatchObject({
      text: "New enquiry LEAD-2026-007 from Ananya",
      leadId: "lead-1",
      tone: "lead",
    });
    expect(describeActivity(event({ ...base, kind: "lead.assigned", details: { assignedTo: "Sunita" } })).text).toBe("Assigned LEAD-2026-007 to Sunita");
    expect(describeActivity(event({ ...base, kind: "lead.status_changed", details: { from: "assigned", to: "attended" } })).text).toBe(
      "Moved LEAD-2026-007 from Assigned to Attended",
    );
    expect(describeActivity(event({ ...base, kind: "lead.converted", orderId: "o1", orderNumber: "ORD-2026-050" }))).toMatchObject({
      text: "Converted LEAD-2026-007 into order ORD-2026-050",
      orderId: "o1",
    });
  });

  it("accounts: sign-ins and account events name the person", () => {
    expect(describeActivity(event({ category: "accounts", kind: "auth.login", orderId: null, orderNumber: null }))).toMatchObject({
      text: "Signed in",
      orderId: null,
      tone: "session",
    });
    const created = event({ category: "accounts", kind: "user.created", targetName: "Ravi", details: { role: "worker" } });
    expect(describeActivity(created).text).toBe("Created an account for Ravi (Worker)");
    expect(describeActivity(event({ kind: "user.deactivated", targetName: "Ravi" })).tone).toBe("warning");
  });

  it("an order since deleted, and an unknown kind, still read", () => {
    expect(describeActivity(event({ orderNumber: null })).text).toBe("Created order a deleted order");
    expect(describeActivity(event({ orderNumber: null })).orderId).toBeNull();
    expect(describeActivity(event({ kind: "order.something_new" })).text).toBe("order.something_new");
  });
});
