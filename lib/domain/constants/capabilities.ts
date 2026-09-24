import type { Role } from "./roles";

export const CAPABILITIES = [
  "orders:create",
  "orders:read",
  "orders:edit:customer_product_fields",
  "orders:edit:pricing_assignment",
  // Production-flow stage tiers (see orderStatus.ts STAGE_CAPABILITY). Which
  // roles may move an order INTO a stage depends only on the stage's tier --
  // NOT on whether the order is assigned to them (the shop-floor model: whoever
  // physically receives the garment scans it and advances the stage).
  "orders:status:design", //          Design Pending, Design Approved
  "orders:status:pm_received", //     Production Manager Received
  "orders:status:production", //      Falls/Kutchu ... Finishing
  "orders:status:finalization", //    Quality Check / Trail, Alteration, Delivered
  "payments:manage",
  "payments:read",
  "reports:financial",
  "reports:staff",
  "users:manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * `true`  -> allowed on any order.
 * `"assigned"` -> allowed only when the caller is the order's designer_id or
 *                 master_tailor_id (or, for payments, the order's designer).
 * `false` -> never allowed.
 *
 * Mirror of needleye-api's src/domain/capabilities.ts -- kept identical.
 * NOTE: the four `orders:status:*` capabilities never use "assigned".
 */
type CapabilityScope = boolean | "assigned";

export const CAPABILITY_MATRIX: Record<Capability, Record<Role, CapabilityScope>> = {
  "orders:create": {
    owner_manager: true,
    designer: true,
    master_tailor: false,
    accountant: false,
    production_manager: true,
    worker: false,
  },
  "orders:read": {
    owner_manager: true,
    designer: "assigned",
    master_tailor: "assigned",
    accountant: true,
    production_manager: true,
    worker: "assigned",
  },
  "orders:edit:customer_product_fields": {
    owner_manager: true,
    designer: "assigned",
    master_tailor: false,
    accountant: false,
    production_manager: true,
    worker: false,
  },
  "orders:edit:pricing_assignment": {
    owner_manager: true,
    designer: false,
    master_tailor: false,
    accountant: false,
    production_manager: false,
    worker: false,
  },
  "orders:status:design": {
    owner_manager: true,
    designer: true,
    master_tailor: false,
    accountant: false,
    production_manager: true,
    worker: false,
  },
  "orders:status:pm_received": {
    owner_manager: true,
    designer: false,
    master_tailor: false,
    accountant: false,
    production_manager: true,
    worker: false,
  },
  "orders:status:production": {
    owner_manager: true,
    designer: true,
    master_tailor: true,
    accountant: false,
    production_manager: true,
    worker: true,
  },
  // Sign-off stages (QC / trial, rework, hand-over) -- not the floor.
  "orders:status:finalization": {
    owner_manager: true,
    designer: true,
    master_tailor: false,
    accountant: false,
    production_manager: true,
    worker: false,
  },
  "payments:manage": {
    owner_manager: true,
    designer: "assigned",
    master_tailor: false,
    accountant: true,
    production_manager: false,
    worker: false,
  },
  "payments:read": {
    owner_manager: true,
    designer: "assigned",
    master_tailor: false,
    accountant: true,
    production_manager: false,
    worker: false,
  },
  "reports:financial": {
    owner_manager: true,
    designer: false,
    master_tailor: false,
    accountant: true,
    production_manager: false,
    worker: false,
  },
  "reports:staff": {
    owner_manager: true,
    designer: false,
    master_tailor: false,
    accountant: false,
    production_manager: false,
    worker: false,
  },
  "users:manage": {
    owner_manager: true,
    designer: false,
    master_tailor: false,
    accountant: false,
    production_manager: false,
    worker: false,
  },
};

export function getCapabilityScope(role: Role, capability: Capability): CapabilityScope {
  return CAPABILITY_MATRIX[capability][role];
}

/** True if the role has this capability at all (globally or scoped to own records). */
export function hasCapability(role: Role, capability: Capability): boolean {
  return getCapabilityScope(role, capability) !== false;
}

/** True if the role's access to this capability is limited to records assigned to them. */
export function isScopedToOwnRecords(role: Role, capability: Capability): boolean {
  return getCapabilityScope(role, capability) === "assigned";
}
