"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canChangeStage,
  GRANULAR_STATUS_VALUES,
  granularLabel,
  stageIndex,
  type GranularStatus,
  type Role,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";
import { useConfirm } from "../../../components/ui/ConfirmDialog";

/**
 * Shown ONLY when an order is opened via its QR scan (the parent renders this
 * just for `?scan=1`). Whoever physically received the garment is prompted to
 * advance it to the next stage in the flow -- "Product received for X". Tapping
 * the advance button asks for a final confirmation, then applies the change
 * (PATCH /orders/:id/status; the API re-checks role tier, forward-only, and
 * concurrency). Rendered only when the next stage is one this role may set.
 */
export function StatusAdvancePrompt({
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const idx = stageIndex(currentStatus);
  const nextStatus = idx >= 0 && idx < GRANULAR_STATUS_VALUES.length - 1 ? GRANULAR_STATUS_VALUES[idx + 1]! : null;
  const canAdvance = !!nextStatus && canChangeStage(role, nextStatus);

  useEffect(() => {
    if (!canAdvance) return;
    let cancelled = false;
    // Deferred so it's not a synchronous setState in the effect body.
    queueMicrotask(() => {
      if (!cancelled) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [canAdvance]);

  function dismiss() {
    setOpen(false);
  }

  async function advance() {
    if (!nextStatus) return;
    const ok = await confirm({
      title: `Move to ${granularLabel(nextStatus)}?`,
      body: `Confirm this order has moved from “${granularLabel(currentStatus)}” to “${granularLabel(nextStatus)}”. This is recorded in the order's status history and can't be undone.`,
      confirmLabel: `Yes, move to ${granularLabel(nextStatus)}`,
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    try {
      await ordersApi.updateStatus(orderId, nextStatus);
      showToast(`Status advanced to ${granularLabel(nextStatus)}.`, "success");
      dismiss();
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !nextStatus) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden" onClick={dismiss}>
      <div className="animate-scale-in card-accent-top w-full max-w-md rounded-app-lg border border-border bg-card p-6 shadow-app-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-app bg-primary-bg text-primary ring-1 ring-inset ring-primary/10">
            <Icon name="package" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-text-primary">Product received?</h2>
            <p className="text-xs text-text-muted">You scanned this order. Advance it to the next stage.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 rounded-app-lg border border-border-light bg-primary-bg/30 px-4 py-4">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-text-secondary">
            {granularLabel(currentStatus)}
          </span>
          <span className="text-lg text-primary">→</span>
          <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: "var(--color-success)" }}>
            {granularLabel(nextStatus)}
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={dismiss} disabled={saving}>
            Not now
          </Button>
          <Button onClick={advance} disabled={saving}>
            {saving ? "Updating…" : `Received for ${granularLabel(nextStatus)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
