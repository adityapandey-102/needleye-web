"use client";

import { useEffect, useState } from "react";
import { formatDate, type OrderStatusHistoryEntry } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";

/**
 * Self-fetching, like PaymentLedger -- read-only, so no `canManage` prop:
 * every role that can see an order at all (row-scoping already handles who
 * that is) can see its status history.
 */
export function OrderTimeline({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    ordersApi
      .history(orderId)
      .then((data) => {
        if (!cancelled) {
          setHistory(data.history);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load status history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <Card>
      <CardHeader icon="🕓" iconTone="blue" title="Status History" subtitle="Every production-status change, newest first" />
      <CardBody className="flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : error ? (
          <p className="text-xs text-error">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-text-muted">No status changes recorded yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {history.map((entry, i) => (
              <li key={entry.id} className="relative flex gap-3 pl-1">
                <div className="flex flex-col items-center">
                  <span className={`mt-1 h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                  {i < history.length - 1 && <span className="w-px flex-1 bg-border-light" />}
                </div>
                <div className="pb-2">
                  <div className="text-sm font-medium text-text-primary">{entry.label}</div>
                  <div className="text-[11px] text-text-muted">
                    {formatDate(entry.createdAt)}
                    {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
