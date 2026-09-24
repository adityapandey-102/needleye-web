"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateOnly, getPaymentDue, type OrderListItem } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Icon } from "../../../components/ui/Icon";

const PAGE_SIZE = 20;

const TABS = [
  { bucket: "pending_payment", label: "All Outstanding" },
  { bucket: "payment_overdue", label: "Overdue" },
  { bucket: "payment_upcoming", label: "Upcoming" },
] as const;

/**
 * Dedicated pending-payments view: only orders with an outstanding balance,
 * with payment-focused columns and an Overdue / Upcoming filter (by the
 * order's next-payment date). No dashboard stats -- just the table + pager.
 * Each row opens the full order to record a payment.
 */
export function PendingPaymentsClient() {
  const [bucket, setBucket] = useState<string>("pending_payment");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function changeTab(next: string) {
    setBucket(next);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
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
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load pending payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bucket, page, reloadKey]);

  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNextPage = pageEnd < total;

  return (
    <Card>
      <CardHeader
        icon="💳"
        iconTone="pink"
        title="Orders needing collection"
        subtitle={`${total} order${total === 1 ? "" : "s"} with an outstanding balance`}
      />

      <div className="flex flex-wrap gap-2 border-b border-border-light px-4 py-3">
        {TABS.map((t) => (
          <Button
            key={t.bucket}
            variant={bucket === t.bucket ? "primary" : "outline"}
            className="px-3 py-1.5 text-xs"
            onClick={() => changeTab(t.bucket)}
          >
            {t.label}
          </Button>
        ))}
      </div>

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
          <div className="p-6 text-sm text-text-muted">No orders match this filter — nothing outstanding here.</div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-bg/70 text-left text-xs font-semibold text-primary/85">
                <th className="px-4 py-2.5 font-medium">Order ID</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Paid</th>
                <th className="px-4 py-2.5 font-medium">Outstanding</th>
                <th className="px-4 py-2.5 font-medium">Next Payment</th>
                <th className="px-4 py-2.5 font-medium">Payment Status</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="rows-in">
              {orders.map((order) => {
                const due = getPaymentDue({
                  totalAmount: order.totalAmount,
                  amountPaid: order.amountPaid,
                  paymentStatus: order.paymentStatus,
                  nextPaymentDate: order.nextPaymentDate,
                });
                return (
                  <tr key={order.id} className="border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap text-text-primary">{order.orderNumber}</td>
                    <td className="px-4 py-2.5">{order.customerName}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{formatCurrency(order.totalAmount ?? 0)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{formatCurrency(order.amountPaid ?? 0)}</td>
                    <td className="px-4 py-2.5 font-semibold text-text-primary">{formatCurrency(due.outstanding)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {order.nextPaymentDate ? formatDateOnly(order.nextPaymentDate) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill label={due.label} tone={due.tone} />
                      <div className="mt-0.5 text-[11px] text-text-muted">{due.daysLabel}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" className="px-3 py-1.5 text-xs">
                          Collect
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

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-3 text-xs text-text-muted">
          <span>
            Showing {pageStart}–{pageEnd} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              <Icon name="chevron-right" size={14} className="rotate-180" />
              Prev
            </Button>
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
              <Icon name="chevron-right" size={14} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
