import { describe, expect, it } from "vitest";
import { busiestDay, collectedShare, dayLabel, deliverySeries, greetingFor, nextDays, percentLabel, pipelineSegments } from "./dashboard";

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
