/** Ported verbatim from prototype/script.js date helpers. */

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function diffDays(laterDate: Date, earlierDate: Date): number {
  return Math.round((startOfDay(laterDate).getTime() - startOfDay(earlierDate).getTime()) / 86_400_000);
}

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function pluralize(unit: string, value: number): string {
  return Math.abs(value) === 1 ? unit : `${unit}s`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = parseDateOnly(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
