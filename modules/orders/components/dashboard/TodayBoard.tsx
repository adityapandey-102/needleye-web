import type { OrderStats } from "../../../../lib/domain";
import { pendingPaymentsHref } from "../../buckets";
import { BoardCellLink, type BoardCell } from "./KpiStrip";

/**
 * Today's work, as a second board in the At a glance style: the orders booked
 * today and to hand over today and, for roles that see payments, the payments
 * to collect today and those already past their date -- each cell opening its
 * list. The counts come with the dashboard's one stats call (the payment two
 * are absent for a role without payments, so their cells are too).
 *
 * The cells never leave a gap: four are 2 + 2 on phones and one row from
 * tablets up; two (no payments) always sit side by side.
 */
export function TodayBoard({ stats }: { stats: OrderStats }) {
  const cells: BoardCell[] = [
    { href: "/orders/bucket/booked_today", icon: "sparkles", label: "Booked today", value: stats.bookedToday, caption: "New orders today", tone: "muted" },
    { href: "/orders/bucket/due_today", icon: "calendar-clock", label: "Deliver today", value: stats.dueToday, caption: "Due for delivery today", tone: "warning" },
    ...(stats.paymentDueToday !== undefined
      ? [
          { href: pendingPaymentsHref("payment_due_today"), icon: "wallet", label: "Collect today", value: stats.paymentDueToday, caption: "Payments due today", tone: "warning" } satisfies BoardCell,
          { href: pendingPaymentsHref("payment_overdue"), icon: "alert", label: "Payment overdue", value: stats.paymentOverdue ?? 0, caption: "Past the payment date", tone: "error" } satisfies BoardCell,
        ]
      : []),
  ];

  return (
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="mb-2 text-sm font-semibold text-text-primary">
        Today
      </h2>
      <div className="card-accent-top rounded-app-lg bg-card shadow-app-md ring-1 ring-gold/30">
        <div className={`stagger-in grid grid-cols-2 gap-px bg-border-light ${cells.length === 4 ? "sm:grid-cols-4" : ""}`}>
          {cells.map((c) => (
            <BoardCellLink key={c.label} cell={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
