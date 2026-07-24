"use client";

import { useEffect, useState } from "react";
import { formatCurrency, type OrderStats } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";

const ICON_TONE_CLASSES = {
  purple: "bg-primary-bg text-primary",
  amber: "bg-warning-bg text-warning",
  green: "bg-success-bg text-success",
  pink: "bg-accent-bg text-accent",
} as const;

/**
 * Self-fetching, like PaymentLedger/OrderTimeline -- mirrors the prototype's
 * 4 stat cards + 3-metric row (product-details.html), parity confirmed
 * against prototype/styles.css's .stat-card/.metric-card rules. Payment
 * cards (Pending Payments, the metric row) render only when the API
 * actually returned those fields -- absent, not zero, for master_tailor.
 */
export function OrderStatCards() {
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

  if (error) return <p className="mb-4 text-xs text-error">{error}</p>;
  if (!stats) return <StatCardsSkeleton />;

  const canSeePayments = stats.pendingPayments !== undefined;

  return (
    <div className="mb-6">
      <div className={`grid grid-cols-2 gap-3.5 ${canSeePayments ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <StatCard icon="📦" tone="purple" value={stats.total} label="Total Orders" caption="This month" captionTone="success" />
        <StatCard icon="🔨" tone="amber" value={stats.active} label="Active Orders" caption="In production" captionTone="success" />
        <StatCard icon="✅" tone="green" value={stats.completed} label="Completed Orders" caption="Ready / Delivered" captionTone="success" />
        {canSeePayments && (
          <StatCard
            icon="💳"
            tone="pink"
            value={stats.pendingPayments!}
            label="Pending Payments"
            caption="Needs collection"
            captionTone="error"
          />
        )}
      </div>

      {canSeePayments && (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <MetricCard label="Collected Revenue" value={formatCurrency(stats.collectedRevenue)} />
          <MetricCard label="Outstanding Revenue" value={formatCurrency(stats.outstandingRevenue)} />
          <MetricCard label="Pending Payments" value={stats.pendingPayments!} />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  tone,
  value,
  label,
  caption,
  captionTone,
}: {
  icon: string;
  tone: keyof typeof ICON_TONE_CLASSES;
  value: number;
  label: string;
  caption: string;
  captionTone: "success" | "error";
}) {
  return (
    <div className="flex items-start gap-3 rounded-app-lg border border-border bg-card p-4 shadow-app transition-shadow hover:shadow-app-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-app text-lg ${ICON_TONE_CLASSES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-text-primary">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-text-muted">{label}</div>
        <div className={`mt-1 text-[11px] font-semibold ${captionTone === "success" ? "text-success" : "text-error"}`}>{caption}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-app-lg border border-border bg-card p-3.5">
      <div className="text-[11px] font-bold tracking-wide text-text-muted uppercase">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-text-primary">{value}</div>
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[76px] animate-pulse rounded-app-lg border border-border-light bg-primary-bg/30" />
      ))}
    </div>
  );
}
