import { describe, expect, it } from "vitest";
import { formatLedgerWhen, ledgerCsvCell, ledgerEffect, ledgerEventsToCsv, ledgerTotals } from "./ledgerExport";
import type { LedgerEvent } from "../types";

const base = { actorName: "Asha", orderId: "o1", orderNumber: "ORD-2026-007" };
const recorded: LedgerEvent = { ...base, id: "1", action: "created", at: "2026-06-30T18:45:00.000Z", snapshot: { amount: "500.00", method: "cash" } };
const edited: LedgerEvent = {
  ...base,
  id: "2",
  action: "updated",
  at: "2026-06-12T05:00:00.000Z",
  before: { amount: "500.00", method: "cash" },
  after: { amount: "450.00", method: "upi" },
};
const removed: LedgerEvent = { ...base, id: "3", action: "deleted", at: "2026-06-10T05:00:00.000Z", snapshot: { amount: "200.00", method: "upi" } };

describe("ledgerEffect", () => {
  it("adds a recording, subtracts a removal, moves by after-before on an edit", () => {
    expect(ledgerEffect(recorded)).toBe("500.00");
    expect(ledgerEffect(removed)).toBe("-200.00");
    expect(ledgerEffect(edited)).toBe("-50.00");
  });
});

describe("ledgerTotals", () => {
  it("sums each action and the net exactly (decimal money)", () => {
    expect(ledgerTotals([recorded, edited, removed])).toEqual({
      recordedCount: 1,
      recordedAmount: "500.00",
      editedCount: 1,
      editedNet: "-50.00",
      removedCount: 1,
      removedAmount: "200.00",
      net: "250.00",
    });
    expect(ledgerTotals([]).net).toBe("0.00");
  });
});

describe("formatLedgerWhen", () => {
  it("prints the SHOP's local time whatever the machine's zone (00:15 IST on 1 Jul, not 30 Jun UTC)", () => {
    expect(formatLedgerWhen(recorded.at, "Asia/Kolkata")).toMatch(/1 Jul 2026, 12:15\s?am/i);
  });
});

describe("ledgerCsvCell", () => {
  it("quotes commas/quotes/newlines", () => {
    expect(ledgerCsvCell("a,b")).toBe('"a,b"');
    expect(ledgerCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("defuses spreadsheet formulas in text (CSV injection) but leaves our money alone", () => {
    expect(ledgerCsvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(ledgerCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(ledgerCsvCell("-200.00", { isMoney: true })).toBe("-200.00");
  });
});

describe("ledgerEventsToCsv", () => {
  it("writes the table's columns for every row, then the period totals", () => {
    const csv = ledgerEventsToCsv([recorded, edited, removed], { from: "2026-06-01", to: "2026-06-30", timeZone: "Asia/Kolkata" });
    const lines = csv.split("\n");
    expect(lines[0]).toBe("When,Who,Action,Order,Amount,Method,Previous amount,Previous method,Effect on collected");
    expect(lines[1]).toMatch(/^"1 Jul 2026, 12:15\s?am",Asha,Recorded,ORD-2026-007,500.00,Cash,,,500.00$/i);
    expect(lines[2]).toContain(",Edited,ORD-2026-007,450.00,UPI,500.00,Cash,-50.00");
    expect(lines[3]).toContain(",Removed,ORD-2026-007,200.00,UPI,,,-200.00");
    expect(csv).toContain("Period 2026-06-01 to 2026-06-30");
    expect(csv).toContain("Total recorded,,,1 entries,,,,,500.00");
    expect(csv).toContain("Total removed,,,1 entries,,,,,-200.00");
    expect(csv).toContain("Net change from edits,,,1 entries,,,,,-50.00");
    expect(csv).toContain("Net change,,,3 entries,,,,,250.00");
  });

  it("still produces a header and zero totals for an empty period", () => {
    const csv = ledgerEventsToCsv([], { from: "2026-06-01", to: "2026-06-07", timeZone: "Asia/Kolkata" });
    expect(csv.split("\n")[0]).toContain("When,Who,Action");
    expect(csv).toContain("Net change,,,0 entries,,,,,0.00");
  });
});
