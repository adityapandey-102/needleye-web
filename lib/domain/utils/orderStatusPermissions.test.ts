import { describe, expect, it } from "vitest";
import { blockingStage, canChangeStage, canTransition } from "./orderStatusPermissions";
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

  it("production tier (Falls/Kutchu ... Finishing): everyone on the floor, not accountant", () => {
    for (const r of ["owner_manager", "designer", "master_tailor", "production_manager", "worker"] as Role[]) {
      expect(canChangeStage(r, "cutting")).toBe(true);
      expect(canChangeStage(r, "marking")).toBe(true);
      expect(canChangeStage(r, "finishing")).toBe(true);
    }
    expect(canChangeStage("accountant", "cutting")).toBe(false);
  });

  it("finalization tier (QC / Alteration / Ready / Delivered): owner / designer / PM only", () => {
    for (const s of ["quality_check", "alteration", "ready", "delivered"] as const) {
      for (const r of ["owner_manager", "designer", "production_manager"] as Role[]) {
        expect(canChangeStage(r, s)).toBe(true);
      }
      for (const r of ["master_tailor", "worker", "accountant"] as Role[]) {
        expect(canChangeStage(r, s)).toBe(false);
      }
    }
  });
});

describe("blockingStage / canTransition (no jumping over a stage the role can't set)", () => {
  it("names PM Received as what blocks a designer jumping Design Approved -> Falls/Kutchu", () => {
    expect(blockingStage("designer", "design_approved", "falls_kutchu")).toBe("production_manager_received");
    expect(canTransition("designer", "design_approved", "falls_kutchu")).toBe(false);
  });

  it("lets PM (who can set PM Received) jump past it", () => {
    expect(canTransition("production_manager", "design_approved", "falls_kutchu")).toBe(true);
  });

  it("allows ordinary floor skips", () => {
    expect(canTransition("worker", "stitching", "machine_work")).toBe(true);
  });

  it("reports the TARGET when it's the target itself the role can't set", () => {
    expect(blockingStage("master_tailor", "finishing", "quality_check")).toBe("quality_check");
    expect(blockingStage("worker", "stitching", "delivered")).toBe("quality_check");
  });
});

describe("canTransition follows the flow's shape (ADR 0008)", () => {
  it("allows Delivered only from Ready", () => {
    expect(canTransition("owner_manager", "ready", "delivered")).toBe(true);
    expect(canTransition("owner_manager", "quality_check", "delivered")).toBe(false);
    expect(canTransition("owner_manager", "alteration", "delivered")).toBe(false);
  });

  it("allows the alteration loop and no other way back", () => {
    expect(canTransition("designer", "ready", "alteration")).toBe(true);
    expect(canTransition("designer", "alteration", "ready")).toBe(true);
    expect(canTransition("owner_manager", "ready", "quality_check")).toBe(false);
    expect(canTransition("owner_manager", "cutting", "cutting")).toBe(false);
  });

  it("still needs the role's tier for the loop", () => {
    expect(canTransition("worker", "ready", "alteration")).toBe(false);
    expect(canTransition("master_tailor", "alteration", "ready")).toBe(false);
  });
});
