import Link from "next/link";
import type { OrderStats } from "../../../../lib/domain";
import { Icon, type IconName } from "../../../../components/ui/Icon";
import { CountUp } from "../../../../components/ui/CountUp";

type Tone = "muted" | "warning" | "error" | "success";

/** Colour only where it carries meaning. */
const CAPTION: Record<Tone, string> = {
  muted: "text-text-muted",
  warning: "text-warning-text",
  error: "text-error",
  success: "text-success",
};
const DOT: Record<Tone, string> = {
  muted: "bg-accent-light",
  warning: "bg-warning",
  error: "bg-error",
  success: "bg-success",
};

/** Five cells never leave a gap: phones 1 + 2 + 2, tablets 3 + 2 (on a six-column grid), desktop one row. */
const SPAN = ["col-span-2 lg:col-span-1", "sm:col-span-2 lg:col-span-1", "sm:col-span-2 lg:col-span-1", "sm:col-span-3 lg:col-span-1", "sm:col-span-3 lg:col-span-1"];

/**
 * Today at a glance: five numbers on light paper with the gold top line and a
 * fine gold outline (the Payments band below keeps the brand red), each
 * opening its list.
 */
export function KpiStrip({ stats }: { stats: OrderStats }) {
  const cells: { href: string; icon: IconName; label: string; value: number; caption: string; tone: Tone }[] = [
    { href: "/orders/bucket/active", icon: "package", label: "Active orders", value: stats.active, caption: `${stats.thisMonth.toLocaleString("en-IN")} booked this month`, tone: "muted" },
    { href: "/orders/bucket/urgent", icon: "hourglass", label: "Due in 3 days", value: stats.urgent, caption: "Due soon", tone: "warning" },
    { href: "/orders/bucket/overdue", icon: "alert", label: "Overdue", value: stats.overdue, caption: "Past the due date", tone: "error" },
    { href: "/orders/bucket/ready", icon: "shirt", label: "Ready for delivery", value: stats.ready, caption: "Waiting for the customer", tone: "success" },
    { href: "/orders/bucket/delivered_this_month", icon: "check-circle", label: "Delivered", value: stats.deliveredThisMonth, caption: "This month", tone: "success" },
  ];

  return (
    <section aria-label="At a glance" className="card-accent-top rounded-app-lg bg-card shadow-app-md ring-1 ring-gold/30">
      <div className="stagger-in grid grid-cols-2 gap-px bg-border-light sm:grid-cols-6 lg:grid-cols-5">
        {cells.map((c, i) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group relative flex flex-col bg-card px-5 pt-5 pb-4 transition-colors duration-200 hover:bg-primary-bg/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset ${SPAN[i]}`}
          >
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-text-secondary">
              <span className="flex h-7 w-7 items-center justify-center rounded-app bg-primary-bg text-primary ring-1 ring-inset ring-primary/10 transition-transform duration-200 group-hover:scale-110">
                <Icon name={c.icon} size={14} />
              </span>
              {c.label}
            </span>
            <span className="figure mt-2.5 text-[30px] leading-none text-text-primary transition-colors group-hover:text-primary">
              <CountUp to={c.value} />
            </span>
            <span className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${CAPTION[c.tone]}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[c.tone]}`} />
              {c.caption}
            </span>
            <Icon name="chevron-right" size={15} className="absolute top-5 right-4 text-primary/0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary/60" />
          </Link>
        ))}
      </div>
    </section>
  );
}
