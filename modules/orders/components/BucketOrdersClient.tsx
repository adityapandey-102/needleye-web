"use client";

import { useEffect, useState } from "react";
import { hasCapability, type OrderListItem, type Role } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { OrdersEmpty, OrdersTable, OrdersTableSkeleton } from "./OrdersTable";

const PAGE_SIZE = 20;

/**
 * A focused, single-bucket order list: the orders in one dashboard bucket,
 * paged, in the same table as All orders. Reached from the dashboard's
 * figures (/orders/bucket/[bucket]).
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
      <CardHeader
        icon={<Icon name="list" size={17} />}
        title="Matching orders"
        subtitle={loading && orders.length === 0 ? "Loading…" : `${total.toLocaleString("en-IN")} ${total === 1 ? "order" : "orders"}`}
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
        <OrdersEmpty title="Nothing here right now" hint="No orders are in this view at the moment." />
      ) : (
        <OrdersTable orders={orders} canSeePayment={canSeePayment} dimmed={loading} />
      )}
      {!error && (orders.length > 0 || page > 0) && <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
    </Card>
  );
}
