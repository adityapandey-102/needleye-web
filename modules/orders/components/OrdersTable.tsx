"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateOnly, getTimelineSummary, paymentStatusLabel, paymentStatusTone, type OrderListItem } from "../../../lib/domain";
import { ButtonLink } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { CARD_GRID_CELL } from "../../../components/ui/Card";
import { Icon } from "../../../components/ui/Icon";
import { StageProgress } from "./StageProgress";

/** Timeline pills read better in sentence case than the shouting labels. */
export function timelineLabel(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

/**
 * A page of orders: cards on phones (one column) and tablets (two), a table on
 * desktop -- the one look for every order list (All orders, the dashboard's
 * lists). A row opens its order; "View" is the keyboard way in.
 */
export function OrdersTable({ orders, canSeePayment, dimmed = false }: { orders: OrderListItem[]; canSeePayment: boolean; dimmed?: boolean }) {
  const router = useRouter();
  return (
    <div className={`transition-opacity duration-200 ${dimmed ? "opacity-60" : ""}`}>
      <div className="grid md:grid-cols-2 lg:hidden">
        {orders.map((order, i) => {
          const timeline = getTimelineSummary(order);
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
                  <div className="mt-0.5 text-xs font-medium text-text-muted">
                    {order.orderNumber} · due {formatDateOnly(order.dueDate)}
                  </div>
                </div>
                <Icon name="chevron-right" size={18} className="mt-0.5 shrink-0 text-primary/40" />
              </div>
              <div className="mt-2.5">
                <StageProgress status={order.productionStatus} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <StatusPill label={timelineLabel(timeline.statusLabel)} tone={timeline.tone} />
                {canSeePayment && order.paymentStatus && (
                  <StatusPill label={paymentStatusLabel(order.paymentStatus)} tone={paymentStatusTone(order.paymentStatus)} />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="palette" size={13} /> {order.designerName ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="needle" size={13} /> {order.masterTailorName ?? "—"}
                </span>
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
              <th className="px-4 py-2.5 font-medium">Team</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              {canSeePayment && <th className="px-4 py-2.5 font-medium">Payment</th>}
              <th className="px-5 py-2.5 text-right font-medium">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="rows-in">
            {orders.map((order) => {
              const timeline = getTimelineSummary(order);
              return (
                <tr
                  key={order.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a")) return;
                    router.push(`/orders/${order.id}`);
                  }}
                  className="group cursor-pointer border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30"
                >
                  <td className="px-5 py-3 align-top whitespace-nowrap">
                    <div className="font-medium text-text-primary">{order.orderNumber}</div>
                    <div className="mt-0.5 text-[11px] text-text-muted">Booked {formatDateOnly(order.bookingDate)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-text-primary">{order.customerName}</div>
                    {order.phone && <div className="mt-0.5 text-[11px] text-text-muted">{order.phone}</div>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="min-w-32 text-text-secondary">{order.designerName ?? "—"}</div>
                    <div className="mt-0.5 text-[11px] text-text-muted">{order.masterTailorName ? `Master · ${order.masterTailorName}` : "No master yet"}</div>
                  </td>
                  <td className="w-44 px-4 py-3 align-top">
                    <StageProgress status={order.productionStatus} />
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div className="text-text-secondary">{formatDateOnly(order.dueDate)}</div>
                    <div className="mt-1">
                      <StatusPill label={timelineLabel(timeline.statusLabel)} tone={timeline.tone} />
                    </div>
                  </td>
                  {canSeePayment && (
                    <td className="px-4 py-3 align-top">
                      <StatusPill label={paymentStatusLabel(order.paymentStatus)} tone={paymentStatusTone(order.paymentStatus)} />
                    </td>
                  )}
                  <td className="px-5 py-3 text-right align-top">
                    <ButtonLink
                      href={`/orders/${order.id}`}
                      variant="outline"
                      className="px-3 py-1.5 text-xs group-hover:border-primary/40 group-hover:text-primary"
                    >
                      View
                    </ButtonLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Rows that shimmer while a page of orders loads. */
export function OrdersTableSkeleton() {
  return (
    <div className="space-y-2.5 px-5 py-5" aria-busy="true" aria-label="Loading orders">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-11 rounded-app-sm" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/** Nothing to show: an icon, a line, and (optionally) a way out. */
export function OrdersEmpty({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-bg text-primary">
        <Icon name="search" size={20} />
      </span>
      <p className="mt-3 text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
