"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { granularLabel, longDateLabel, productCategoryDisplayName, type OrderListItem } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";

const PAGE_SIZE = 20;

/**
 * One delivery day's orders -- what the delivery calendar shows when the owner
 * or production manager clicks a day. Fetched for that day only
 * (GET /orders?dueOn=), 20 at a time.
 */
export function DeliveryDayList({ date, onBack }: { date: string; onBack: () => void }) {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list({ dueOn: date, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders);
        setTotal(res.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load this day's deliveries");
      });
    return () => {
      cancelled = true;
    };
  }, [date, page, reloadKey]);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-app px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary-bg"
        >
          <Icon name="chevron-right" size={16} className="rotate-180" />
          Back to calendar
        </button>
        {orders && (
          <span className="rounded-full bg-primary-bg px-3 py-1 text-xs font-semibold text-primary">
            {total} {total === 1 ? "order" : "orders"} due
          </span>
        )}
      </div>
      <h3 className="font-serif text-xl text-text-primary">Deliveries on {longDateLabel(date)}</h3>

      <div className="mt-4">
        {error ? (
          <div className="rounded-app border border-error/25 bg-error-bg/50 px-4 py-3 text-sm text-error">
            {error}{" "}
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : !orders ? (
          <div className="flex flex-col gap-2" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-app" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-app border border-dashed border-border px-4 py-10 text-center">
            <Icon name="calendar" size={22} className="mx-auto text-text-muted" />
            <p className="mt-2 text-sm text-text-muted">No orders are due on this day.</p>
          </div>
        ) : (
          <>
            <ul className="stagger-in flex flex-col gap-2">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-app border border-border-light bg-card px-4 py-3 transition-colors hover:border-primary/25 hover:bg-primary-bg/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="figure text-sm text-primary">{o.orderNumber}</span>
                        <span className="truncate font-medium text-text-primary">{o.customerName}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="shirt" size={12} />
                          {productCategoryDisplayName(o.productCategory)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="palette" size={12} />
                          {o.designerName ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="scissors" size={12} />
                          {o.masterTailorName ?? "—"}
                        </span>
                      </div>
                    </div>
                    <StatusPill label={granularLabel(o.productionStatus)} tone={o.productionStatus === "delivered" ? "green" : "purple"} />
                    <Icon name="chevron-right" size={16} className="text-text-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            {total > PAGE_SIZE && (
              <div className="mt-3 overflow-hidden rounded-app border border-border-light">
                <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} className="border-t-0" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
