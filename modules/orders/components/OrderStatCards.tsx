"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, hasCapability, type OrderStats, type Role } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { CountUp } from "../../../components/ui/CountUp";

interface StatCardConfig {
  href: string;
  icon: string;
  /** Kept in the card list for meaning; the ledger strip colours only the caption. */
  tone: "purple" | "amber" | "green" | "pink" | "red";
  value: number;
  label: string;
  caption: string;
  captionTone: "success" | "error" | "muted";
}

/**
 * Self-fetching dashboard summary. Every card is a link to the matching
 * filtered orders view (via the ?bucket= query param) or, for revenue, the
 * revenue report. Payment cards render only when the API returned those
 * fields (absent, not zero, for master_tailor). New Overdue/Urgent cards
 * surface delivery-timeline risk.
 */
export function OrderStatCards({ role }: { role: Role }) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    ordersApi
      .stats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load stats");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/50 px-3 py-2 text-xs text-error">
        <span>{error}</span>
        <button onClick={() => location.reload()} className="font-semibold underline">
          Retry
        </button>
      </div>
    );
  }
  if (!stats) return <StatCardsSkeleton />;

  const canSeePayments = stats.pendingPayments !== undefined;
  const canSeeRevenue = hasCapability(role, "reports:financial");

  const cards: StatCardConfig[] = [
    { href: "/orders", icon: "📦", tone: "purple", value: stats.total, label: "Total Orders", caption: "All time", captionTone: "muted" },
    { href: "/orders/bucket/this_month", icon: "🗓️", tone: "purple", value: stats.thisMonth, label: "This Month", caption: "Booked this month", captionTone: "muted" },
    { href: "/orders/bucket/active", icon: "🔨", tone: "amber", value: stats.active, label: "Active Orders", caption: "Not yet delivered", captionTone: "muted" },
    { href: "/orders/bucket/production", icon: "🧵", tone: "amber", value: stats.inProduction, label: "In Production", caption: "Cutting → QC", captionTone: "muted" },
    { href: "/orders/bucket/completed", icon: "✅", tone: "green", value: stats.completed, label: "Completed", caption: "Ready / Delivered", captionTone: "success" },
    { href: "/orders/bucket/overdue", icon: "⏰", tone: "red", value: stats.overdue, label: "Overdue", caption: "Past due date", captionTone: "error" },
    { href: "/orders/bucket/urgent", icon: "⚠️", tone: "amber", value: stats.urgent, label: "Urgent", caption: "Due within 3 days", captionTone: "error" },
  ];
  if (canSeePayments) {
    cards.push({ href: "/orders/pending-payments", icon: "💳", tone: "pink", value: stats.pendingPayments!, label: "Pending Payments", caption: "Needs collection", captionTone: "error" });
  }

  return (
    <div className="mb-6">
      {/* One ledger strip, divided by hairlines (the 1px gap shows the border
          colour behind the cells) -- not a grid of separate boxed cards. */}
      <div className="stagger-in grid grid-cols-2 gap-px overflow-hidden rounded-app-lg border border-border bg-border-light shadow-app sm:grid-cols-4">
        {cards.map((card, i) => (
          <StatCard key={card.label} {...card} index={i} />
        ))}
      </div>

      {/* Collected & Outstanding Revenue are financial figures -- shown only to
          roles with reports:financial (owner / accountant). Designers (and
          anyone with only payments:read) see just the actionable Pending
          Payments count, not the revenue totals. */}
      {canSeePayments && (
        <div
          className={`stagger-in card-accent-top gradient-primary mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-app-lg shadow-app-md ${canSeeRevenue ? "sm:grid-cols-3" : ""}`}
        >
          {canSeeRevenue && (
            <>
              <MetricCard href="/revenue" label="Collected Revenue" value={formatCurrency(stats.collectedRevenue)} countTo={Number(stats.collectedRevenue)} money icon="wallet" tone="burgundy" />
              <MetricCard href="/orders/pending-payments" label="Outstanding Revenue" value={formatCurrency(stats.outstandingRevenue)} countTo={Number(stats.outstandingRevenue)} money icon="trending-up" tone="gold" />
            </>
          )}
          <MetricCard href="/orders/pending-payments" label="Pending Payments" value={String(stats.pendingPayments!)} countTo={stats.pendingPayments!} icon="card" tone="plum" />
        </div>
      )}
    </div>
  );
}

/**
 * One cell of the ledger strip: label with a small ink icon, the figure in the
 * display face, and the caption (coloured only when it carries meaning --
 * overdue, urgent, completed). `tone` / `index` are kept for the card config
 * but no longer paint the cell.
 */
function StatCard({ href, icon, value, label, caption, captionTone }: StatCardConfig & { index: number }) {
  const captionClass =
    captionTone === "success" ? "text-success" : captionTone === "error" ? "text-error" : "text-text-muted";
  return (
    <Link
      href={href}
      className="group flex flex-col bg-card px-5 py-4 transition-colors duration-200 hover:bg-primary-bg/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset"
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
        <span className="flex h-7 w-7 items-center justify-center rounded-app bg-primary-bg text-primary transition-transform duration-200 group-hover:scale-110">
          <Icon emoji={icon} size={15} />
        </span>
        {label}
      </div>
      <div className="figure mt-2.5 text-[30px] leading-none text-text-primary transition-colors group-hover:text-primary">
        <CountUp to={value} />
      </div>
      <div className={`mt-2 text-xs font-medium ${captionClass}`}>{caption}</div>
    </Link>
  );
}

const METRIC_TONES = {
  // The money band sits on the brand burgundy: collected in gold, the rest in white.
  burgundy: { value: "text-gold-light" },
  gold: { value: "text-white" },
  plum: { value: "text-white" },
} as const;

function MetricCard({
  href,
  label,
  value,
  icon,
  tone,
  countTo,
  money = false,
}: {
  href?: string;
  label: string;
  /** The exact, already-formatted text the figure settles on. */
  value: string;
  /** The same value as a number, for the count-up. */
  countTo: number;
  money?: boolean;
  icon: IconName;
  tone: keyof typeof METRIC_TONES;
}) {
  const t = METRIC_TONES[tone];
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[13px] font-medium text-white/75">
        <span className="flex h-7 w-7 items-center justify-center rounded-app bg-white/10 text-gold-light ring-1 ring-inset ring-white/15 transition-transform duration-200 group-hover:scale-110">
          <Icon name={icon} size={15} />
        </span>
        {label}
      </div>
      <div className={`figure mt-2.5 truncate text-[28px] leading-none ${t.value}`}>
        <CountUp
          to={countTo}
          final={value}
          format={(n) => (money ? "₹" + Math.round(n).toLocaleString("en-IN") : Math.round(n).toLocaleString("en-IN"))}
        />
      </div>
    </>
  );
  // Cells are transparent over the burgundy band; a faint divider separates them.
  const base = "group block px-5 py-4 transition-colors duration-200 [&:not(:first-child)]:border-white/10 sm:[&:not(:first-child)]:border-l max-sm:[&:not(:first-child)]:border-t";
  const interactive = href
    ? " hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset"
    : "";
  return href ? (
    <Link href={href} className={base + interactive}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-app-lg border border-border bg-border-light sm:grid-cols-4">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="skeleton h-28" />
      ))}
    </div>
  );
}
