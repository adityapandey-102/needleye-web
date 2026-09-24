"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMoney,
  formatCurrency,
  formatDateOnly,
  getPaymentDue,
  isPositiveMoney,
  moneyGreaterThan,
  moneyGte,
  PAYMENT_METHODS,
  type Payment,
  type PaymentMethod,
} from "../../../lib/domain";
import { paymentsApi } from "../../payments/api/paymentsApi";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { Icon } from "../../../components/ui/Icon";

const TONE_CLASSES: Record<string, string> = {
  green: "border-green-200 bg-green-50 text-green-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  gray: "border-border-light bg-app-bg/70 text-text-secondary",
};

interface PaymentLedgerProps {
  orderId: string;
  canManage: boolean;
  /** Order's total (2dp money string), and its payment schedule -- for the outstanding + due-status summary and overpayment guard. */
  orderTotal: string;
  paymentStatus: string | null;
  nextPaymentDate: string | null;
}

/**
 * Self-fetching payment ledger. Shows the outstanding balance and the
 * payment-due status (Upcoming / Due Today / Overdue with a day count), and
 * blocks recording more than the outstanding amount (overpayment) on the
 * client -- the API enforces the same rule server-side (PAYMENT_EXCEEDS_TOTAL).
 */
export function PaymentLedger({ orderId, canManage, orderTotal, paymentStatus, nextPaymentDate }: PaymentLedgerProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  // The order's payment-relevant fields, fetched alongside the ledger so the
  // total / status / due-date the summary reads are ALWAYS consistent with the
  // payments -- never a stale server-component prop (which can lag after an
  // order edit or another payment). The props seed the first paint only.
  const [orderFields, setOrderFields] = useState({ totalAmount: orderTotal, paymentStatus, nextPaymentDate });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]!.value);
  const [notes, setNotes] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Re-fetch the ledger AND the order together, so every figure stays mutually consistent. */
  async function load() {
    setLoading(true);
    try {
      const [list, { order }] = await Promise.all([paymentsApi.list(orderId), ordersApi.get(orderId)]);
      setPayments(list.payments);
      setOrderFields({
        totalAmount: order.totalAmount ?? "0.00",
        paymentStatus: order.paymentStatus ?? null,
        nextPaymentDate: order.nextPaymentDate,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([paymentsApi.list(orderId), ordersApi.get(orderId)])
      .then(([list, { order }]) => {
        if (!cancelled) {
          setPayments(list.payments);
          setOrderFields({
            totalAmount: order.totalAmount ?? "0.00",
            paymentStatus: order.paymentStatus ?? null,
            nextPaymentDate: order.nextPaymentDate,
          });
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

  const paid = addMoney(...payments.map((p) => p.amount));
  const due = getPaymentDue({
    totalAmount: orderFields.totalAmount,
    amountPaid: paid,
    paymentStatus: orderFields.paymentStatus,
    nextPaymentDate: orderFields.nextPaymentDate,
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const value = amount.trim();
    if (!isPositiveMoney(value)) {
      setFormError("Enter an amount greater than 0.");
      return;
    }
    // Overpayment guard (mirrors the API's PAYMENT_EXCEEDS_TOTAL rule).
    if (moneyGreaterThan(value, due.outstanding)) {
      setFormError(`Amount exceeds the outstanding balance of ${formatCurrency(due.outstanding)}.`);
      return;
    }

    // Whether this payment settles the order -- if a balance remains, the next
    // payment date reschedules the order's due tracking (fixing a stale
    // "Due Today" after a same-day payment); once settled, it's cleared.
    const settles = moneyGte(value, due.outstanding);

    setSaving(true);
    try {
      await paymentsApi.add(orderId, {
        amount: value,
        method,
        notes: notes.trim() || undefined,
        nextPaymentDate: settles ? null : nextDate || null,
      });
      setAmount("");
      setNotes("");
      setNextDate("");
      setFormOpen(false);
      showToast("Payment recorded.", "success");
      await load();
      // load() already refreshed this card's own figures (it re-fetches the
      // order); router.refresh() updates the REST of the detail page (the
      // Production Details total/outstanding/status pill) from the server.
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    const ok = await confirm({
      title: "Remove payment entry?",
      body: "This removes the ledger entry and recalculates the outstanding balance.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await paymentsApi.remove(orderId, paymentId);
      showToast("Payment removed.", "success");
      await load();
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove payment", "error");
    }
  }

  return (
    <Card>
      <CardHeader
        icon="💳"
        iconTone="green"
        title="Payment Ledger"
        subtitle={`${payments.length} ${payments.length === 1 ? "entry" : "entries"} · ${formatCurrency(paid)} recorded`}
      />
      <CardBody className="flex flex-col gap-3">
        {/* Summary: outstanding + payment-due status (#2) */}
        <div className="stagger-in grid grid-cols-2 gap-2">
          <div className="rounded-app border border-border-light bg-app-bg/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
              <Icon name="wallet" size={13} className="text-primary/70" />
              Outstanding
            </div>
            <div className="figure mt-1 text-[16px] text-text-primary">{formatCurrency(due.outstanding)}</div>
          </div>
          <div className="rounded-app border border-border-light bg-app-bg/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
              <Icon name="check-circle" size={13} className="text-success" />
              Paid
            </div>
            <div className="figure mt-1 text-[16px] text-text-primary">{formatCurrency(paid)}</div>
          </div>
          <div className={`col-span-2 rounded-app border px-3 py-2.5 ${TONE_CLASSES[due.tone]}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80">
              <Icon name="calendar-clock" size={13} />
              Payment Status
            </div>
            <div className="mt-1 text-sm font-semibold">{due.label}</div>
            <div className="text-[11px]">
              {orderFields.nextPaymentDate && due.status !== "paid"
                ? `${formatDateOnly(orderFields.nextPaymentDate)} · ${due.daysLabel}`
                : due.daysLabel}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : error ? (
          <div className="flex items-center justify-between rounded-app-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <span>{error}</span>
            <button onClick={() => void load()} className="font-medium underline print:hidden">
              Retry
            </button>
          </div>
        ) : payments.length === 0 ? (
          <p className="rounded-app border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">No payments recorded yet.</p>
        ) : (
          <div className="stagger-in flex flex-col gap-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-app border border-border-light bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/20 hover:bg-primary-bg/20"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
                  <Icon name="receipt" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="figure text-[15px] text-text-primary">{formatCurrency(p.amount)}</div>
                  <div className="text-[11px] text-text-muted">
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method} · {formatDateOnly(p.paidAt)}
                    {p.recordedByName ? ` · ${p.recordedByName}` : ""}
                  </div>
                  {p.notes && <div className="mt-0.5 text-[11px] text-text-muted italic">{p.notes}</div>}
                </div>
                {canManage && (
                  <button onClick={() => void handleDelete(p.id)} className="text-xs text-error hover:underline print:hidden">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage &&
          isPositiveMoney(due.outstanding) &&
          (formOpen ? (
            <form onSubmit={handleAdd} className="mt-2 flex flex-col gap-2 rounded-app-sm border border-border-light p-3 print:hidden">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel required>Amount</FieldLabel>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={due.outstanding}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-text-muted">Outstanding: {formatCurrency(due.outstanding)}</p>
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
              {/* If this payment won't settle the balance, capture when the next
                  one is expected -- keeps the due tracking accurate. */}
              {moneyGreaterThan(due.outstanding, amount) && (
                <div>
                  <FieldLabel>Next Payment Date</FieldLabel>
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                  <p className="mt-1 text-[11px] text-text-muted">A balance will remain after this payment. When is the next one expected?</p>
                </div>
              )}
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
