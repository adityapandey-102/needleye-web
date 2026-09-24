import { getCapabilityScope } from "../constants/capabilities";
import { GRANULAR_STATUS_VALUES, stageCapability, stageIndex } from "../constants/orderStatus";
import type { GranularStatus } from "../constants/orderStatus";
import type { Role } from "../constants/roles";

/**
 * Client-side mirror of needleye-api's order-status.rules.ts
 * (assertCanChangeStage + assertCanSkipStages) -- used only for immediate UI
 * feedback (which stages the dropdown offers, whether a Kanban drop is allowed,
 * whether the scan popup opens). The API re-checks all of this on every request
 * regardless; this is a UX nicety, never the real authorization boundary.
 *
 * Which roles may move an order INTO a stage depends only on the stage's
 * capability tier -- assignment is NOT considered (shop-floor model). Forward-
 * only ordering + concurrency are enforced server-side.
 */
export function canChangeStage(role: Role, newStatus: GranularStatus): boolean {
  return getCapabilityScope(role, stageCapability(newStatus)) !== false;
}

/**
 * The first stage that stops `role` moving an order from `from` to `to` -- a
 * stage it would skip over, or the target itself -- or null if the move is
 * allowed. A forward jump may only pass over stages the role could set itself
 * (so a designer can't hop Design Approved -> Falls/Kutchu past PM Received).
 * Doesn't check direction: a backward or same-stage move just returns whether
 * the target is settable; callers reject those via stageIndex separately.
 */
export function blockingStage(role: Role, from: GranularStatus, to: GranularStatus): GranularStatus | null {
  const fromIndex = stageIndex(from);
  const toIndex = stageIndex(to);
  for (const stage of GRANULAR_STATUS_VALUES) {
    const index = stageIndex(stage);
    if (index > fromIndex && index < toIndex && !canChangeStage(role, stage)) return stage;
  }
  return canChangeStage(role, to) ? null : to;
}

/** True if `role` may move an order from `from` straight to `to` (target tier + no gated skip). */
export function canTransition(role: Role, from: GranularStatus, to: GranularStatus): boolean {
  return blockingStage(role, from, to) === null;
}
