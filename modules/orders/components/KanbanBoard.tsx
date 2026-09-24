"use client";

import Link from "next/link";
import { useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  CANONICAL_STAGES,
  CANONICAL_TO_GRANULAR,
  blockingStage,
  canChangeStage,
  canonicalLabel,
  getTimelineSummary,
  hasCapability,
  stageIndex,
  toCanonicalStage,
  type CanonicalStage,
  type Order,
  type Role,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { StatusPill } from "../../../components/ui/StatusPill";
import { useToast } from "../../../components/ui/Toast";

/**
 * The 9-canonical-stage production board, grouped by toCanonicalStage(order.productionStatus)
 * (never stored redundantly -- see domain/order-status.ts). A drop writes
 * CANONICAL_TO_GRANULAR[targetStage] via PATCH /orders/:id/status, same
 * endpoint OrderStatusControl uses on the detail page.
 */
export function KanbanBoard({
  orders: initialOrders,
  role,
}: {
  orders: Order[];
  role: Role;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const { showToast } = useToast();
  const canDragAtAll =
    hasCapability(role, "orders:status:design") ||
    hasCapability(role, "orders:status:pm_received") ||
    hasCapability(role, "orders:status:production") ||
    hasCapability(role, "orders:status:finalization");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const orderId = String(active.id);
    const targetStage = over.id as CanonicalStage;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (toCanonicalStage(order.productionStatus) === targetStage) return;

    const targetGranular = CANONICAL_TO_GRANULAR[targetStage];
    if (!canChangeStage(role, targetGranular)) {
      showToast(`Your role can't move this order into "${canonicalLabel(targetStage)}"`, "error");
      return;
    }
    // Forward-only: the production flow only moves ahead (the API enforces this
    // too, but reject the backward drag up front for instant feedback).
    if (stageIndex(targetGranular) <= stageIndex(order.productionStatus)) {
      showToast(`The production flow only moves forward -- can't move back to "${canonicalLabel(targetStage)}".`, "error");
      return;
    }
    // No jumping over a stage this role can't set (e.g. a designer dragging from
    // Design Approved straight past PM Received). The API enforces this too.
    const blocker = blockingStage(role, order.productionStatus, targetGranular);
    if (blocker) {
      showToast(
        `Your role can't move this order past "${canonicalLabel(blocker)}" -- someone who can set that stage has to advance it first.`,
        "error",
      );
      return;
    }

    const previousStatus = order.productionStatus;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, productionStatus: targetGranular } : o)));

    try {
      await ordersApi.updateStatus(orderId, targetGranular);
      showToast(`${order.orderNumber} moved to ${canonicalLabel(targetStage)}.`, "success");
    } catch (err) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, productionStatus: previousStatus } : o)));
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  }

  return (
    <div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {CANONICAL_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.value}
              stage={stage.value}
              label={stage.label}
              orders={orders.filter((o) => toCanonicalStage(o.productionStatus) === stage.value)}
              draggable={canDragAtAll}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  stage,
  label,
  orders,
  draggable,
}: {
  stage: CanonicalStage;
  label: string;
  orders: Order[];
  draggable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-app-lg border p-2.5 ${
        isOver ? "border-primary bg-primary-bg/50" : "border-border bg-primary-bg/20"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        <span className="text-[11px] text-text-muted">{orders.length}</span>
      </div>
      <div className="flex min-h-[40px] flex-col gap-2">
        {orders.map((order) => (
          <KanbanCard key={order.id} order={order} draggable={draggable} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ order, draggable }: { order: Order; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id, disabled: !draggable });
  const timeline = getTimelineSummary(order);

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={`rounded-app-sm border border-border-light bg-card p-2.5 text-xs shadow-sm ${
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <Link href={`/orders/${order.id}`} className="mb-1 block font-semibold text-text-primary hover:underline">
        {order.orderNumber}
      </Link>
      <div className="truncate text-text-secondary">{order.customerName}</div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-text-muted">{order.masterTailorName ?? order.designerName ?? "—"}</span>
        <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
      </div>
    </div>
  );
}
