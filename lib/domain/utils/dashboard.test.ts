import { describe, expect, it } from "vitest";
import {
  busiestDay,
  collectedShare,
  dayLabel,
  daysInclusive,
  deliveryChunks,
  deliverySeries,
  deliverySummary,
  deliverySummaryWindow,
  greetingFor,
  monthEnd,
  nextDays,
  percentLabel,
  pipelineSegments,
  rangeLabel,
  shiftDate,
} from "./dashboard";

describe("the dashboard's pipeline", () => {
  it("gives every group its share of the orders in progress, in flow order", () => {
    const segs = pipelineSegments({ design: 10, received: 5, production: 25, checks: 5, ready: 5 });
    expect(segs.map((s) => s.key)).toEqual(["design", "received", "production", "checks", "ready"]);
    expect(segs.map((s) => s.share)).toEqual([0.2, 0.1, 0.5, 0.1, 0.1]);
    expect(segs.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1);
  });

  it("is all zeros with nothing in progress, and treats a missing group as 0", () => {
    expect(pipelineSegments({}).every((s) => s.count === 0 && s.share === 0)).toBe(true);
    expect(pipelineSegments({ ready: 3 }).find((s) => s.key === "ready")?.share).toBe(1);
  });
});

describe("the dashboard's deliveries", () => {
  it("lists every day of the window, across a month end, with 0 for days the API skipped", () => {
    expect(nextDays("2026-10-30", 4)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    const series = deliverySeries([{ date: "2026-10-31", count: 9 }, { date: "2026-11-01", count: 12 }], "2026-10-30", 3, 12, 9);
    expect(series).toEqual([
      { date: "2026-10-30", count: 0, level: "open" },
      { date: "2026-10-31", count: 9, level: "filling" },
      { date: "2026-11-01", count: 12, level: "full" },
    ]);
  });

  it("finds the busiest day (the earliest on a tie), or none", () => {
    const series = deliverySeries([{ date: "2026-10-09", count: 4 }, { date: "2026-10-10", count: 4 }], "2026-10-08", 3, 10, 8);
    expect(busiestDay(series)?.date).toBe("2026-10-09");
    expect(busiestDay(deliverySeries([], "2026-10-08", 3, 10, 8))).toBeNull();
  });

  it("moves dates across month and year ends, and finds a month's last day (leap years too)", () => {
    expect(shiftDate("2026-10-30", 3)).toBe("2026-11-02");
    expect(shiftDate("2027-01-01", -1)).toBe("2026-12-31");
    expect(monthEnd("2026-10-09")).toBe("2026-10-31");
    expect(monthEnd("2028-02-10")).toBe("2028-02-29");
    expect(monthEnd("2027-02-10")).toBe("2027-02-28");
    expect(daysInclusive("2026-10-09", "2026-10-09")).toBe(1);
    expect(daysInclusive("2026-10-30", "2026-11-02")).toBe(4);
    expect(daysInclusive("2026-10-09", "2026-10-08")).toBe(0);
  });

  it("splits two months into 14-day chunks that tile the window exactly, the last one shorter", () => {
    const chunks = deliveryChunks("2026-10-09", 60, 14);
    expect(chunks.map((c) => c.length)).toEqual([14, 14, 14, 14, 4]);
    expect(chunks[0]).toEqual({ index: 0, from: "2026-10-09", to: "2026-10-22", offset: 0, length: 14 });
    expect(chunks[1]!.from).toBe("2026-10-23");
    expect(chunks.at(-1)).toEqual({ index: 4, from: "2026-12-04", to: "2026-12-07", offset: 56, length: 4 });
    // No gaps or overlaps: each chunk starts the day after the previous one ends.
    chunks.slice(1).forEach((c, i) => expect(c.from).toBe(shiftDate(chunks[i]!.to, 1)));
  });

  it("sizes the summary window to the month's end, but never under two weeks", () => {
    expect(deliverySummaryWindow("2026-10-09")).toEqual({ from: "2026-10-09", to: "2026-10-31" });
    expect(deliverySummaryWindow("2026-10-25")).toEqual({ from: "2026-10-25", to: "2026-11-07" });
  });

  it("sums this month, this week, next week and the full days from one series", () => {
    // From 25 Oct: 7 days left in October, so "This month" stops at the 31st while next week runs into November.
    const { from, to } = deliverySummaryWindow("2026-10-25");
    const days = [
      { date: "2026-10-25", count: 2 },
      { date: "2026-10-31", count: 10 }, // full (capacity 10)
      { date: "2026-11-01", count: 3 }, // day 8 -> next week, not this month
      { date: "2026-11-07", count: 10 }, // day 14, full
    ];
    const series = deliverySeries(days, from, daysInclusive(from, to), 10, 8);
    expect(deliverySummary(series, from)).toEqual({ thisMonth: 12, thisWeek: 12, nextWeek: 13, fullDays: 2 });
    expect(deliverySummary(deliverySeries([], from, 14, 10, 8), from)).toEqual({ thisMonth: 0, thisWeek: 0, nextWeek: 0, fullDays: 0 });
  });

  it("labels a visible range compactly, naming both months only across a month end", () => {
    expect(rangeLabel("2026-10-09", "2026-10-22")).toBe("9 – 22 Oct");
    expect(rangeLabel("2026-10-26", "2026-11-08")).toBe("26 Oct – 8 Nov");
  });

  it("names days without any timezone shift", () => {
    expect(dayLabel("2026-10-08")).toEqual({ weekday: "Thu", day: 8, short: "Thu 8 Oct" });
    expect(dayLabel("2027-01-01").short).toBe("Fri 1 Jan");
  });
});

describe("the dashboard's money", () => {
  it("is the collected share of the booked value, to one decimal", () => {
    expect(collectedShare("677273.00", "2199356.00")).toBe(23.5);
    expect(collectedShare("100", "0")).toBe(100);
    expect(collectedShare("0", "0")).toBe(0);
    expect(collectedShare(undefined, undefined)).toBe(0);
  });

  it("labels shares as whole percentages", () => {
    expect(percentLabel(0)).toBe("0%");
    expect(percentLabel(0.004)).toBe("<1%");
    expect(percentLabel(0.256)).toBe("26%");
  });
});

describe("the dashboard's greeting", () => {
  it("follows the shop's clock, not the server's", () => {
    // 05:30 UTC = 11:00 in Kolkata; 08:00 UTC = 13:30; 13:00 UTC = 18:30.
    expect(greetingFor("Priya Nair", new Date("2026-10-08T05:30:00Z"))).toBe("Good morning, Priya");
    expect(greetingFor("Priya Nair", new Date("2026-10-08T08:00:00Z"))).toBe("Good afternoon, Priya");
    expect(greetingFor("Priya Nair", new Date("2026-10-08T13:00:00Z"))).toBe("Good evening, Priya");
    expect(greetingFor("", new Date("2026-10-08T13:00:00Z"))).toBe("Good evening");
  });
});
