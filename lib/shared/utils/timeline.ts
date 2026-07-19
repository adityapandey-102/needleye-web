import { diffDays, parseDateOnly, pluralize, startOfDay } from "./date";
import type { TimelineSummary } from "../types";

/** Ported verbatim from prototype/script.js getTimelineSummary(). */
export function getTimelineSummary(order: {
  dueDate?: string | null;
  bookingDate?: string | null;
}): TimelineSummary {
  const dueDate = parseDateOnly(order?.dueDate);
  const bookingDate = parseDateOnly(order?.bookingDate);
  const today = startOfDay(new Date());

  if (!dueDate) {
    return {
      statusLabel: "N/A",
      tone: "gray",
      daysRemainingLabel: "N/A",
      orderAgeLabel: bookingDate ? formatDaysLabel(diffDays(today, bookingDate), "Day") : "N/A",
      remainingDays: null,
    };
  }

  const remainingDays = diffDays(dueDate, today);
  let statusLabel: TimelineSummary["statusLabel"] = "ON TRACK";
  let tone: TimelineSummary["tone"] = "green";

  if (remainingDays < 0) {
    statusLabel = "OVERDUE";
    tone = "dark-red";
  } else if (remainingDays < 3) {
    statusLabel = "URGENT";
    tone = "red";
  } else if (remainingDays <= 7) {
    statusLabel = "DUE SOON";
    tone = "amber";
  }

  return {
    statusLabel,
    tone,
    daysRemainingLabel:
      remainingDays < 0
        ? `${Math.abs(remainingDays)} ${pluralize("Day", Math.abs(remainingDays))} Overdue`
        : `${remainingDays} ${pluralize("Day", remainingDays)} Left`,
    orderAgeLabel: bookingDate ? formatDaysLabel(Math.max(diffDays(today, bookingDate), 0), "Day") : "N/A",
    remainingDays,
  };
}

function formatDaysLabel(value: number, unit: string): string {
  return `${value} ${pluralize(unit, value)}`;
}
