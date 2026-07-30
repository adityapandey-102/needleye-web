"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, hasCapability, type OrderStats, type Role } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";

const ICON_TONE_CLASSES = {
  purple: "bg-primary-bg text-primary",
  amber: "bg-warning-bg text-warning",
  green: "bg-success-bg text-success",
  pink: "bg-accent-bg text-accent",
  red: "bg-red-100 text-red-700",
} as const;

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
      <div className="mb-4 flex items-center justify-between rounded-app-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        <span>{error}</span>
        <button onClick={() => location.reload()} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  if (!stats) return <StatCardsSkeleton />;

  const canSeePayments = stats.pendingPayments !== undefined;
  const canSeeRevenue = hasCapability(role, "reports:financial");

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard href="/orders" icon="📦" tone="purple" value={stats.total} label="Total Orders" caption="All time" captionTone="muted" />
        <StatCard href="/orders/bucket/this_month" icon="🗓️" tone="purple" value={stats.thisMonth} label="This Month" caption="Booked this month" captionTone="muted" />
        <StatCard href="/orders/bucket/active" icon="🔨" tone="amber" value={stats.active} label="Active Orders" caption="Not yet delivered" captionTone="muted" />
        <StatCard href="/orders/bucket/production" icon="🧵" tone="amber" value={stats.inProduction} label="In Production" caption="Cutting → QC" captionTone="muted" />
        <StatCard href="/orders/bucket/completed" icon="✅" tone="green" value={stats.completed} label="Completed" caption="Ready / Delivered" captionTone="success" />
        <StatCard href="/orders/bucket/overdue" icon="⏰" tone="red" value={stats.overdue} label="Overdue" caption="Past due date" captionTone="error" />
        <StatCard href="/orders/bucket/urgent" icon="⚠️" tone="amber" value={stats.urgent} label="Urgent" caption="Due within 3 days" captionTone="error" />
        {canSeePayments && (
          <StatCard href="/orders/pending-payments" icon="💳" tone="pink" value={stats.pendingPayments!} label="Pending Payments" caption="Needs collection" captionTone="error" />
        )}
      </div>

      {canSeePayments && (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <MetricCard href={canSeeRevenue ? "/revenue" : undefined} label="Collected Revenue" value={formatCurrency(stats.collectedRevenue)} />
          <MetricCard href="/orders/pending-payments" label="Outstanding Revenue" value={formatCurrency(stats.outstandingRevenue)} />
          <MetricCard href="/orders/pending-payments" label="Pending Payments" value={stats.pendingPayments!} />
        </div>
      )}
    </div>
  );
}

function StatCard({
  href,
  icon,
  tone,
  value,
  label,
  caption,
  captionTone,
}: {
  href: string;
  icon: string;
  tone: keyof typeof ICON_TONE_CLASSES;
  value: number;
  label: string;
  caption: string;
  captionTone: "success" | "error" | "muted";
}) {
  const captionClass =
    captionTone === "success" ? "text-success" : captionTone === "error" ? "text-error" : "text-text-muted";
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-app-lg border border-border bg-card p-4 shadow-app transition-shadow hover:shadow-app-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-app text-lg ${ICON_TONE_CLASSES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-text-primary">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-text-muted">{label}</div>
        <div className={`mt-1 text-[11px] font-semibold ${captionClass}`}>{caption}</div>
      </div>
    </Link>
  );
}

function MetricCard({ href, label, value }: { href?: string; label: string; value: string | number }) {
  const inner = (
    <>
      <div className="text-[11px] font-bold tracking-wide text-text-muted uppercase">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-text-primary">{value}</div>
    </>
  );
  const className =
    "block rounded-app-lg border border-border bg-card p-3.5 transition-shadow hover:shadow-app-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className="rounded-app-lg border border-border bg-card p-3.5">{inner}</div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="h-22 animate-pulse rounded-app-lg border border-border-light bg-primary-bg/30" />
      ))}
    </div>
  );
}
