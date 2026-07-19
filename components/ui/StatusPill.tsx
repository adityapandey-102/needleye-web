export type PillTone = "purple" | "pink" | "green" | "amber" | "blue" | "gray" | "red" | "dark-red";

const TONE_CLASSES: Record<PillTone, string> = {
  purple: "bg-primary-bg text-primary",
  pink: "bg-accent-bg text-accent",
  green: "bg-success-bg text-success",
  amber: "bg-warning-bg text-warning-text",
  blue: "bg-info-bg text-info",
  gray: "bg-gray-pill-bg text-text-secondary",
  red: "bg-error-bg text-error",
  "dark-red": "bg-danger-strong text-white",
};

export function StatusPill({ label, tone = "purple" }: { label: string; tone?: PillTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
