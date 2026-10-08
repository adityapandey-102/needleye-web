"use client";

import { useState } from "react";
import { amountInWords, formatCurrency, validatePriceChange, type Order, type PriceAction, type PriceChange } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Textarea } from "../../../components/ui/Select";
import { Icon } from "../../../components/ui/Icon";
import { Portal } from "../../../components/ui/Portal";

const TITLES: Record<PriceAction, { title: string; action: string; reasonHint: string }> = {
  set: { title: "Set the order price", action: "Save price", reasonHint: "" },
  correction: { title: "Correct the price", action: "Save correction", reasonHint: "e.g. extra embroidery added, or the price was typed wrong" },
};

/**
 * Set the first price, or correct it (up or down, with a reason). Shows the
 * animated "please be double sure" alert with the amount in words as soon as
 * a valid total is typed -- the shop's safeguard against a typo becoming a
 * customer's price (ADR 0008). Delivery locks nothing; the API refuses a
 * change while the order's booking month is closed in the books
 * (ORDER_PRICE_MONTH_CLOSED) -- its message is shown as is.
 */
export function PricingDialog({
  orderId,
  kind,
  currentTotal,
  collected,
  onClose,
  onSaved,
}: {
  orderId: string;
  kind: PriceAction;
  currentTotal: string | null;
  collected: string;
  onClose: () => void;
  onSaved: (result: { order: Order; change: PriceChange }) => void;
}) {
  const [amount, setAmount] = useState(kind === "set" ? "" : (currentTotal ?? ""));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = TITLES[kind];

  const typed = /^\d+(\.\d{1,2})?$/.test(amount.trim());
  const words = typed ? amountInWords(amount.trim()) : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = validatePriceChange(kind, amount, reason, currentTotal, collected);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await ordersApi.changePrice(orderId, amount.trim(), kind === "set" ? undefined : reason.trim());
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the price");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <form
          onSubmit={save}
          onClick={(e) => e.stopPropagation()}
          className="animate-scale-in card-accent-top max-h-[92vh] w-full max-w-md overflow-y-auto rounded-app-lg border border-border bg-card p-5 shadow-app-lg sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-app bg-primary-bg text-primary ring-1 ring-inset ring-primary/10">
              <Icon name="rupee" size={20} />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-text-primary">{copy.title}</h2>
              {currentTotal !== null && <p className="text-xs text-text-muted">Now {formatCurrency(currentTotal)} · collected {formatCurrency(collected)}</p>}
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel required htmlFor="price-amount">
              {kind === "set" ? "Order total (₹)" : "New total (₹)"}
            </FieldLabel>
            <Input
              id="price-amount"
              inputMode="decimal"
              autoFocus
              autoComplete="off"
              placeholder="e.g. 25000"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
            />
            {kind === "correction" && <p className="mt-1 text-[11px] text-text-muted">The lowest it can go is {formatCurrency(collected)}.</p>}
            {kind === "set" && <p className="mt-1 text-[11px] text-text-muted">₹0 means free work — nothing to collect.</p>}
          </div>

          {kind !== "set" && (
            <div className="mt-3">
              <FieldLabel required htmlFor="price-reason">
                Reason
              </FieldLabel>
              <Textarea id="price-reason" rows={2} maxLength={500} placeholder={copy.reasonHint} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}

          {typed && (
            // key: replay the nudge whenever the amount changes, so a new figure is noticed.
            <div key={amount} role="alert" className="price-alert mt-4 rounded-app border border-gold/40 bg-gold-bg/70 px-4 py-3 text-sm text-text-primary">
              <div className="flex gap-2.5">
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-gold" />
                <div>
                  <p className="font-semibold">
                    Please be double sure this total is correct: <span className="figure">{formatCurrency(amount.trim())}</span>
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-text-secondary">({words})</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    The Owner or Accountant can correct the total later, up or down, with a reason &mdash; never below what&rsquo;s already been
                    collected. Corrections are allowed until this order&rsquo;s month is closed in the books.
                  </p>
                </div>
              </div>
            </div>
          )}

          <FieldError>{error}</FieldError>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !typed}>
              {saving ? "Saving…" : typed ? `${copy.action} · ${formatCurrency(amount.trim())}` : copy.action}
            </Button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
