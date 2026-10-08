import { describe, expect, it } from "vitest";
import { ledgerMonthsToCsv, revenueMonthLabel, monthRangeLabel, revenueYears } from "./revenue";
import type { LedgerFigures, LedgerMonthsExport } from "../types";

const f = (total: string, paid: string, cash: string, orders = 2, notPriced = 0): LedgerFigures => ({
  ordersBooked: orders,
  ordersNotPriced: notPriced,
  total,
  paidSoFar: paid,
  outstanding: (Number(total) - Number(paid)).toFixed(2),
  cashCollected: cash,
  paymentsCount: 3,
});

describe("month labels", () => {
  it("reads calendar months, whatever the machine's timezone", () => {
    expect(revenueMonthLabel("2026-10")).toBe("October 2026");
    expect(revenueMonthLabel("2026-01")).toBe("January 2026");
  });

  it("names a range compactly", () => {
    expect(monthRangeLabel("2026-10", "2026-10")).toBe("October 2026");
    expect(monthRangeLabel("2025-01", "2025-12")).toBe("2025");
    expect(monthRangeLabel("2026-01", "2026-10")).toBe("Jan–Oct 2026");
    expect(monthRangeLabel("2024-03", "2026-10")).toBe("Mar 2024–Oct 2026");
  });

  it("offers the years from 2020 to now", () => {
    expect(revenueYears(2026)).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  });
});

describe("ledgerMonthsToCsv", () => {
  const report: LedgerMonthsExport = {
    from: "2026-08",
    to: "2026-09",
    timeZone: "Asia/Kolkata",
    months: [
      { month: "2026-09", ...f("30000.00", "12000.00", "9000.00", 3, 1) },
      { month: "2026-08", ...f("0.00", "0.00", "4000.00", 0) },
    ],
    totals: f("30000.00", "12000.00", "13000.00", 3, 1),
  };

  it("one row per month (as on screen) and a totals row", () => {
    const lines = ledgerMonthsToCsv(report).split("\n");
    expect(lines[0]).toBe("Month,Orders booked,Not priced,Total,Paid so far,Outstanding,Cash collected,Payments");
    expect(lines[1]).toBe("September 2026,3,1,30000.00,12000.00,18000.00,9000.00,3");
    expect(lines[2]).toBe("August 2026,0,0,0.00,0.00,0.00,4000.00,3");
    expect(lines.at(-1)).toBe("Total August 2026 to September 2026,3,1,30000.00,12000.00,18000.00,13000.00,3");
  });
});
