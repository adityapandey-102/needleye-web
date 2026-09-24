import { toDateInputValue } from "./date";

/**
 * Pure date maths for the delivery calendar. Everything works on "YYYY-MM-DD"
 * strings with UTC arithmetic, so a viewer's timezone or a DST change can
 * never shift a day -- the classic off-by-one in calendar UIs.
 */

/** Mirror of needleye-api's delivery-capacity.rules deliveryLoadLevel. */
export type DeliveryLoadLevel = "open" | "filling" | "full";

/** How far ahead the calendar lets anyone book: six months (a business rule). */
export const DELIVERY_BOOKING_WINDOW_MONTHS = 6;

/**
 * open (blue) below `nearCapacity`; filling (amber) from it; full (red) at or
 * above `capacity` -- booking one more exceeds it. Thresholds come from the API.
 */
export function deliveryLoadLevel(count: number, capacity: number, nearCapacity: number): DeliveryLoadLevel {
  if (count >= capacity) return "full";
  if (count >= nearCapacity) return "filling";
  return "open";
}

export interface YearMonth {
  year: number;
  /** 0-11 */
  month: number;
}

function parts(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y!, month: m! - 1, day: d! };
}

function iso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Today in the viewer's local calendar (the date they'd write down). */
export function isoToday(now: Date = new Date()): string {
  return toDateInputValue(now);
}

/** `n` months later, clamped to the month's end: 31 Aug + 6 -> 28 Feb (29 in a leap year). */
export function addMonthsIso(date: string, n: number): string {
  const { year, month, day } = parts(date);
  const target = new Date(Date.UTC(year, month + n, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  return iso(ty, tm, Math.min(day, daysInMonth(ty, tm)));
}

/** The last date the calendar lets anyone book: today + DELIVERY_BOOKING_WINDOW_MONTHS. */
export function lastBookableDate(today: string): string {
  return addMonthsIso(today, DELIVERY_BOOKING_WINDOW_MONTHS);
}

export function yearMonthOf(date: string): YearMonth {
  const { year, month } = parts(date);
  return { year, month };
}

export function shiftMonth(ym: YearMonth, n: number): YearMonth {
  const d = new Date(Date.UTC(ym.year, ym.month + n, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** Negative if a is earlier, 0 if the same month, positive if later. */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** First and last date of the month, inclusive. */
export function monthBounds(ym: YearMonth): { from: string; to: string } {
  return { from: iso(ym.year, ym.month, 1), to: iso(ym.year, ym.month, daysInMonth(ym.year, ym.month)) };
}

/**
 * The month as Sunday-first weeks of dates, padded with null before the 1st
 * and after the last day so every week has exactly 7 cells.
 */
export function monthWeeks(ym: YearMonth): (string | null)[][] {
  const lead = new Date(Date.UTC(ym.year, ym.month, 1)).getUTCDay(); // 0 = Sunday
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth(ym.year, ym.month); day++) cells.push(iso(ym.year, ym.month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "October 2026" */
export function monthLabel(ym: YearMonth): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(ym.year, ym.month, 1)),
  );
}

/** "Mon, 12 Oct 2026" -- for sentences like "... is fully booked". */
export function longDateLabel(date: string): string {
  const { year, month, day } = parts(date);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, day)));
}

/** Day of the month as a number, for a calendar cell. */
export function dayOfMonth(date: string): number {
  return parts(date).day;
}
