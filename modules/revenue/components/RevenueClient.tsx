"use client";

import { ThisMonthCards } from "./ThisMonthCards";
import { MonthlyLedger } from "./MonthlyLedger";
import { LedgerActivity } from "./LedgerActivity";

/**
 * Revenue & Ledger (owner_manager / accountant): this month's four numbers,
 * the monthly ledger for any range (paged, with range totals and export), and
 * the payment audit trail. Every figure comes from the API's daily ledger,
 * kept by the database (needleye-api ADR 0008, phase 4); always calendar
 * months.
 */
export function RevenueClient() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="page-title">Revenue &amp; Ledger</h1>
        <p className="text-sm text-text-muted">What was booked, paid and collected, month by month.</p>
      </div>

      <ThisMonthCards />
      <MonthlyLedger />

      {/* Payment audit trail — who recorded/edited/removed a payment, when, and what changed. */}
      <LedgerActivity />
    </div>
  );
}
