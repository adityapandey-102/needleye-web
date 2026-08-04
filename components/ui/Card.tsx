export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-app-lg border border-border bg-card shadow-app print:border-neutral-300 print:shadow-none ${className}`}>
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
  icon: string;
  iconTone?: "purple" | "pink" | "green" | "amber" | "blue";
  title: string;
  subtitle?: string;
  /** Optional right-aligned content in the header (e.g. a compact status stepper or a button). */
  action?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    purple: "bg-primary-bg text-primary",
    pink: "bg-accent-bg text-accent",
    green: "bg-success-bg text-success",
    amber: "bg-warning-bg text-warning",
    blue: "bg-info-bg text-info",
  };

  return (
    <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-app text-base ${toneClasses[iconTone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        {subtitle && <div className="truncate text-xs text-text-muted">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
