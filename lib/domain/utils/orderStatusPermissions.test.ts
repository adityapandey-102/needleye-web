import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "./orderStatusPermissions";
import type { StatusTransitionOwners } from "./orderStatusPermissions";

const order: StatusTransitionOwners = { designerId: "designer-1", masterTailorId: "master-1" };

describe("canTransitionOrderStatus", () => {
  it("lets owner_manager move any order into any stage", () => {
    expect(canTransitionOrderStatus("owner_manager", "design_approved", order, "anyone")).toBe(true);
    expect(canTransitionOrderStatus("owner_manager", "cutting", order, "anyone")).toBe(true);
  });

  it("lets the assigned designer move their own order between design stages", () => {
    expect(canTransitionOrderStatus("designer", "design_approved", order, "designer-1")).toBe(true);
  });

  it("blocks a designer moving a design-stage order they are not assigned to", () => {
    expect(canTransitionOrderStatus("designer", "design_approved", order, "designer-2")).toBe(false);
  });

  it("blocks a designer from ever moving an order into a production stage", () => {
    expect(canTransitionOrderStatus("designer", "cutting", order, "designer-1")).toBe(false);
  });

  it("lets the assigned master tailor move their own order between production stages", () => {
    expect(canTransitionOrderStatus("master_tailor", "stitching", order, "master-1")).toBe(true);
  });

  it("blocks a master tailor moving a production-stage order they are not assigned to", () => {
    expect(canTransitionOrderStatus("master_tailor", "stitching", order, "master-2")).toBe(false);
  });

  it("blocks accountant from transitioning status at all", () => {
    expect(canTransitionOrderStatus("accountant", "design_pending", order, "anyone")).toBe(false);
    expect(canTransitionOrderStatus("accountant", "cutting", order, "anyone")).toBe(false);
  });
});
