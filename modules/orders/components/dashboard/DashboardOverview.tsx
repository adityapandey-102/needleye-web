"use client";

import { useEffect, useState } from "react";
import { hasCapability, type OrderStats, type Role } from "../../../../lib/domain";
import { ordersApi } from "../../api/ordersApi";
import { KpiStrip } from "./KpiStrip";
import { PipelineCard } from "./PipelineCard";
import { DeliveriesCard } from "./DeliveriesCard";
import { MoneyStrip } from "./MoneyStrip";

/**
 * The orders dashboard (above the list): today's five numbers, the production
 * pipeline and the next two weeks of deliveries, and payments. One stats call
 * (GET /orders/stats, row-scoped by role); the deliveries chart loads its own
 * data for the roles that may book orders. Money appears only for roles that
 * see payments, revenue only for the Owner and Accountant.
 */
export function DashboardOverview({ role }: { role: Role }) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
        <span>{error}</span>
        <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  if (!stats) return <OverviewSkeleton />;

  const canSeePayments = stats.pendingPayments !== undefined;
  const canSeeDeliveries = hasCapability(role, "orders:create");

  return (
    <div className="mb-6 space-y-5">
      <KpiStrip stats={stats} showAllOrders={role === "owner_manager"} />
      {(stats.pipeline || canSeeDeliveries) && (
        <div className={`grid gap-5 ${stats.pipeline && canSeeDeliveries ? "lg:grid-cols-12" : ""}`}>
          {stats.pipeline && <PipelineCard className={canSeeDeliveries ? "lg:col-span-7" : ""} pipeline={stats.pipeline} active={stats.active} />}
          {canSeeDeliveries && <DeliveriesCard className={stats.pipeline ? "lg:col-span-5" : ""} />}
        </div>
      )}
      {canSeePayments && <MoneyStrip stats={stats} showRevenue={hasCapability(role, "reports:financial")} />}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mb-6 space-y-5" aria-busy="true" aria-label="Loading the dashboard">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-app-lg border border-border bg-border-light sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`skeleton h-[104px] ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="skeleton h-56 rounded-app-lg lg:col-span-7" />
        <div className="skeleton h-56 rounded-app-lg lg:col-span-5" />
      </div>
    </div>
  );
}
