"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DESIGN_STAGE_STATUSES,
  GRANULAR_STATUSES,
  granularLabel,
  PRODUCTION_STAGE_STATUSES,
  type GranularStatus,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

/**
 * A quick single-order status changer -- the other way to move an order
 * along besides dragging its card on the Kanban board. Only ever offers
 * statuses the caller's role+assignment *might* be allowed to set (the API
 * is still the real authority -- see domain/order-status.rules.ts on the
 * backend); the current status is always shown even if it's not one of
 * those, so the control never misrepresents state.
 */
export function OrderStatusControl({
  orderId,
  currentStatus,
  canChangeDesignStage,
  canChangeProductionStage,
}: {
  orderId: string;
  currentStatus: GranularStatus;
  canChangeDesignStage: boolean;
  canChangeProductionStage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [value, setValue] = useState<GranularStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = GRANULAR_STATUSES.filter(
    (s) =>
      s.value === currentStatus ||
      (canChangeDesignStage && DESIGN_STAGE_STATUSES.includes(s.value)) ||
      (canChangeProductionStage && PRODUCTION_STAGE_STATUSES.includes(s.value)),
  );

  if (options.length <= 1) return null;

  async function handleChange(next: GranularStatus) {
    const previous = value;
    setValue(next);
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
