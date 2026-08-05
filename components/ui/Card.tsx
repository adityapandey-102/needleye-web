import { Icon } from "./Icon";

export function Card({
  children,
  className = "",
  hover = false,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle lift + deeper shadow on hover (for interactive/clickable cards). */
  hover?: boolean;
  /** Adds a thin antique-gold top hairline — reserved for hero/feature cards. */
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-app-lg border border-border bg-card shadow-app print:border-neutral-300 print:shadow-none ${
        accent ? "card-accent-top" : ""
      } ${hover ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-lg" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  iconTone = "purple",
  title,
  subtitle,
  action,
}: {
  /** An emoji (resolved to a premium line icon via <Icon>) or an <Icon>/element. */
  icon: string | React.ReactNode;
  iconTone?: "purple" | "pink" | "green" | "amber" | "blue" | "gold";
  title: string;
  subtitle?: string;
  /** Optional right-aligned content in the header (e.g. a compact status stepper or a button). */
  action?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    purple: "bg-primary-bg text-primary ring-primary/10",
    pink: "bg-accent-bg text-accent ring-accent/10",
    green: "bg-success-bg text-success ring-success/10",
    amber: "bg-warning-bg text-warning ring-warning/10",
    blue: "bg-info-bg text-info ring-info/10",
    gold: "bg-gold-bg text-gold ring-gold/15",
  };

  return (
    <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-app text-base ring-1 ring-inset ${toneClasses[iconTone]}`}
      >
        {typeof icon === "string" ? <Icon emoji={icon} size={18} /> : icon}
      </div>
      <div className="min-w-0">
        <div className="font-serif text-[15px] font-bold text-text-primary">{title}</div>
        {subtitle && <div className="truncate text-xs text-text-muted">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
