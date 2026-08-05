"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DESIGN_STAGE_STATUSES,
  GRANULAR_STATUS_VALUES,
  granularLabel,
  type GranularStatus,
  type Role,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";

/**
 * On opening an order (typically via its QR), the assigned designer/master is
 * prompted to move it to the NEXT stage in the production journey -- current
 * stage + the next one + an Advance button that confirms and applies the
 * change (reusing PATCH /orders/:id/status; the API re-checks stage RBAC). Only
 * shown when the viewer is actually allowed to make that specific transition
 * (a designer advances design stages, a master production stages), so it's
 * never a dead button. Auto-shows once per order per browser session; the
 * always-available on-page status control handles any further changes.
 */
export function StatusAdvancePrompt({
  orderId,
  currentStatus,
  role,
  canChangeDesignStage,
  canChangeProductionStage,
}: {
  orderId: string;
  currentStatus: GranularStatus;
  role: Role;
  canChangeDesignStage: boolean;
  canChangeProductionStage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const idx = GRANULAR_STATUS_VALUES.indexOf(currentStatus);
  const nextStatus = idx >= 0 && idx < GRANULAR_STATUS_VALUES.length - 1 ? GRANULAR_STATUS_VALUES[idx + 1]! : null;
  const nextIsDesign = nextStatus ? DESIGN_STAGE_STATUSES.includes(nextStatus) : false;
  const canAdvance = !!nextStatus && (nextIsDesign ? canChangeDesignStage : canChangeProductionStage);
  // Only the people who actually work the order get the proactive prompt.
  const enabled = role === "designer" || role === "master_tailor";
  const sessionKey = `neye-status-prompt-${orderId}`;

  useEffect(() => {
    if (!enabled || !canAdvance) return;
    let cancelled = false;
    // Deferred so the open isn't a synchronous setState in the effect body;
    // also the only place sessionStorage is read (client-only).
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        if (!sessionStorage.getItem(sessionKey)) setOpen(true);
      } catch {
        setOpen(true); // sessionStorage blocked -- still show once
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, canAdvance, sessionKey]);

  function dismiss() {
    try {
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage blocked (private mode) -- fine, just closes for now.
    }
    setOpen(false);
  }

  async function advance() {
    if (!nextStatus) return;
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
            <Icon name="needle" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-text-primary">Update production status?</h2>
            <p className="text-xs text-text-muted">Move this order forward in its journey.</p>
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
            {saving ? "Updating…" : `Advance to ${granularLabel(nextStatus)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
