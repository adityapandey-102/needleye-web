import Link from "next/link";
import type { OrderStats } from "../../../../lib/domain";
import { Icon, type IconName } from "../../../../components/ui/Icon";
import { CountUp } from "../../../../components/ui/CountUp";

export type Tone = "muted" | "warning" | "error" | "success";

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

/**
 * The cells never leave a gap. Five (most roles): phones 1 + 2 + 2, tablets
 * 3 + 2 (on a six-column grid), desktop one row of five. Six (the Owner, with
 * All orders): phones 2 + 2 + 2, tablets 3 + 3, desktop one row of six.
 */
const SPAN5 = ["col-span-2 lg:col-span-1", "sm:col-span-2 lg:col-span-1", "sm:col-span-2 lg:col-span-1", "sm:col-span-3 lg:col-span-1", "sm:col-span-3 lg:col-span-1"];
const SPAN6 = Array<string>(6).fill("sm:col-span-2 lg:col-span-1");

/**
 * Today at a glance: five numbers on light paper with the gold top line and a
 * fine gold outline (the Payments band below keeps the brand red), each
 * opening its list. The Owner also sees All orders -- every order ever booked.
 */
export function KpiStrip({ stats, showAllOrders = false }: { stats: OrderStats; showAllOrders?: boolean }) {
  const cells: BoardCell[] = [
    ...(showAllOrders
      ? [{ href: "/orders/bucket/all", icon: "list" as IconName, label: "All orders", value: stats.total, caption: "Since the shop began", tone: "muted" as Tone }]
      : []),
    { href: "/orders/bucket/active", icon: "package", label: "Active orders", value: stats.active, caption: `${stats.thisMonth.toLocaleString("en-IN")} booked this month`, tone: "muted" },
    { href: "/orders/bucket/urgent", icon: "hourglass", label: "Due in 3 days", value: stats.urgent, caption: "Due soon", tone: "warning" },
    { href: "/orders/bucket/overdue", icon: "alert", label: "Overdue", value: stats.overdue, caption: "Past the due date", tone: "error" },
    { href: "/orders/bucket/ready", icon: "shirt", label: "Ready for delivery", value: stats.ready, caption: "Waiting for the customer", tone: "success" },
    { href: "/orders/bucket/delivered_this_month", icon: "check-circle", label: "Delivered", value: stats.deliveredThisMonth, caption: "This month", tone: "success" },
  ];

  return (
    <section aria-label="At a glance" className="card-accent-top rounded-app-lg bg-card shadow-app-md ring-1 ring-gold/30">
      <div className={`stagger-in grid grid-cols-2 gap-px bg-border-light sm:grid-cols-6 ${cells.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        {cells.map((c, i) => (
          <BoardCellLink key={c.label} cell={c} className={(cells.length === 6 ? SPAN6 : SPAN5)[i]} />
        ))}
      </div>
    </section>
  );
}

export interface BoardCell {
  href: string;
  icon: IconName;
  label: string;
  value: number;
  caption: string;
  tone: Tone;
}

/**
 * One cell of a light number board (At a glance, Today): an icon and label,
 * the big count and a short caption, the whole cell a link to its list.
 */
export function BoardCellLink({ cell: c, className = "" }: { cell: BoardCell; className?: string }) {
  return (
    <Link
      href={c.href}
      // Compact on purpose (the owner asked for shorter boards): still a 90px+ tap target on a phone.
      className={`group relative flex flex-col bg-card px-4 pt-3.5 pb-3 transition-colors duration-200 hover:bg-primary-bg/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset lg:px-5 ${className}`}
    >
      <span className="flex items-center gap-2 text-[12.5px] leading-tight font-medium text-text-secondary">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-app-sm bg-primary-bg text-primary ring-1 ring-inset ring-primary/10 transition-transform duration-200 group-hover:scale-110">
          <Icon name={c.icon} size={13} />
        </span>
        {c.label}
      </span>
      <span className="figure mt-2 text-[24px] leading-none lg:text-[26px] text-text-primary transition-colors group-hover:text-primary">
        <CountUp to={c.value} />
      </span>
      <span className={`mt-1.5 flex items-center gap-1.5 text-xs leading-snug font-medium ${CAPTION[c.tone]}`}>
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[c.tone]}`} />
        {c.caption}
      </span>
      <Icon name="chevron-right" size={15} className="absolute top-3.5 right-3 text-primary/0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary/60" />
    </Link>
  );
}
