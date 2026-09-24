import { Icon } from "./Icon";

/** A panel: warm paper, a hairline border and a soft warm shadow. */
export function Card({
  children,
  className = "",
  hover = false,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Clickable card: lifts a touch and deepens its shadow on hover. */
  hover?: boolean;
  /** A gold hairline along the top -- reserved for the hero panel on a page. */
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-app-lg border border-border bg-card shadow-app print:border-neutral-300 print:shadow-none ${
        accent ? "card-accent-top" : ""
      } ${hover ? "lift hover:border-primary/25" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const TONES: Record<string, string> = {
  purple: "bg-primary-bg text-primary ring-primary/10",
  pink: "bg-primary-bg text-primary ring-primary/10",
  blue: "bg-primary-bg text-primary ring-primary/10",
  green: "bg-primary-bg text-primary ring-primary/10",
  amber: "bg-gold-bg text-gold ring-gold/15",
  gold: "bg-gold-bg text-gold ring-gold/15",
};

/**
 * Panel heading: a brand-tinted icon badge, the title in the display face, an
 * optional one-line subtitle and a right-aligned action. Icon badges use the
 * brand's burgundy (or gold for `amber`/`gold`) -- one family of colours, not
 * a rainbow; colour for meaning is kept for statuses and money.
 */
export function CardHeader({
  icon,
  iconTone = "purple",
  title,
  subtitle,
  action,
}: {
  /** An emoji (resolved to a Lucide icon via <Icon>) or an <Icon>/element. */
  icon: string | React.ReactNode;
  iconTone?: "purple" | "pink" | "green" | "amber" | "blue" | "gold";
  title: string;
  subtitle?: string;
  /** Optional right-aligned content in the header (e.g. a compact status stepper or a button). */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border-light px-5 py-3.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-app ring-1 ring-inset ${TONES[iconTone] ?? TONES.purple}`}
        aria-hidden
      >
        {typeof icon === "string" ? <Icon emoji={icon} size={17} /> : icon}
      </div>
      <div className="min-w-0">
        <div className="font-serif text-[17px] leading-snug text-text-primary">{title}</div>
        {subtitle && <div className="truncate text-xs text-text-muted">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
