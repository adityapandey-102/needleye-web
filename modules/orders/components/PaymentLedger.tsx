"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateOnly, PAYMENT_METHODS, type Payment, type PaymentMethod } from "../../../lib/domain";
import { paymentsApi } from "../../payments/api/paymentsApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

/**
 * Self-fetching, like OrdersListClient/UserManagementClient -- the server
 * page passes down only `orderId` and whether the caller can manage entries
 * (owner_manager/accountant, or the assigned designer); read access is
 * implied by this even being rendered (OrderDetailView only renders it when
 * canSeePayment is true for the caller's role).
 */
export function PaymentLedger({ orderId, canManage }: { orderId: string; canManage: boolean }) {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]!.value);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Re-fetches on demand after a mutation (add/remove) -- setLoading(true) here is fine, this only ever runs from a click handler, never directly inside the effect below. */
  async function load() {
    setLoading(true);
    try {
      const data = await paymentsApi.list(orderId);
      setPayments(data.payments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    paymentsApi
      .list(orderId)
      .then((data) => {
        if (!cancelled) {
          setPayments(data.payments);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load payments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await paymentsApi.add(orderId, { amount: Number(amount), method, notes: notes.trim() || undefined });
      setAmount("");
      setNotes("");
      setFormOpen(false);
      showToast("Payment recorded.", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm("Remove this payment entry?")) return;
    try {
      await paymentsApi.remove(orderId, paymentId);
      showToast("Payment removed.", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove payment", "error");
    }
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader
        icon="💳"
        iconTone="green"
        title="Payment Ledger"
        subtitle={`${payments.length} ${payments.length === 1 ? "entry" : "entries"} · ${formatCurrency(total)} recorded`}
      />
      <CardBody className="flex flex-col gap-3">
        {loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : error ? (
          <p className="text-xs text-error">{error}</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-text-muted">No payments recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-app-sm border border-border-light px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-text-primary">{formatCurrency(p.amount)}</div>
                  <div className="text-[11px] text-text-muted">
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method} · {formatDateOnly(p.paidAt)}
                    {p.recordedByName ? ` · ${p.recordedByName}` : ""}
                  </div>
                  {p.notes && <div className="mt-0.5 text-[11px] text-text-muted italic">{p.notes}</div>}
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-error hover:underline print:hidden">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage &&
          (formOpen ? (
            <form onSubmit={handleAdd} className="mt-2 flex flex-col gap-2 rounded-app-sm border border-border-light p-3 print:hidden">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel required>Amount</FieldLabel>
                  <Input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <FieldLabel required>Method</FieldLabel>
                  <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
              </div>
              <FieldError>{formError}</FieldError>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="px-3 py-1.5 text-xs">
                  {saving ? "Saving…" : "Record payment"}
                </Button>
                <Button type="button" variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" className="mt-1 px-3 py-1.5 text-xs print:hidden" onClick={() => setFormOpen(true)}>
              + Record payment
            </Button>
          ))}
      </CardBody>
    </Card>
  );
}
