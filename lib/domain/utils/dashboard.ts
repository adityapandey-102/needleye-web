import { money } from "./money";
import { deliveryLoadLevel, type DeliveryLoadLevel } from "./deliveryCalendar";

/**
 * Pure maths behind the orders dashboard's graphics -- the components only
 * draw. Dates are "YYYY-MM-DD" strings with UTC arithmetic, like the delivery
 * calendar, so no timezone can shift a day.
 */

/** The production pipeline's groups, in flow order (mirror of needleye-api's PIPELINE_STAGE_GROUPS). */
export type PipelineKey = "design" | "received" | "production" | "checks" | "ready";

export const PIPELINE_STEPS: { key: PipelineKey; label: string; hint: string }[] = [
  { key: "design", label: "Design", hint: "Design pending or approved" },
  { key: "received", label: "Received", hint: "With the production manager" },
  { key: "production", label: "On the floor", hint: "Falls / Kutchu to Finishing" },
  { key: "checks", label: "Final checks", hint: "Quality check and alteration" },
  { key: "ready", label: "Ready", hint: "Waiting for the customer" },
];

export interface PipelineSegment {
  key: PipelineKey;
  label: string;
  hint: string;
  count: number;
  /** Share of the orders in progress, 0-1 (all 0 when there are none). */
  share: number;
}

export function pipelineSegments(pipeline: Partial<Record<PipelineKey, number>>): PipelineSegment[] {
  const counts = PIPELINE_STEPS.map((s) => Math.max(0, pipeline[s.key] ?? 0));
  const total = counts.reduce((a, b) => a + b, 0);
  return PIPELINE_STEPS.map((s, i) => ({ ...s, count: counts[i]!, share: total > 0 ? counts[i]! / total : 0 }));
}

/** `n` consecutive dates starting at `from`. */
export function nextDays(from: string, n: number): string[] {
  const [y, m, d] = from.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y!, m! - 1, d! + i)).toISOString().slice(0, 10));
}

export interface DeliveryDay {
  date: string;
  count: number;
  level: DeliveryLoadLevel;
}

/** Every day of the window in order -- a day the API didn't list has 0 -- with its load level. */
export function deliverySeries(
  days: { date: string; count: number }[],
  from: string,
  n: number,
  capacity: number,
  nearCapacity: number,
): DeliveryDay[] {
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  return nextDays(from, n).map((date) => {
    const count = byDate.get(date) ?? 0;
    return { date, count, level: deliveryLoadLevel(count, capacity, nearCapacity) };
  });
}

/** The busiest day of a series (the earliest, on a tie); null when nothing is due. */
export function busiestDay(series: DeliveryDay[]): DeliveryDay | null {
  return series.reduce<DeliveryDay | null>((best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best), null);
}

/** `date` moved by `n` days (negative goes back). */
export function shiftDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** The last day of `date`'s calendar month: "2026-02-10" -> "2026-02-28". */
export function monthEnd(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
}

/** How many days `from`..`to` covers, both ends included (0 when `to` is before `from`). */
export function daysInclusive(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1);
}

/** One slice of the deliveries chart, fetched on its own: days `offset`..`offset + length - 1` after the start. */
export interface DeliveryChunk {
  index: number;
  from: string;
  to: string;
  /** Days from the window's first day to this chunk's first day. */
  offset: number;
  length: number;
}

/**
 * Splits `horizon` days from `from` into chunks of `size` days (the last may be
 * shorter), so the chart can fetch each one only when it scrolls into view.
 */
export function deliveryChunks(from: string, horizon: number, size: number): DeliveryChunk[] {
  const chunks: DeliveryChunk[] = [];
  for (let offset = 0, index = 0; offset < horizon; offset += size, index++) {
    const length = Math.min(size, horizon - offset);
    chunks.push({ index, from: shiftDate(from, offset), to: shiftDate(from, offset + length - 1), offset, length });
  }
  return chunks;
}

/**
 * The one small window the deliveries summary needs: today to the end of this
 * month, stretched to at least two weeks so "This week" and "Next week" are
 * always inside it.
 */
export function deliverySummaryWindow(today: string): { from: string; to: string } {
  const twoWeeks = shiftDate(today, 13);
  const end = monthEnd(today);
  return { from: today, to: end > twoWeeks ? end : twoWeeks };
}

export interface DeliverySummary {
  /** Due from today to the end of this calendar month. */
  thisMonth: number;
  /** Due in the next 7 days, today included. */
  thisWeek: number;
  /** Due in days 8-14. */
  nextWeek: number;
  /** Days at capacity in the whole window. */
  fullDays: number;
}

/** The summary's four numbers from a series that starts today (see deliverySummaryWindow). */
export function deliverySummary(series: DeliveryDay[], today: string): DeliverySummary {
  const end = monthEnd(today);
  const sum = (days: DeliveryDay[]) => days.reduce((n, d) => n + d.count, 0);
  return {
    thisMonth: sum(series.filter((d) => d.date >= today && d.date <= end)),
    thisWeek: sum(series.slice(0, 7)),
    nextWeek: sum(series.slice(7, 14)),
    fullDays: series.filter((d) => d.level === "full").length,
  };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-08" -> { weekday: "Thu", day: 8, short: "Thu 8 Oct" }. */
export function dayLabel(date: string): { weekday: string; day: number; short: string } {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
  return { weekday, day: d!, short: `${weekday} ${d} ${MONTHS[m! - 1]}` };
}

/** A short date range: "9 – 22 Oct", or "26 Oct – 8 Nov" across a month end. */
export function rangeLabel(from: string, to: string): string {
  const a = dayLabel(from).short.split(" ");
  const b = dayLabel(to).short.split(" ");
  return a[2] === b[2] ? `${a[1]} – ${b[1]} ${b[2]}` : `${a[1]} ${a[2]} – ${b[1]} ${b[2]}`;
}

/** Share of the booked value already collected, 0-100 with one decimal (0 when nothing is booked). */
export function collectedShare(collected: string | number | undefined, outstanding: string | number | undefined): number {
  const c = money(collected ?? 0);
  const total = c.plus(money(outstanding ?? 0));
  if (total.lessThanOrEqualTo(0)) return 0;
  return Math.round(c.div(total).times(1000).toNumber()) / 10;
}

/** A share (0-1) as a whole percentage, with "<1%" for a small but non-zero share. */
export function percentLabel(share: number): string {
  if (share <= 0) return "0%";
  if (share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

/** The shop's time zone -- the API's BUSINESS_TIMEZONE. Staff work in it, whatever their device says. */
export const SHOP_TIME_ZONE = "Asia/Kolkata";

/** "Good morning, Priya" by the shop's clock (before 12, before 17, after). */
export function greetingFor(fullName: string, now: Date = new Date(), timeZone: string = SHOP_TIME_ZONE): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = fullName.trim().split(" ")[0] ?? "";
  return first ? `${part}, ${first}` : part;
}
