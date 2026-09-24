"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  canTransition,
  GRANULAR_STATUSES,
  granularLabel,
  stageIndex,
  type GranularStatus,
  type Role,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";
import { useConfirm } from "../../../components/ui/ConfirmDialog";

/**
 * A quick single-order status changer -- the other way to move an order along
 * besides dragging its Kanban card. The flow is forward-only, so it only offers
 * stages *later* than the current one that the caller's role tier may set AND
 * reach without skipping a stage it can't set (e.g. a designer isn't offered
 * Falls/Kutchu from Design Approved, since that would jump PM Received). The API
 * re-checks all of it, plus concurrency. The current stage is always shown
 * (selected) so the control never misrepresents state.
 */
export function OrderStatusControl({
  orderId,
  currentStatus,
  role,
}: {
  orderId: string;
  currentStatus: GranularStatus;
  role: Role;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [value, setValue] = useState<GranularStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = stageIndex(currentStatus);
  const options = GRANULAR_STATUSES.filter(
    (s) => s.value === currentStatus || (stageIndex(s.value) > currentIndex && canTransition(role, currentStatus, s.value)),
  );

  if (options.length <= 1) return null;

  async function handleChange(next: GranularStatus) {
    const previous = value;
    if (next === previous) return;
    // Reflect the selection while we ask, so the dropdown matches the question.
    setValue(next);

    const ok = await confirm({
      title: "Change production status?",
      body: `Move this order from “${granularLabel(previous)}” to “${granularLabel(next)}”? This is recorded in the order's status history.`,
      confirmLabel: `Change to ${granularLabel(next)}`,
      cancelLabel: "Keep current",
    });
    if (!ok) {
      setValue(previous); // revert the dropdown -- nothing was changed
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await ordersApi.updateStatus(orderId, next);
      showToast(`Status updated to ${granularLabel(next)}.`, "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      showToast(message, "error");
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select className="w-auto" value={value} disabled={saving} onChange={(e) => handleChange(e.target.value as GranularStatus)}>
        {options.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  );
}
