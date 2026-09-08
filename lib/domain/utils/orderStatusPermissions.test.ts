import { describe, expect, it } from "vitest";
import { canChangeStage } from "./orderStatusPermissions";
import type { Role } from "../constants/roles";

describe("canChangeStage (stage-tier, no assignment)", () => {
  it("owner_manager can move an order into any stage", () => {
    for (const s of ["design_pending", "production_manager_received", "cutting", "delivered"] as const) {
      expect(canChangeStage("owner_manager", s)).toBe(true);
    }
  });

  it("design tier (Design Pending/Approved): owner / designer / PM only", () => {
    for (const r of ["owner_manager", "designer", "production_manager"] as Role[]) {
      expect(canChangeStage(r, "design_approved")).toBe(true);
    }
    for (const r of ["master_tailor", "worker", "accountant"] as Role[]) {
      expect(canChangeStage(r, "design_approved")).toBe(false);
    }
  });

  it("PM-received tier: owner / PM only", () => {
    expect(canChangeStage("production_manager", "production_manager_received")).toBe(true);
    for (const r of ["designer", "master_tailor", "worker", "accountant"] as Role[]) {
      expect(canChangeStage(r, "production_manager_received")).toBe(false);
    }
  });

  it("production tier (Falls/Kutchu ... Delivered): everyone on the floor, not accountant", () => {
    for (const r of ["owner_manager", "designer", "master_tailor", "production_manager", "worker"] as Role[]) {
      expect(canChangeStage(r, "cutting")).toBe(true);
    }
    expect(canChangeStage("accountant", "cutting")).toBe(false);
  });
});
