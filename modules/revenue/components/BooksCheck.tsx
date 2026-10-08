"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateOnly, revenueMonthLabel, timeAgoLabel, type LedgerVerification } from "../../../lib/domain";
import { ledgerApi } from "../api/ledgerApi";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";

const FIELD_LABELS: Record<string, string> = {
  ordersBooked: "Orders booked",
  ordersPriced: "Orders priced",
  total: "Total booked",
  paidSoFar: "Paid so far",
  cashCollected: "Cash collected",
  paymentsCount: "Payments",
};
const MONEY_FIELDS = new Set(["total", "paidSoFar", "cashCollected"]);

function fieldValue(field: string, value: string): string {
  return MONEY_FIELDS.has(field) ? formatCurrency(value) : value;
}

/**
 * Are the books right? (needleye-api ADR 0008, phase 5.) Every night at 2:00
 * the database recounts every order and payment and compares them with the
 * daily register; checks that no order is paid more than its total and that
 * every order's payment status matches its payments; and that every closed
 * month still holds the cash it was closed with. "Verify now" runs the same
 * check on demand. It only reads -- it never changes a figure.
 */
export function BooksCheck() {
  const { showToast } = useToast();
  const [data, setData] = useState<LedgerVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ledgerApi
      .verification()
      .then((v) => {
        if (!cancelled) {
          setData(v);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the books check");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function verifyNow() {
    setRunning(true);
    try {
      const v = await ledgerApi.verifyNow();
      setData(v);
      setError(null);
      if (v.latest?.status === "verified") {
        showToast("Books verified — the register matches every order and payment.", "success");
      } else {
        showToast("The check found problems — see the details.", "error");
        setShowDetails(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "The check couldn't run", "error");
    } finally {
      setRunning(false);
    }
  }

  if (error) {
    return (
      <div className="mb-5 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
        <span>{error}</span>
        <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }

  const latest = data?.latest ?? null;
  const verified = latest?.status === "verified";
  const tone = !latest ? "border-border-light bg-app-bg/40" : verified ? "border-success/30 bg-success-bg/40" : "border-error/30 bg-error-bg/40";

  const problems = latest
    ? [
        latest.mismatchedDays > 0 && `${latest.mismatchedDays} ${latest.mismatchedDays === 1 ? "day doesn't" : "days don't"} match the receipts`,
        latest.overpaidOrders > 0 && `${latest.overpaidOrders} ${latest.overpaidOrders === 1 ? "order is" : "orders are"} paid more than the total`,
        latest.statusMismatches > 0 && `${latest.statusMismatches} payment ${latest.statusMismatches === 1 ? "status is" : "statuses are"} wrong`,
        latest.closedMonthDrift > 0 && `${latest.closedMonthDrift} closed ${latest.closedMonthDrift === 1 ? "month has" : "months have"} changed`,
      ].filter((p): p is string => Boolean(p))
    : [];

  return (
    <section aria-label="Books check" className={`mb-5 rounded-app border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon
            name={!latest ? "shield" : verified ? "check-circle" : "alert"}
            size={18}
            className={`mt-0.5 shrink-0 ${!latest ? "text-text-muted" : verified ? "text-success" : "text-error"}`}
          />
          <div className="min-w-0">
            {!data ? (
              <div className="h-4 w-56 animate-pulse rounded bg-app-bg/70" />
            ) : !latest ? (
              <>
                <div className="text-sm font-semibold text-text-primary">Not checked yet</div>
                <div className="text-xs text-text-muted">The books are checked every night at 2:00 AM — or check them now.</div>
              </>
            ) : (
              <>
                <div className={`text-sm font-semibold ${verified ? "text-success" : "text-error"}`}>
                  {verified ? "Books verified" : "The check found problems"}
                </div>
                <div className="text-xs text-text-secondary">
                  {verified
                    ? `Every order and payment matches the register (${latest.daysChecked} days).`
                    : problems.join(" · ")}{" "}
                  Checked {timeAgoLabel(latest.finishedAt)}
                  {latest.kind === "nightly" ? " (nightly)" : latest.requestedByName ? ` by ${latest.requestedByName}` : ""}.
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latest && !verified && (
            <Button variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setShowDetails((s) => !s)} aria-expanded={showDetails}>
              {showDetails ? "Hide details" : "Details"}
            </Button>
          )}
          <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={running || !data} onClick={() => void verifyNow()}>
            <Icon name="refresh" size={14} className={running ? "animate-spin" : ""} /> {running ? "Checking…" : "Verify now"}
          </Button>
        </div>
      </div>

      {data?.nightlyOverdue && data.lastNightlyAt && (
        <p className="mt-2 text-xs text-warning-text">
          The nightly check last ran {timeAgoLabel(data.lastNightlyAt)} — it should run every night. Please tell your developer.
        </p>
      )}

      {latest && !verified && showDetails && (
        <div className="mt-3 space-y-2 border-t border-error/20 pt-3 text-xs text-text-secondary">
          {latest.mismatches.length > 0 && (
            <div>
              <div className="font-semibold text-text-primary">Days where the register doesn&rsquo;t match the receipts</div>
              <ul className="mt-1 space-y-0.5">
                {latest.mismatches.map((m) => (
                  <li key={m.day}>
                    <span className="font-medium">{formatDateOnly(m.day)}</span>:{" "}
                    {m.fields.map((f) => `${FIELD_LABELS[f.field] ?? f.field} — register ${fieldValue(f.field, f.register)}, receipts ${fieldValue(f.field, f.actual)}`).join("; ")}
                  </li>
                ))}
              </ul>
              {latest.mismatchedDays > latest.mismatches.length && <div className="text-text-muted">…and {latest.mismatchedDays - latest.mismatches.length} more days.</div>}
            </div>
          )}
          {latest.closedMonths.length > 0 && (
            <div>
              <div className="font-semibold text-text-primary">Closed months that changed</div>
              <ul className="mt-1 space-y-0.5">
                {latest.closedMonths.map((m) => (
                  <li key={m.month}>
                    <span className="font-medium">{revenueMonthLabel(m.month)}</span>: closed with {formatCurrency(m.closedCash)} ({m.closedPayments} payments), now{" "}
                    {formatCurrency(m.cashNow)} ({m.paymentsNow})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(latest.overpaidOrders > 0 || latest.statusMismatches > 0) && (
            <div>Order-level problems (overpaid orders, wrong payment statuses) need a developer to look at the orders themselves.</div>
          )}
          <div className="text-text-muted">The check only reads — it never changes a figure. Share this with your developer.</div>
        </div>
      )}
    </section>
  );
}
