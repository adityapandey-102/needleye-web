import { getCapabilityScope } from "../constants/capabilities";
import { stageCapability } from "../constants/orderStatus";
import type { GranularStatus } from "../constants/orderStatus";
import type { Role } from "../constants/roles";

/**
 * Client-side mirror of needleye-api's assertCanChangeStage
 * (modules/orders/domain/order-status.rules.ts) -- used only for immediate UI
 * feedback (showing/hiding the status control, gating the scan popup). The API
 * re-checks this on every request regardless; this is a UX nicety, never the
 * real authorization boundary.
 *
 * Which roles may move an order INTO a stage depends only on the stage's
 * capability tier -- assignment is NOT considered (shop-floor model). Forward-
 * only ordering + concurrency are enforced server-side.
 */
export function canChangeStage(role: Role, newStatus: GranularStatus): boolean {
  return getCapabilityScope(role, stageCapability(newStatus)) !== false;
}
