import { addMoney } from "./money";
import type { RevenueReport } from "../types";

/**
 * Formats one accounting period's start date into a readable label. For a
 * calendar cycle (day 1) that's "July 2026"; for a shifted cycle it's the start
 * date, since the period straddles two calendar months. Shared by the on-screen
 * table, the CSV export, and the printable report.
 */
export function periodLabel(periodStart: string, cycleStartDay: number): string {
  const date = new Date(`${periodStart}T00:00:00`);
  if (cycleStartDay === 1) {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Escapes a value for a CSV cell (quotes it when it contains a comma, quote, or newline). */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV (Period, Period Start, Collected, Payments) + a total row -- opens directly in Excel/Sheets. */
export function revenueToCsv(report: RevenueReport): string {
  const rows: (string | number)[][] = [["Period", "Period Start", "Collected", "Payments"]];
  let total = "0.00";
  for (const p of report.periods) {
    rows.push([periodLabel(p.periodStart, report.cycleStartDay), p.periodStart, p.collected, p.paymentCount]);
    total = addMoney(total, p.collected);
  }
  rows.push([]);
  rows.push(["Total", "", total, ""]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
