import { afterEach, describe, expect, it, vi } from "vitest";
import { derivePaymentStatus, getPaymentDue, remainingOutstanding } from "./paymentDue";

afterEach(() => vi.useRealTimers());

function freeze(dateIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateIso));
}

describe("derivePaymentStatus", () => {
  it("mirrors the API: unpaid -> advance_paid -> fully_paid from the ledger", () => {
    expect(derivePaymentStatus(0, 5000)).toBe("unpaid");
    expect(derivePaymentStatus(2000, 5000)).toBe("advance_paid");
    expect(derivePaymentStatus(5000, 5000)).toBe("fully_paid");
    expect(derivePaymentStatus(6000, 5000)).toBe("fully_paid"); // never over
    expect(derivePaymentStatus(0, 0)).toBe("unpaid"); // zero-total order
  });
});

describe("remainingOutstanding", () => {
  it("subtracts paid from total, floored at 0 (2dp string)", () => {
    expect(remainingOutstanding("1000.00", "400.00")).toBe("600.00");
    expect(remainingOutstanding("1000.00", "1000.00")).toBe("0.00");
    expect(remainingOutstanding("1000.00", "1200.00")).toBe("0.00"); // never negative
  });

  it("treats null/undefined as 0", () => {
    expect(remainingOutstanding(null, null)).toBe("0.00");
    expect(remainingOutstanding("500.00", undefined)).toBe("500.00");
  });
});

describe("getPaymentDue", () => {
  it("is 'paid' when fully_paid, regardless of date", () => {
    const r = getPaymentDue({ totalAmount: "1000.00", amountPaid: "400.00", paymentStatus: "fully_paid", nextPaymentDate: "2020-01-01" });
    expect(r.status).toBe("paid");
    expect(r.outstanding).toBe("0.00");
    expect(r.tone).toBe("green");
  });

  it("is 'paid' when the balance is settled even if status isn't fully_paid", () => {
    expect(getPaymentDue({ totalAmount: 1000, amountPaid: 1000 }).status).toBe("paid");
  });

  it("is 'no_date' when there's a balance but no next payment date", () => {
    const r = getPaymentDue({ totalAmount: "1000.00", amountPaid: "200.00", paymentStatus: "partially_paid", nextPaymentDate: null });
    expect(r.status).toBe("no_date");
    expect(r.outstanding).toBe("800.00");
  });

  it("is 'overdue' with a day count when the date has passed", () => {
    freeze("2026-03-10T09:00:00");
    const r = getPaymentDue({ totalAmount: 1000, amountPaid: 200, paymentStatus: "partially_paid", nextPaymentDate: "2026-03-05" });
    expect(r.status).toBe("overdue");
    expect(r.days).toBe(5);
    expect(r.daysLabel).toBe("5 days overdue");
    expect(r.tone).toBe("red");
  });

  it("is 'due_today' when the date is today", () => {
    freeze("2026-03-05T15:00:00");
    const r = getPaymentDue({ totalAmount: 1000, amountPaid: 200, paymentStatus: "advance_paid", nextPaymentDate: "2026-03-05" });
    expect(r.status).toBe("due_today");
    expect(r.days).toBe(0);
    expect(r.daysLabel).toBe("Due today");
  });

  it("is 'upcoming' with days-left when the date is in the future", () => {
    freeze("2026-03-01T00:00:00");
    const r = getPaymentDue({ totalAmount: 1000, amountPaid: 200, paymentStatus: "advance_paid", nextPaymentDate: "2026-03-04" });
    expect(r.status).toBe("upcoming");
    expect(r.days).toBe(3);
    expect(r.daysLabel).toBe("3 days left");
  });

  it("pluralizes day/days correctly at 1", () => {
    freeze("2026-03-01T00:00:00");
    expect(getPaymentDue({ totalAmount: 100, amountPaid: 0, nextPaymentDate: "2026-03-02" }).daysLabel).toBe("1 day left");
  });
});
