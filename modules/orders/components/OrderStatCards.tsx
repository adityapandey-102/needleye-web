"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, hasCapability, type OrderStats, type Role } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Icon, type IconName } from "../../../components/ui/Icon";

const ICON_TONE_CLASSES = {
  purple: "bg-primary-bg text-primary ring-primary/10",
  amber: "bg-warning-bg text-warning ring-warning/10",
  green: "bg-success-bg text-success ring-success/10",
  pink: "bg-accent-bg text-accent ring-accent/15",
  red: "bg-error-bg text-error ring-error/15",
} as const;

interface StatCardConfig {
  href: string;
  icon: string;
  tone: keyof typeof ICON_TONE_CLASSES;
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
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card, i) => (
          <StatCard key={card.label} {...card} index={i} />
        ))}
      </div>

      {/* Collected & Outstanding Revenue are financial figures -- shown only to
          roles with reports:financial (owner / accountant). Designers (and
          anyone with only payments:read) see just the actionable Pending
          Payments count, not the revenue totals. */}
      {canSeePayments && (
        <div className={`mt-3.5 grid grid-cols-1 gap-3 ${canSeeRevenue ? "sm:grid-cols-3" : ""}`}>
          {canSeeRevenue && (
            <>
              <MetricCard href="/revenue" label="Collected Revenue" value={formatCurrency(stats.collectedRevenue)} icon="wallet" tone="burgundy" />
              <MetricCard href="/orders/pending-payments" label="Outstanding Revenue" value={formatCurrency(stats.outstandingRevenue)} icon="trending-up" tone="gold" />
            </>
          )}
          <MetricCard href="/orders/pending-payments" label="Pending Payments" value={stats.pendingPayments!} icon="card" tone="plum" />
        </div>
      )}
    </div>
  );
}

function StatCard({ href, icon, tone, value, label, caption, captionTone, index }: StatCardConfig & { index: number }) {
  const captionClass =
    captionTone === "success" ? "text-success" : captionTone === "error" ? "text-error" : "text-text-muted";
  return (
    <Link
      href={href}
      style={{ animationDelay: `${index * 45}ms` }}
      className="animate-rise group flex items-start gap-3 rounded-app-lg border border-border bg-card p-4 shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-app-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-app ring-1 ring-inset transition-transform duration-200 group-hover:scale-105 ${ICON_TONE_CLASSES[tone]}`}
      >
        <Icon emoji={icon} size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl leading-tight font-extrabold text-text-primary tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-text-muted">{label}</div>
        <div className={`mt-1 text-[11px] font-semibold ${captionClass}`}>{caption}</div>
      </div>
    </Link>
  );
}

const METRIC_TONES = {
  burgundy: { card: "gradient-primary text-white", label: "text-white/70", chip: "bg-white/15 text-white ring-white/20" },
  gold: { card: "gradient-gold text-primary-dark", label: "text-primary-dark/70", chip: "bg-white/25 text-primary-dark ring-black/10" },
  plum: { card: "bg-primary-dark text-white", label: "text-white/60", chip: "bg-white/15 text-white ring-white/20" },
} as const;

function MetricCard({
  href,
  label,
  value,
  icon,
  tone,
}: {
  href?: string;
  label: string;
  value: string | number;
  icon: IconName;
  tone: keyof typeof METRIC_TONES;
}) {
  const t = METRIC_TONES[tone];
  const inner = (
    <>
      {/* Decorative sheen ring, echoing the reference dashboard's KPI tiles. */}
      <div aria-hidden className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -right-4 -bottom-8 h-20 w-20 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-bold tracking-wide uppercase ${t.label}`}>{label}</div>
          <div className="mt-1 truncate text-2xl font-extrabold tabular-nums">{value}</div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-app ring-1 ring-inset ${t.chip}`}>
          <Icon name={icon} size={22} />
        </div>
      </div>
    </>
  );
  const base = `relative block overflow-hidden rounded-app-lg p-4 shadow-app-md transition-all duration-200 ${t.card}`;
  const interactive = href ? " hover:-translate-y-0.5 hover:shadow-app-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" : "";
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
    <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="skeleton h-22 rounded-app-lg border border-border-light" />
      ))}
    </div>
  );
}
