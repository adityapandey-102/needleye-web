/**
 * The Orders list's Timeline filter. The values are what GET /orders accepts
 * as `timeline`, with the same meanings as the timeline pill
 * (getTimelineSummary): Overdue = past due; Urgent = due within 3 days; Due
 * soon = 3-7 days; On track = later; Delivered. (Booking year / month reuse
 * the Revenue page's revenueYears + MONTH_OPTIONS.)
 */
export const TIMELINE_FILTERS = [
  { value: "overdue", label: "Overdue" },
  { value: "urgent", label: "Urgent" },
  { value: "due_soon", label: "Due soon" },
  { value: "on_track", label: "On track" },
  { value: "delivered", label: "Delivered" },
] as const;

export type TimelineFilter = (typeof TIMELINE_FILTERS)[number]["value"];
