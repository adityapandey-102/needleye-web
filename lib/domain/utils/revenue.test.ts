import { describe, expect, it } from "vitest";
import { periodLabel, revenueToCsv } from "./revenue";
import type { RevenueReport } from "../types";

describe("periodLabel", () => {
  it("uses a Month Year label for a calendar cycle (day 1)", () => {
    expect(periodLabel("2026-07-01", 1)).toMatch(/2026/);
    expect(periodLabel("2026-07-01", 1)).toMatch(/July|Jul/);
  });

  it("uses the start date for a shifted cycle", () => {
    // A day-7 cycle straddles two months, so the label is the concrete start date.
    expect(periodLabel("2026-07-07", 7)).toMatch(/2026/);
  });
});

describe("revenueToCsv", () => {
  const report: RevenueReport = {
    cycleStartDay: 1,
    from: "2026-01-01",
    to: "2026-12-31",
    periods: [
      { periodStart: "2026-01-01", collected: "1200.00", paymentCount: 3 },
      { periodStart: "2026-02-01", collected: "800.00", paymentCount: 2 },
    ],
  };

  it("emits a header, one row per period, and a total row", () => {
    const csv = revenueToCsv(report);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Period,Period Start,Collected,Payments");
    expect(lines).toContain("Total,,2000.00,");
    // Two period rows + header + blank + total.
    expect(lines.filter((l) => l.includes("2026-0")).length).toBe(2);
  });

  it("quotes cells containing commas", () => {
    const withComma: RevenueReport = {
      ...report,
      cycleStartDay: 7,
      periods: [{ periodStart: "2026-01-07", collected: "1000.00", paymentCount: 1 }],
    };
    const csv = revenueToCsv(withComma);
    // A "7 Jan, 2026"-style label (locale-dependent) must stay one CSV cell.
    for (const line of csv.split("\n")) {
      // Every data line has exactly 3 unquoted commas (4 columns), regardless of label content.
      const outsideQuotes = line.replace(/"[^"]*"/g, "");
      expect((outsideQuotes.match(/,/g) ?? []).length).toBeLessThanOrEqual(3);
    }
  });
});
