import { addMoney } from "./money";
import { ledgerCsvCell } from "./ledgerExport";
import { granularLabel } from "../constants/orderStatus";
import { paymentStatusLabel } from "../constants/productCategories";
import type { OverdueExportResult } from "../types";

/**
 * The overdue-orders export (CSV + the printable PDF page): EVERY order past
 * its delivery due date and not delivered -- the Overdue list
 * (/orders/bucket/overdue), all at once -- with each order's payment details.
 * Pure -- unit-tested, and shared by the CSV download and the print page so
 * both always agree.
 */

/** Sum of what's still to collect across the export (orders with no price yet add nothing). */
export function overdueOutstandingTotal(result: OverdueExportResult): string {
  return result.orders.reduce((sum, o) => addMoney(sum, o.outstanding ?? "0"), "0.00");
}

/** Whole days from a date (YYYY-MM-DD) to the day the list was taken -- how late the order is. */
export function daysOverdue(date: string, asOf: string): number {
  return Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
}

/** The CSV the overdue-orders "Export CSV" button downloads. Dates stay YYYY-MM-DD so a spreadsheet sorts them. */
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
    "Days overdue",
    "Last payment",
    "Next payment (expected)",
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
      [o.totalAmount ?? "Not priced", o.totalAmount !== null],
      [o.amountPaid, true],
      [o.outstanding ?? "", true],
      [o.bookingDate, false],
      [o.dueDate, false],
      [daysOverdue(o.dueDate, result.asOf), true],
      [o.lastPaymentDate ?? "No payment yet", false],
      [o.nextPaymentDate ?? "Not scheduled", false],
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
