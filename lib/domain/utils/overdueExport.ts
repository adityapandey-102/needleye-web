import { addMoney } from "./money";
import { ledgerCsvCell } from "./ledgerExport";
import { granularLabel } from "../constants/orderStatus";
import { paymentStatusLabel } from "../constants/productCategories";
import type { OverdueExportResult } from "../types";

/**
 * The payment-overdue export (CSV + the printable PDF page): every order still
 * owing whose next payment date has passed, all at once. Pure -- unit-tested,
 * and shared by the CSV download and the print page so both always agree.
 */

/** Sum of what's still to collect across the export. */
export function overdueOutstandingTotal(result: OverdueExportResult): string {
  return result.orders.reduce((sum, o) => addMoney(sum, o.outstanding), "0.00");
}

/** Whole days between the next payment date and the day the list was taken (both YYYY-MM-DD). */
export function daysOverdue(nextPaymentDate: string, asOf: string): number {
  return Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${nextPaymentDate}T00:00:00Z`)) / 86_400_000);
}

/** The CSV the "Overdue payments · Export CSV" button downloads. Dates stay YYYY-MM-DD so a spreadsheet sorts them. */
export function overdueOrdersToCsv(result: OverdueExportResult): string {
  const header = [
    "Order ID",
    "Customer name",
    "Customer phone",
    "Designer",
    "Stage",
    "Payment status",
    "Total",
    "Paid",
    "Outstanding",
    "Booked on",
    "Due date",
    "Last payment",
    "Next payment (expected)",
    "Days overdue",
  ];
  const lines: string[] = [header.map((h) => ledgerCsvCell(h)).join(",")];

  for (const o of result.orders) {
    const cells: [string | number, boolean][] = [
      [o.orderNumber, false],
      [o.customerName, false],
      [o.phone, false],
      [o.designerName ?? "", false],
      [granularLabel(o.productionStatus), false],
      [paymentStatusLabel(o.paymentStatus), false],
      [o.totalAmount, true],
      [o.amountPaid, true],
      [o.outstanding, true],
      [o.bookingDate, false],
      [o.dueDate, false],
      [o.lastPaymentDate ?? "No payment yet", false],
      [o.nextPaymentDate, false],
      [daysOverdue(o.nextPaymentDate, result.asOf), true],
    ];
    lines.push(cells.map(([v, isMoney]) => ledgerCsvCell(v, { isMoney })).join(","));
  }

  lines.push("");
  lines.push(ledgerCsvCell(`Overdue as of ${result.asOf}`));
  lines.push(
    [ledgerCsvCell(`Total outstanding (${result.orders.length} orders)`), "", "", "", "", "", "", "", ledgerCsvCell(overdueOutstandingTotal(result), { isMoney: true })].join(","),
  );
  return lines.join("\n");
}
