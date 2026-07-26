"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { KanbanBoard } from "./KanbanBoard";

type ViewMode = "table" | "kanban";

/** Table page size, and the (bounded) number of cards the Kanban board pulls in one go. */
const PAGE_SIZE = 20;
const KANBAN_LIMIT = 100;

export function OrdersListClient({ role, userId }: { role: Role; userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");

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
  }, [search, designerId, masterTailorId, view, page]);

  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNextPage = pageEnd < total;

  return (
    <div>
      <Card className="mb-4">
        <CardHeader icon="🔎" iconTone="purple" title="Search & Filter Orders" subtitle="Find work by customer, bill number, order ID, or team" />
        <CardBody className="flex flex-wrap gap-3">
          <Input
            className="min-w-[220px] flex-1"
            placeholder="Search customer, bill number, or order ID"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
          />
          <Select className="w-auto" value={designerId} onChange={(e) => changeDesigner(e.target.value)}>
            <option value="">All Designers</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
          <Select className="w-auto" value={masterTailorId} onChange={(e) => changeMaster(e.target.value)}>
            <option value="">All Masters</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <div className="mb-3 flex justify-end gap-2">
        <Button variant={view === "table" ? "primary" : "outline"} className="px-3 py-1.5 text-xs" onClick={() => changeView("table")}>
          📋 Table
        </Button>
        <Button variant={view === "kanban" ? "primary" : "outline"} className="px-3 py-1.5 text-xs" onClick={() => changeView("kanban")}>
          🗂️ Kanban
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
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-text-muted">Loading…</div>
          ) : error ? (
            <div className="p-6 text-sm text-error">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">No orders match the current filters.</div>
          ) : (
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
          )}
        </div>
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
