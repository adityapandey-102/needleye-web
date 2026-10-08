"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateOnly, revenueMonthLabel, type LedgerSummary } from "../../../lib/domain";
import { ledgerApi } from "../api/ledgerApi";
import { Icon } from "../../../components/ui/Icon";

/**
 * This month's four numbers (needleye-api ADR 0008, phase 4):
 *   Total booked   -- value of the orders booked this month
 *   Paid so far    -- paid on THOSE orders, up to now
 *   Outstanding    -- still unpaid on those orders
 *   Cash collected -- all money received this month, from any order
 * Paid so far and cash collected don't add up to each other: a payment this
 * month for last month's order is cash collected, not this month's "paid".
 */
export function ThisMonthCards() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ledgerApi
      .summary()
      .then((s) => {
        if (!cancelled) {
          setSummary(s);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load this month");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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

  const f = summary?.figures;
  return (
    <section aria-label="This month" className="mb-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">
          {summary ? revenueMonthLabel(summary.month) : "This month"}
          {summary && <span className="ml-2 text-xs font-normal text-text-muted">as of {formatDateOnly(summary.asOf)}</span>}
        </h2>
        <Link href="/orders/pending-payments" className="text-xs font-medium text-primary hover:underline">
          Orders needing collection <Icon name="chevron-right" size={13} className="-mt-px inline" />
        </Link>
      </div>
      {/* Same ledger strip as the Orders dashboard: one panel, hairline-divided. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-app-lg border border-border bg-border-light shadow-app sm:grid-cols-4">
        <Figure
          label="Total booked"
          value={f ? formatCurrency(f.total) : null}
          caption={f ? `${f.ordersBooked} ${f.ordersBooked === 1 ? "order" : "orders"}${f.ordersNotPriced ? ` · ${f.ordersNotPriced} not priced yet` : ""}` : null}
        />
        <Figure label="Paid so far" value={f ? formatCurrency(f.paidSoFar) : null} caption="on this month's orders" tone="success" />
        <Figure label="Outstanding" value={f ? formatCurrency(f.outstanding) : null} caption="still unpaid on them" tone="warning" />
        <Figure
          label="Cash collected"
          value={f ? formatCurrency(f.cashCollected) : null}
          caption={f ? `${f.paymentsCount} ${f.paymentsCount === 1 ? "payment" : "payments"}, any order` : null}
          tone="success"
        />
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string | null;
  caption: string | null;
  tone?: "success" | "warning";
}) {
  const valueClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text-primary";
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-[13px] text-text-secondary">{label}</div>
      {value === null ? (
        <div className="mt-2 h-7 w-28 animate-pulse rounded-app-sm bg-app-bg" />
      ) : (
        <div className={`figure mt-2 text-[24px] leading-none ${valueClass}`}>{value}</div>
      )}
      <div className="mt-2 text-xs text-text-muted">{caption ?? " "}</div>
    </div>
  );
}
