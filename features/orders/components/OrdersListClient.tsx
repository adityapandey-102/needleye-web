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
} from "@needleye/shared";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";

export function OrdersListClient({ role }: { role: Role }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [masterTailorId, setMasterTailorId] = useState("");

  const { members: designers } = useTeamMembers("designer");
  const { members: masters } = useTeamMembers("master_tailor");
  const canSeePayment = hasCapability(role, "payments:read");

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(() => {
      setLoading(true);
      ordersApi
        .list({ search: search.trim() || undefined, designerId: designerId || undefined, masterTailorId: masterTailorId || undefined })
        .then((data) => {
          if (!cancelled) {
            setOrders(data.orders);
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
  }, [search, designerId, masterTailorId]);

  return (
    <div>
      <Card className="mb-4">
        <CardHeader icon="🔎" iconTone="purple" title="Search & Filter Orders" subtitle="Find work by customer, bill number, order ID, or team" />
        <CardBody className="flex flex-wrap gap-3">
          <Input
            className="min-w-[220px] flex-1"
            placeholder="Search customer, bill number, or order ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select className="w-auto" value={designerId} onChange={(e) => setDesignerId(e.target.value)}>
            <option value="">All Designers</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
          <Select className="w-auto" value={masterTailorId} onChange={(e) => setMasterTailorId(e.target.value)}>
            <option value="">All Masters</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

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
                          <StatusPill label={order.paymentStatus.replace("_", " ")} tone={order.paymentStatus === "fully_paid" ? "green" : "amber"} />
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
      </Card>
    </div>
  );
}
