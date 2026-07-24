import { DESIGN_STAGE_STATUSES } from "../constants/orderStatus";
import { getCapabilityScope } from "../constants/capabilities";
import type { GranularStatus } from "../constants/orderStatus";
import type { Role } from "../constants/roles";

export interface StatusTransitionOwners {
  designerId: string;
  masterTailorId: string;
}

/**
 * Client-side mirror of needleye-api's assertCanTransitionStatus
 * (modules/orders/domain/order-status.rules.ts) -- used only for immediate
 * UI feedback (rejecting a Kanban drop before it even hits the network, or
 * filtering the status dropdown). The API re-checks this on every request
 * regardless; this is a UX nicety, never the real authorization boundary.
 */
export function canTransitionOrderStatus(role: Role, newStatus: GranularStatus, order: StatusTransitionOwners, callerId: string): boolean {
  const isDesignStage = DESIGN_STAGE_STATUSES.includes(newStatus);
  const capability = isDesignStage ? "orders:status:design_stages" : "orders:status:production_stages";
  const scope = getCapabilityScope(role, capability);

  if (scope === false) return false;
  if (scope === "assigned") {
    const ownerId = isDesignStage ? order.designerId : order.masterTailorId;
    return ownerId === callerId;
  }
  return true;
}
