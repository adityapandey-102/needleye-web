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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-08" -> { weekday: "Thu", day: 8, short: "Thu 8 Oct" }. */
export function dayLabel(date: string): { weekday: string; day: number; short: string } {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
  return { weekday, day: d!, short: `${weekday} ${d} ${MONTHS[m! - 1]}` };
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
