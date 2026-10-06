import { describe, expect, it, vi } from "vitest";
import { getTimelineSummary } from "./timeline";

describe("getTimelineSummary", () => {
  it("returns N/A when there is no due date", () => {
    const summary = getTimelineSummary({ dueDate: null, bookingDate: null });
    expect(summary.statusLabel).toBe("N/A");
    expect(summary.tone).toBe("gray");
    expect(summary.remainingDays).toBeNull();
  });

  it("classifies a due date more than 7 days out as ON TRACK", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00"));
    const summary = getTimelineSummary({ dueDate: "2026-03-15", bookingDate: "2026-02-20" });
    expect(summary.statusLabel).toBe("ON TRACK");
    expect(summary.tone).toBe("green");
    expect(summary.remainingDays).toBe(14);
    vi.useRealTimers();
  });

  it("classifies a due date within 3-7 days as DUE SOON", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00"));
    const summary = getTimelineSummary({ dueDate: "2026-03-06", bookingDate: null });
    expect(summary.statusLabel).toBe("DUE SOON");
    expect(summary.tone).toBe("amber");
    vi.useRealTimers();
  });

  it("classifies a due date within 0-2 days as URGENT", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00"));
    const summary = getTimelineSummary({ dueDate: "2026-03-02", bookingDate: null });
    expect(summary.statusLabel).toBe("URGENT");
    expect(summary.tone).toBe("red");
    vi.useRealTimers();
  });

  it("classifies a past due date as OVERDUE with a days-overdue label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00"));
    const summary = getTimelineSummary({ dueDate: "2026-03-05", bookingDate: null });
    expect(summary.statusLabel).toBe("OVERDUE");
    expect(summary.tone).toBe("dark-red");
    expect(summary.remainingDays).toBe(-5);
    expect(summary.daysRemainingLabel).toBe("5 Days Overdue");
    vi.useRealTimers();
  });

  it("reads DELIVERED for a delivered order -- never OVERDUE (past due) or ON TRACK (future due)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00"));
    for (const dueDate of ["2026-03-05", "2026-03-25", null]) {
      const summary = getTimelineSummary({ dueDate, bookingDate: "2026-03-01", productionStatus: "delivered" });
      expect(summary.statusLabel, String(dueDate)).toBe("DELIVERED");
      expect(summary.tone).toBe("green");
      expect(summary.daysRemainingLabel).toBe("Delivered");
      expect(summary.remainingDays).toBeNull();
      expect(summary.orderAgeLabel).toBe("9 Days");
    }
    // Any other stage still counts down as before.
    expect(getTimelineSummary({ dueDate: "2026-03-05", productionStatus: "quality_check" }).statusLabel).toBe("OVERDUE");
    vi.useRealTimers();
  });
});
