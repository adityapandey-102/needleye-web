import { describe, expect, it } from "vitest";
import { describeActivity } from "./activityEvent";
import type { ActivityEvent } from "../types";

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "e1",
    action: "order.created",
    entityType: "order",
    entityId: "order-1",
    at: "2026-09-24T10:00:00.000Z",
    actorName: "Asha",
    actorRole: "designer",
    orderNumber: "ORD-2026-042",
    targetName: null,
    metadata: null,
    ...overrides,
  };
}

describe("describeActivity", () => {
  it("order events name the order and link to it", () => {
    expect(describeActivity(event({}))).toEqual({ text: "Created order ORD-2026-042", orderId: "order-1", tone: "order" });
    expect(describeActivity(event({ action: "order.updated" })).text).toBe("Edited order ORD-2026-042");
  });

  it("stage moves use the stage's label", () => {
    const e = event({ action: "order.status_changed", metadata: { to: "dyeing" } });
    expect(describeActivity(e)).toMatchObject({ text: "Moved ORD-2026-042 to Dyeing", tone: "stage" });
    // An unknown stage value never leaks raw.
    expect(describeActivity(event({ action: "order.status_changed", metadata: { to: "??" } })).text).toBe(
      "Moved ORD-2026-042 to the next stage",
    );
  });

  it("the delivery override is flagged", () => {
    const e = event({ action: "order.delivery_override", metadata: { dueDate: "2026-10-08" } });
    expect(describeActivity(e)).toMatchObject({ tone: "warning" });
    expect(describeActivity(e).text).toContain("full delivery day (2026-10-08)");
  });

  it("a deleted order: no link, generic wording", () => {
    expect(describeActivity(event({ orderNumber: null }))).toMatchObject({ text: "Created order a deleted order", orderId: null });
  });

  it("account events name the account and its role", () => {
    const e = event({ action: "user.created", entityType: "user", orderNumber: null, targetName: "Ravi", metadata: { role: "worker" } });
    expect(describeActivity(e)).toEqual({ text: "Created an account for Ravi (Worker)", orderId: null, tone: "account" });
    expect(describeActivity(event({ action: "user.deactivated", entityType: "user", targetName: "Ravi" })).text).toBe("Deactivated Ravi");
  });

  it("sessions, and an unknown action falls back to its code", () => {
    expect(describeActivity(event({ action: "auth.login", entityType: "session" })).text).toBe("Signed in");
    expect(describeActivity(event({ action: "inventory.counted", entityType: "stock" })).text).toBe("inventory.counted");
  });
});
