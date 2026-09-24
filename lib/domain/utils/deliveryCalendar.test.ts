import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  compareMonths,
  deliveryLoadLevel,
  lastBookableDate,
  monthBounds,
  monthLabel,
  monthWeeks,
  shiftMonth,
} from "./deliveryCalendar";

describe("deliveryLoadLevel (mirrors the API's calendar colours)", () => {
  it("capacity 10 / near 8: 0-7 open, 8-9 filling, 10+ full", () => {
    expect(deliveryLoadLevel(7, 10, 8)).toBe("open");
    expect(deliveryLoadLevel(8, 10, 8)).toBe("filling");
    expect(deliveryLoadLevel(9, 10, 8)).toBe("filling");
    expect(deliveryLoadLevel(10, 10, 8)).toBe("full");
    expect(deliveryLoadLevel(13, 10, 8)).toBe("full");
  });
});

describe("month grids", () => {
  it("matches a real calendar: 1 Sep 2026 is a Tuesday, 1 Oct 2026 a Thursday (Sunday-first rows)", () => {
    const sep = monthWeeks({ year: 2026, month: 8 });
    expect(sep[0]).toEqual([null, null, "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
    expect(sep.flat().filter(Boolean)).toHaveLength(30);
    expect(monthWeeks({ year: 2026, month: 9 })[0]?.indexOf("2026-10-01")).toBe(4); // Thursday
  });

  it("pads every week to 7 cells", () => {
    for (const week of monthWeeks({ year: 2026, month: 9 })) expect(week).toHaveLength(7);
  });

  it("knows leap years: Feb 2028 has 29 days, Feb 2027 has 28", () => {
    expect(monthWeeks({ year: 2028, month: 1 }).flat().filter(Boolean)).toHaveLength(29);
    expect(monthBounds({ year: 2027, month: 1 })).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("labels months in words", () => {
    expect(monthLabel({ year: 2026, month: 9 })).toBe("October 2026");
  });
});

describe("month arithmetic", () => {
  it("clamps to the month's end: 31 Aug + 6 months is 28 Feb", () => {
    expect(addMonthsIso("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonthsIso("2027-08-31", 6)).toBe("2028-02-29"); // leap
  });

  it("the six-month booking window ends six months after today", () => {
    expect(lastBookableDate("2026-09-24")).toBe("2027-03-24");
  });

  it("shifts and compares months across a year boundary", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2027, month: 0 }, -1)).toEqual({ year: 2026, month: 11 });
    expect(compareMonths({ year: 2027, month: 0 }, { year: 2026, month: 11 })).toBe(1);
    expect(compareMonths({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });
});

/**
 * Proof the grid is the real Gregorian calendar, checked against rules that
 * don't use JavaScript's Date at all: the leap-year rule written out by hand,
 * and Zeller's congruence for the weekday. Every month from 1900 to 2200.
 */
describe("the grid is the genuine calendar (independent check, 1900-2200)", () => {
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const daysIn = (y: number, m: number) => (m === 1 && isLeap(y) ? 29 : DAYS[m]!);
  /** Zeller's congruence -> 0 = Sunday ... 6 = Saturday. `m` is 0-11. */
  const weekday = (y: number, m: number, d: number) => {
    let mm = m + 1;
    let yy = y;
    if (mm < 3) {
      mm += 12;
      yy -= 1;
    }
    const k = yy % 100;
    const j = Math.floor(yy / 100);
    const h = (d + Math.floor((13 * (mm + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
    return (h + 6) % 7; // Zeller's 0 = Saturday -> 0 = Sunday
  };
  const pad = (n: number) => String(n).padStart(2, "0");

  it("every month has the right number of days, each on the right weekday", () => {
    for (let y = 1900; y <= 2200; y++) {
      for (let m = 0; m < 12; m++) {
        const cells = monthWeeks({ year: y, month: m }).flat();
        const lead = cells.findIndex(Boolean);
        expect(lead, `${y}-${m + 1} first weekday`).toBe(weekday(y, m, 1));
        const dates = cells.filter(Boolean);
        expect(dates, `${y}-${m + 1} length`).toHaveLength(daysIn(y, m));
        dates.forEach((date, i) => expect(date).toBe(`${y}-${pad(m + 1)}-${pad(i + 1)}`));
        expect(monthBounds({ year: y, month: m }).to).toBe(`${y}-${pad(m + 1)}-${pad(daysIn(y, m))}`);
      }
    }
  });

  it("leap-year edge cases: 2000 and 2028 have 29 Feb; 1900, 2100 and 2027 don't", () => {
    expect(monthBounds({ year: 2000, month: 1 }).to).toBe("2000-02-29");
    expect(monthBounds({ year: 2028, month: 1 }).to).toBe("2028-02-29");
    expect(monthBounds({ year: 1900, month: 1 }).to).toBe("1900-02-28");
    expect(monthBounds({ year: 2100, month: 1 }).to).toBe("2100-02-28");
    expect(monthBounds({ year: 2027, month: 1 }).to).toBe("2027-02-28");
  });

  it("known dates land on their real weekdays", () => {
    // 29 Feb 2028 is a Tuesday; 1 Jan 2027 a Friday; 25 Dec 2026 a Friday.
    const col = (iso: string) => {
      const [y, m] = iso.split("-").map(Number);
      const cells = monthWeeks({ year: y!, month: m! - 1 }).flat();
      return cells.indexOf(iso) % 7;
    };
    expect(col("2028-02-29")).toBe(2);
    expect(col("2027-01-01")).toBe(5);
    expect(col("2026-12-25")).toBe(5);
  });
});
