import Link from "next/link";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { requireReportsAccess } from "../../../modules/reports/requireReportsAccess";

const REPORTS: { href: string; icon: IconName; title: string; description: string }[] = [
  {
    href: "/reports/team",
    icon: "users",
    title: "Check team status",
    description: "Who is working and who is idle right now, with the orders in each person's hands.",
  },
  {
    href: "/reports/staff",
    icon: "bar-chart",
    title: "Check staff report",
    description: "One designer's or master tailor's month: orders booked, completed, overdue and pending payment.",
  },
  {
    href: "/reports/activity",
    icon: "history",
    title: "Check daily activity",
    description: "What everyone did on each of the last 7 days: orders created, stages moved, accounts changed.",
  },
];

/**
 * Owner-only (reports:staff) Reports home: three cards, one per report.
 * Nothing is fetched here -- each report loads only when it is opened.
 */
export default async function ReportsHomePage() {
  await requireReportsAccess();

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-muted">Your team at a glance. Pick a report to open it.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REPORTS.map((r, i) => (
          <Link
            key={r.href}
            href={r.href}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group animate-rise relative flex flex-col gap-4 overflow-hidden rounded-app-lg border border-border bg-card p-6 shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-app-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-primary-bg/60 blur-2xl"
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-app-lg bg-primary-bg text-primary ring-1 ring-inset ring-primary/10 transition-transform duration-200 group-hover:scale-105">
              <Icon name={r.icon} size={24} />
            </div>
            <div className="relative flex-1">
              <h2 className="font-serif text-lg font-bold text-text-primary">{r.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">{r.description}</p>
            </div>
            <span className="relative inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Open
              <Icon name="chevron-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
