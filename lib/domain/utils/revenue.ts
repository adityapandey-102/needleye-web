import type { LedgerFigures, LedgerMonthBooks, LedgerMonthsExport } from "../types";

/** The first year the Revenue page offers (the shop's records start in 2020). */
export const FIRST_REVENUE_YEAR = 2020;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10" -> "October 2026" (plain string maths -- no timezone can shift a month). */
export function revenueMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}

/** "2026-10" -> "Oct 2026" */
export function shortRevenueMonthLabel(month: string): string {
  return revenueMonthLabel(month).replace(/^(\w{3})\w*/, "$1");
}

export const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

/** The years from FIRST_REVENUE_YEAR to `currentYear`. */
export function revenueYears(currentYear: number): number[] {
  return Array.from({ length: Math.max(1, currentYear - FIRST_REVENUE_YEAR + 1) }, (_, i) => FIRST_REVENUE_YEAR + i);
}

/** "the range" in a file name or heading: "2026", "Jan–Oct 2026", "Mar 2024–Oct 2026". */
export function monthRangeLabel(from: string, to: string): string {
  if (from === to) return revenueMonthLabel(from);
  if (from.endsWith("-01") && to.endsWith("-12") && from.slice(0, 4) === to.slice(0, 4)) return from.slice(0, 4);
  if (from.slice(0, 4) === to.slice(0, 4)) return `${shortRevenueMonthLabel(from).slice(0, 3)}–${shortRevenueMonthLabel(to)}`;
  return `${shortRevenueMonthLabel(from)}–${shortRevenueMonthLabel(to)}`;
}

/** Escapes a CSV cell (quotes it when it holds a comma, quote or newline). */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A month's books in a word: Closed, Open (ended, can be closed) or Running (this month). */
export function booksLabel(books: LedgerMonthBooks): "Closed" | "Open" | "Running" {
  if (books.status === "closed") return "Closed";
  return books.ended ? "Open" : "Running";
}

function figureCells(f: LedgerFigures): (string | number)[] {
  return [f.ordersBooked, f.ordersNotPriced, f.total, f.paidSoFar, f.outstanding, f.cashCollected, f.paymentsCount];
}

/**
 * The Revenue page's "Export CSV": one row per month of the range (newest
 * first, as on screen) and a totals row -- opens directly in Excel / Sheets.
 */
export function ledgerMonthsToCsv(report: LedgerMonthsExport): string {
  const header = ["Month", "Orders booked", "Not priced", "Total", "Paid so far", "Outstanding", "Cash collected", "Payments", "Books"];
  const rows: (string | number)[][] = [header];
  for (const m of report.months) rows.push([revenueMonthLabel(m.month), ...figureCells(m), booksLabel(m.books)]);
  rows.push([]);
  rows.push([`Total ${revenueMonthLabel(report.from)} to ${revenueMonthLabel(report.to)}`, ...figureCells(report.totals)]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
