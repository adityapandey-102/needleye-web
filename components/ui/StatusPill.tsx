export type PillTone = "purple" | "pink" | "green" | "amber" | "blue" | "gray" | "red" | "dark-red" | "gold";

const TONE_CLASSES: Record<PillTone, string> = {
  purple: "bg-primary-bg text-primary ring-primary/10",
  pink: "bg-accent-bg text-accent ring-accent/15",
  green: "bg-success-bg text-success ring-success/15",
  amber: "bg-warning-bg text-warning-text ring-warning/15",
  blue: "bg-info-bg text-info ring-info/15",
  gray: "bg-gray-pill-bg text-text-secondary ring-black/5",
  red: "bg-error-bg text-error ring-error/15",
  "dark-red": "bg-danger-strong text-white ring-white/10",
  gold: "bg-gold-bg text-gold ring-gold/20",
};

export function StatusPill({ label, tone = "purple" }: { label: string; tone?: PillTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
