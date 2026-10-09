/**
 * Small, pure helpers for the owner's Reports page (/reports): which section
 * the URL asks for, how the Working rule's look-back windows read in plain
 * words, and the initials shown in a person's avatar.
 */

/** The three sections of /reports, in tab order. `?view=` holds one of these. */
export const REPORT_VIEWS = ["team", "staff", "activity"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

/**
 * The section a `?view=` value asks for. Anything missing or unknown (an old
 * bookmark, a typo) opens Team status, so the page never comes up blank.
 */
export function parseReportView(value: string | string[] | null | undefined): ReportView {
  const v = Array.isArray(value) ? value[0] : value;
  return (REPORT_VIEWS as readonly string[]).includes(v ?? "") ? (v as ReportView) : "team";
}

/**
 * "in the last 30 days" / "in the last 24 hours" / "in the last day". If the
 * API didn't send a usable number (say the web deploys a moment before the
 * API does), it reads "recently" rather than "in the last undefined hours".
 */
export function lookBackPhrase(value: number | null | undefined, unit: "day" | "hour"): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "recently";
  return value === 1 ? `in the last ${unit}` : `in the last ${value} ${unit}s`;
}

/** Up to two initials for an avatar: "Priya Nair" -> "PN", "anita" -> "A", "" -> "?". */
export function initialsOf(fullName: string): string {
  const letters = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return letters || "?";
}

/** Whole-number share of the team that is Working (0 when there's no one). */
export function workingShare(working: number, idle: number): number {
  const total = working + idle;
  return total > 0 ? Math.round((working / total) * 100) : 0;
}
