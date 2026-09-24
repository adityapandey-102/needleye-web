"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  hasCapability,
  type OrderListItem,
  type Role,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Pager } from "../../../components/ui/Pager";
import { StatusPill } from "../../../components/ui/StatusPill";

const PAGE_SIZE = 20;

/**
 * A focused, single-bucket order list: just the table of orders in the given
 * dashboard bucket, paginated, with no dashboard stats or extra filters. Each
 * row opens the full order. Reached from the clickable summary cards
 * (/orders/bucket/[bucket]).
 */
export function BucketOrdersClient({ bucket, role }: { bucket: string; role: Role }) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const canSeePayment = hasCapability(role, "payments:read");

  useEffect(() => {
    let cancelled = false;
    // Inner async fn keeps setState out of the effect body itself (same pattern
    // as OrdersListClient/RevenueClient), satisfying the set-state-in-effect rule.
    const run = async () => {
      setLoading(true);
      try {
        const data = await ordersApi.list({ bucket, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        if (!cancelled) {
          setOrders(data.orders);
          setTotal(data.total);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bucket, page, reloadKey]);


  return (
    <Card>
      <CardHeader icon="📋" iconTone="blue" title="Matching orders" subtitle={`${total} order${total === 1 ? "" : "s"}`} />
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 p-6 text-sm text-error">
            <span>{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">No orders in this view right now.</div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-bg/70 text-left text-xs font-semibold text-primary/85">
                <th className="px-4 py-2.5 font-medium">Order ID</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Designer</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Due Date</th>
                <th className="px-4 py-2.5 font-medium">Timeline</th>
                {canSeePayment && <th className="px-4 py-2.5 font-medium">Payment</th>}
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="rows-in">
              {orders.map((order) => {
                const timeline = getTimelineSummary(order);
                return (
                  <tr key={order.id} className="border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap text-text-primary">{order.orderNumber}</td>
                    <td className="px-4 py-2.5">{order.customerName}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{order.designerName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill label={granularLabel(order.productionStatus)} />
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{formatDateOnly(order.dueDate)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
                    </td>
                    {canSeePayment && (
                      <td className="px-4 py-2.5">
                        <StatusPill
                          label={(order.paymentStatus ?? "").replace("_", " ")}
                          tone={order.paymentStatus === "fully_paid" ? "green" : "amber"}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" className="px-3 py-1.5 text-xs">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {!loading && !error && <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
    </Card>
  );
}
