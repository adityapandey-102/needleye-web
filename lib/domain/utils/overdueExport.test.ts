import { describe, expect, it } from "vitest";
import { daysOverdue, overdueOrdersToCsv, overdueOutstandingTotal } from "./overdueExport";
import type { OverdueExportOrder, OverdueExportResult } from "../types";

const order = (over: Partial<OverdueExportOrder> = {}): OverdueExportOrder => ({
  id: "1",
  orderNumber: "ORD-2026-0101",
  customerName: "Asha Rao",
  phone: "9876543210",
  designerName: "Anita Patel",
  productionStatus: "design_pending",
  paymentStatus: "advance_paid",
  bookingDate: "2026-10-01",
  dueDate: "2026-11-10",
  totalAmount: "10000.00",
  amountPaid: "4000.00",
  outstanding: "6000.00",
  lastPaymentDate: "2026-10-05",
  nextPaymentDate: "2026-11-20",
  ...over,
});

const result = (orders: OverdueExportOrder[]): OverdueExportResult => ({ orders, total: orders.length, asOf: "2026-11-16", timeZone: "Asia/Kolkata" });

describe("overdue export", () => {
  it("counts days past the due date", () => {
    expect(daysOverdue("2026-11-10", "2026-11-16")).toBe(6);
    expect(daysOverdue("2026-10-31", "2026-11-01")).toBe(1);
  });

  it("sums what's left to collect, an unpriced order adding nothing", () => {
    expect(overdueOutstandingTotal(result([order(), order({ outstanding: "2500.50" }), order({ totalAmount: null, outstanding: null })]))).toBe("8500.50");
    expect(overdueOutstandingTotal(result([]))).toBe("0.00");
  });

  it("writes one row per order with every asked-for column, then the total", () => {
    const csv = overdueOrdersToCsv(
      result([
        order(),
        order({ orderNumber: "ORD-2026-0102", designerName: null, lastPaymentDate: null, nextPaymentDate: null, paymentStatus: "not_priced", totalAmount: null, amountPaid: "0.00", outstanding: null }),
      ]),
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Order ID,Customer name,Customer phone,Designer,Stage,Payment status,Total,Paid,Outstanding,Booked on,Due date,Days overdue,Last payment,Next payment (expected)",
    );
    expect(lines[1]).toContain("ORD-2026-0101,Asha Rao,9876543210,Anita Patel,");
    expect(lines[1]).toContain(",10000.00,4000.00,6000.00,2026-10-01,2026-11-10,6,2026-10-05,2026-11-20");
    expect(lines[2]).toContain("ORD-2026-0102,Asha Rao,9876543210,,");
    expect(lines[2]).toContain(",Not priced,0.00,,2026-10-01,2026-11-10,6,No payment yet,Not scheduled");
    expect(csv).toContain("Total outstanding (2 orders)");
    expect(csv).toContain("6000.00");
  });

  it("defuses spreadsheet formulas in typed text", () => {
    const csv = overdueOrdersToCsv(result([order({ customerName: "=HYPERLINK(\"x\")" })]));
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
