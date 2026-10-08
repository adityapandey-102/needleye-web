"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateOnly, getPaymentDue, paidFraction, type OrderListItem } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { CARD_GRID_CELL, Card, CardHeader } from "../../../components/ui/Card";
import { ButtonLink } from "../../../components/ui/Button";
import { Pager } from "../../../components/ui/Pager";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Icon } from "../../../components/ui/Icon";
import { OrdersEmpty, OrdersTableSkeleton } from "./OrdersTable";

const PAGE_SIZE = 20;

const TABS = [
  { bucket: "pending_payment", label: "All outstanding" },
  { bucket: "payment_overdue", label: "Overdue" },
  { bucket: "payment_upcoming", label: "Upcoming" },
] as const;

/**
 * Dedicated pending-payments view: only orders with an outstanding balance,
 * with payment-focused columns and an Overdue / Upcoming filter (by the
 * order's next-payment date). No dashboard stats -- just the list + pager:
 * cards on phones and tablets (what's left to collect first), a table on
 * desktop. Each row opens the full order to record a payment.
 */
export function PendingPaymentsClient() {
  const router = useRouter();
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

  return (
    <Card>
      <CardHeader
        icon={<Icon name="wallet" size={17} />}
        title="Orders needing collection"
        subtitle={loading && orders.length === 0 ? "Loading…" : `${total.toLocaleString("en-IN")} ${total === 1 ? "order" : "orders"} with money still to collect`}
        wideAction
        action={
          <div role="group" aria-label="Show" className="flex rounded-app border border-border bg-app-bg/70 p-0.5 sm:inline-flex">
            {TABS.map((t) => (
              <button
                key={t.bucket}
                type="button"
                aria-pressed={bucket === t.bucket}
                onClick={() => changeTab(t.bucket)}
                className={`flex-auto rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 sm:flex-none sm:px-3 ${
                  bucket === t.bucket ? "bg-card text-primary shadow-app" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <div className="m-5 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
          <span>{error}</span>
          <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : loading && orders.length === 0 ? (
        <OrdersTableSkeleton />
      ) : orders.length === 0 ? (
        <OrdersEmpty title="Nothing to collect here" hint="No order in this view has money outstanding." />
      ) : (
        <div className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
          <div className="grid md:grid-cols-2 lg:hidden">
            {orders.map((order, i) => {
              const due = getPaymentDue({
                totalAmount: order.totalAmount,
                amountPaid: order.amountPaid,
                paymentStatus: order.paymentStatus,
                nextPaymentDate: order.nextPaymentDate,
              });
              const share = Math.round(paidFraction(order.amountPaid ?? 0, order.totalAmount ?? 0) * 100);
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                  className={`${CARD_GRID_CELL} animate-fade-in block px-5 py-4 transition-colors hover:bg-app-bg/70 active:bg-primary-bg/60`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-[15px] text-text-primary">{order.customerName}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-text-muted">
                        {order.orderNumber}
                        {order.phone && ` · ${order.phone}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="figure text-[17px] leading-tight text-warning">{formatCurrency(due.outstanding)}</div>
                      <div className="text-[11px] text-text-muted">to collect</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2 text-[11px] text-text-muted">
                    <span>
                      <span className="figure text-[12px] text-text-secondary">{formatCurrency(order.amountPaid ?? 0)}</span> paid of{" "}
                      {formatCurrency(order.totalAmount ?? 0)}
                    </span>
                    <span>{share}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-border-light">
                    <div className="grow-x h-full rounded-full bg-success" style={{ width: `${share}%` }} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
                    <StatusPill label={due.label} tone={due.tone} />
                    {order.nextPaymentDate && (
                      <span>
                        Next {formatDateOnly(order.nextPaymentDate)} · {due.daysLabel}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="relative hidden overflow-x-auto lg:block">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-xs text-text-muted">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="w-44 px-4 py-2.5 font-medium">Paid</th>
                  <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                  <th className="px-4 py-2.5 font-medium">Next payment</th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    <span className="sr-only">Collect</span>
                  </th>
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
                  const share = Math.round(paidFraction(order.amountPaid ?? 0, order.totalAmount ?? 0) * 100);
                  return (
                    <tr
                      key={order.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("a")) return;
                        router.push(`/orders/${order.id}`);
                      }}
                      className="group cursor-pointer border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30"
                    >
                      <td className="px-5 py-3 font-medium whitespace-nowrap text-text-primary">{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{order.customerName}</div>
                        {order.phone && <div className="mt-0.5 text-[11px] text-text-muted">{order.phone}</div>}
                      </td>
                      <td className="figure px-4 py-3 text-right text-text-secondary">{formatCurrency(order.totalAmount ?? 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="figure text-text-secondary">{formatCurrency(order.amountPaid ?? 0)}</span>
                          <span className="text-[10.5px] text-text-muted">{share}%</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-light">
                          <div className="grow-x h-full rounded-full bg-success" style={{ width: `${share}%` }} />
                        </div>
                      </td>
                      <td className="figure px-4 py-3 text-right font-semibold text-warning">{formatCurrency(due.outstanding)}</td>
                      <td className="px-4 py-3">
                        <div className="text-text-secondary">{order.nextPaymentDate ? formatDateOnly(order.nextPaymentDate) : "Not scheduled"}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <StatusPill label={due.label} tone={due.tone} />
                          {order.nextPaymentDate && <span className="text-[11px] text-text-muted">{due.daysLabel}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ButtonLink href={`/orders/${order.id}`} variant="outline" className="px-3 py-1.5 text-xs group-hover:border-primary/40 group-hover:text-primary">
                          Collect
                        </ButtonLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!error && (orders.length > 0 || page > 0) && <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
    </Card>
  );
}
