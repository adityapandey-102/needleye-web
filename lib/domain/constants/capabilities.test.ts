import { describe, expect, it } from "vitest";
import { CAPABILITIES, getCapabilityScope, hasCapability, isScopedToOwnRecords } from "./capabilities";
import type { Role } from "./roles";

const ROLES: Role[] = ["owner_manager", "designer", "master_tailor", "accountant", "production_manager", "worker"];

describe("capabilities matrix", () => {
  it("defines a scope for every role on every capability", () => {
    for (const capability of CAPABILITIES) {
      for (const role of ROLES) {
        expect(getCapabilityScope(role, capability)).toBeDefined();
      }
    }
  });

  it("gives owner_manager unrestricted (true) access to everything", () => {
    for (const capability of CAPABILITIES) {
      expect(getCapabilityScope("owner_manager", capability)).toBe(true);
    }
  });

  it("never grants master_tailor payment visibility or management", () => {
    expect(getCapabilityScope("master_tailor", "payments:read")).toBe(false);
    expect(getCapabilityScope("master_tailor", "payments:manage")).toBe(false);
    expect(hasCapability("master_tailor", "payments:read")).toBe(false);
  });

  it("scopes designer payment access to their own assigned orders", () => {
    expect(getCapabilityScope("designer", "payments:manage")).toBe("assigned");
    expect(isScopedToOwnRecords("designer", "payments:manage")).toBe(true);
  });

  it("gates each status tier by role (no assignment scope on status)", () => {
    expect(getCapabilityScope("designer", "orders:status:design")).toBe(true);
    expect(getCapabilityScope("production_manager", "orders:status:pm_received")).toBe(true);
    expect(getCapabilityScope("designer", "orders:status:pm_received")).toBe(false);
    for (const role of ["owner_manager", "designer", "master_tailor", "production_manager", "worker"] as Role[]) {
      expect(getCapabilityScope(role, "orders:status:production")).toBe(true);
    }
    expect(getCapabilityScope("accountant", "orders:status:production")).toBe(false);
  });
});
