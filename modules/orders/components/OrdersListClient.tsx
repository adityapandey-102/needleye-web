"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  hasCapability,
  type Order,
  type Role,
} from "../../../lib/domain";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Icon } from "../../../components/ui/Icon";
import { KanbanBoard } from "./KanbanBoard";

type ViewMode = "table" | "kanban";

/** Table page size, and the (bounded) number of cards the Kanban board pulls in one go. */
const PAGE_SIZE = 20;
const KANBAN_LIMIT = 100;

/** Human labels for the dashboard buckets a summary card can deep-link into (?bucket=). */
const BUCKET_LABELS: Record<string, string> = {
  active: "Active orders (not yet delivered)",
  production: "In production (cutting → QC)",
  completed: "Completed (ready / delivered)",
  ready: "Ready for delivery",
  delivered: "Delivered",
  pending_payment: "Pending payments",
  overdue: "Overdue (past due date)",
  urgent: "Urgent (due within 3 days)",
  this_month: "Booked this month",
};

export function OrdersListClient({
  role,
  userId,
  initialBucket,
}: {
  role: Role;
  userId: string;
  initialBucket?: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [bucket, setBucket] = useState(initialBucket ?? "");

  const [search, setSearch] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [masterTailorId, setMasterTailorId] = useState("");

  const { members: designers } = useTeamMembers("designer");
  const { members: masters } = useTeamMembers("master_tailor");
  const canSeePayment = hasCapability(role, "payments:read");

  // Any filter or view change goes through these so it also resets to the
  // first page -- otherwise a filter that narrows the result set could leave
  // you stranded on a now-empty page. (Resetting here in the event handler,
  // not in an effect, keeps the page/filter update in a single render.)
  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }
  function changeDesigner(value: string) {
    setDesignerId(value);
    setPage(0);
  }
  function changeMaster(value: string) {
    setMasterTailorId(value);
    setPage(0);
  }
  function changeView(next: ViewMode) {
    setView(next);
    setPage(0);
  }
  function clearBucket() {
    setBucket("");
    setPage(0);
    // Drop the ?bucket= param so a refresh/back-nav doesn't re-apply it.
    router.replace("/orders");
  }

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(() => {
      setLoading(true);
      // Table pages through the results; Kanban needs the whole board at once,
      // so it pulls a single bounded page (the server caps limit at 100 too).
      const pagination = view === "table" ? { limit: PAGE_SIZE, offset: page * PAGE_SIZE } : { limit: KANBAN_LIMIT, offset: 0 };
      ordersApi
        .list({
          search: search.trim() || undefined,
          designerId: designerId || undefined,
          masterTailorId: masterTailorId || undefined,
          bucket: bucket || undefined,
          ...pagination,
        })
        .then((data) => {
          if (!cancelled) {
            setOrders(data.orders);
            setTotal(data.total);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, designerId, masterTailorId, bucket, view, page]);

  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNextPage = pageEnd < total;

  return (
    <div>
      <Card className="mb-4">
        <CardHeader icon="🔎" iconTone="purple" title="Search & Filter Orders" subtitle="Find work by customer, bill number, order ID, or team" />
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Input
            className="w-full sm:min-w-55 sm:flex-1"
            placeholder="Search customer, bill number, or order ID"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
          />
          <Select className="w-full sm:w-auto" value={designerId} onChange={(e) => changeDesigner(e.target.value)}>
            <option value="">All Designers</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
          <Select className="w-full sm:w-auto" value={masterTailorId} onChange={(e) => changeMaster(e.target.value)}>
            <option value="">All Masters</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {bucket && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-app-sm border border-primary/30 bg-primary-bg/50 px-3 py-2 text-xs text-text-secondary">
          <span>
            Filtered by <span className="font-semibold text-text-primary">{BUCKET_LABELS[bucket] ?? bucket}</span>
          </span>
          <button onClick={clearBucket} className="font-medium text-primary underline">
            Clear filter
          </button>
        </div>
      )}

      <div className="mb-3 flex justify-end gap-2">
        <Button variant={view === "table" ? "primary" : "outline"} className="px-3 py-1.5 text-xs" onClick={() => changeView("table")}>
          <Icon name="list" size={15} /> Table
        </Button>
        <Button variant={view === "kanban" ? "primary" : "outline"} className="px-3 py-1.5 text-xs" onClick={() => changeView("kanban")}>
          <Icon name="columns" size={15} /> Kanban
        </Button>
      </div>

      {view === "kanban" ? (
        loading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-error">{error}</div>
        ) : (
          <>
            {total > KANBAN_LIMIT && (
              <div className="mb-3 rounded-app-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Showing the {KANBAN_LIMIT} most recent orders on the board (of {total}). Use Table view with search/filters to
                find older orders.
              </div>
            )}
            <KanbanBoard orders={orders} role={role} userId={userId} />
          </>
        )
      ) : (
      <Card>
        <CardHeader icon="📋" iconTone="blue" title="All Orders" subtitle="Open any order for full details" />
        {loading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">No orders match the current filters.</div>
        ) : (
          <>
            {/* Mobile / tablet: stacked cards (a wide table forces horizontal
                scrolling on the phones + tablets most of the team uses). */}
            <div className="divide-y divide-border-light lg:hidden">
              {orders.map((order, i) => {
                const timeline = getTimelineSummary(order);
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                    className="animate-fade-in block p-4 transition-colors hover:bg-primary-bg/40 active:bg-primary-bg/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-serif text-sm font-bold text-text-primary">{order.customerName}</div>
                        <div className="mt-0.5 text-xs font-medium text-text-muted">{order.orderNumber}</div>
                      </div>
                      <Icon name="chevron-right" size={18} className="mt-0.5 shrink-0 text-primary/40" />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <StatusPill label={granularLabel(order.productionStatus)} />
                      <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
                      {canSeePayment && order.paymentStatus && (
                        <StatusPill
                          label={order.paymentStatus.replace("_", " ")}
                          tone={order.paymentStatus === "fully_paid" ? "green" : "amber"}
                        />
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="palette" size={13} /> {order.designerName ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="needle" size={13} /> {order.masterTailorName ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="calendar" size={13} /> {formatDateOnly(order.dueDate)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: full table */}
            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border-light bg-primary-bg/40 text-left text-xs text-text-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Order ID</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Designer</th>
                  <th className="px-4 py-2.5 font-medium">Master</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Due Date</th>
                  <th className="px-4 py-2.5 font-medium">Timeline</th>
                  {canSeePayment && <th className="px-4 py-2.5 font-medium">Payment</th>}
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const timeline = getTimelineSummary(order);
                  return (
                    <tr key={order.id} className="border-b border-border-light last:border-0">
                      <td className="px-4 py-2.5 font-semibold text-text-primary">{order.orderNumber}</td>
                      <td className="px-4 py-2.5">{order.customerName}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{order.designerName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{order.masterTailorName ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill label={granularLabel(order.productionStatus)} />
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{formatDateOnly(order.dueDate)}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
                      </td>
                      {canSeePayment && (
                        <td className="px-4 py-2.5">
                          <StatusPill label={(order.paymentStatus ?? "").replace("_", " ")} tone={order.paymentStatus === "fully_paid" ? "green" : "amber"} />
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
            </div>
          </>
        )}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-3 text-xs text-text-muted">
            <span>
              Showing {pageStart}–{pageEnd} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="px-3 py-1.5 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                className="px-3 py-1.5 text-xs"
                disabled={!hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
