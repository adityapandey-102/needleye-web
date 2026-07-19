import Link from "next/link";
import {
  formatCurrency,
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  type Order,
} from "@needleye/shared";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export function OrderDetailView({
  order,
  canEdit,
  canSeePayment,
}: {
  order: Order;
  canEdit: boolean;
  canSeePayment: boolean;
}) {
  const category = PRODUCT_CATEGORIES.find((c) => c.value === order.productCategory);
  const payment = PAYMENT_STATUSES.find((p) => p.value === order.paymentStatus);
  const timeline = getTimelineSummary(order);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">
            {order.customerName} — {category?.label ?? order.productCategory}
          </h1>
          <p className="text-sm text-text-muted">
            {order.orderNumber} · {order.billNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders">
            <Button variant="outline">All Orders</Button>
          </Link>
          {canEdit && (
            <Link href={`/orders/${order.id}/edit`}>
              <Button>Edit Order</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader icon="📅" iconTone="amber" title="Order Timeline" subtitle="Booking, due date, and urgency" />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryItem label="Booking Date" value={formatDateOnly(order.bookingDate)} />
          <SummaryItem label="Delivery Due Date" value={formatDateOnly(order.dueDate)} />
          <SummaryItem label="Days Remaining" value={timeline.daysRemainingLabel} />
          <div>
            <div className="text-xs text-text-muted">Timeline Status</div>
            <div className="mt-1">
              <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader icon="📌" iconTone="purple" title="Customer Details" subtitle={order.orderNumber} />
            <CardBody className="flex flex-col gap-2.5">
              <InfoRow label="Customer" value={order.customerName} />
              <InfoRow label="Phone" value={order.phone} />
              <InfoRow label="Bill No." value={order.billNumber} />
              <InfoRow label="Designer" value={order.designerName ?? "—"} />
              <InfoRow label="Master Tailor" value={order.masterTailorName ?? "—"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="👗" iconTone="pink" title="Product Details" subtitle="Category, notes, and work requirements" />
            <CardBody className="flex flex-col gap-2.5">
              <InfoRow label="Category" value={category?.label ?? order.productCategory} />
              <InfoRow label="Order Details" value={order.orderDetails} multiline />
              <InfoRow label="Hand Work" value={yesNo(order.handWork)} />
              <InfoRow label="Machine Work" value={yesNo(order.machineWork)} />
              <InfoRow label="Purchase Required" value={yesNo(order.purchaseRequired)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="📝" iconTone="blue" title="Instructions" subtitle="Designer notes and delivery context" />
            <CardBody className="flex flex-col gap-2.5">
              <InfoRow label="Designer Instructions" value={order.designerInstructions || "No designer instructions added."} multiline />
              <InfoRow label="Special Notes" value={order.specialNotes || "No special notes added."} multiline />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader icon="🏭" iconTone="green" title="Production Details" subtitle="Status and payment" />
            <CardBody className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Status</span>
                <StatusPill label={granularLabel(order.productionStatus)} />
              </div>
              {canSeePayment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Payment</span>
                    <StatusPill label={payment?.label ?? order.paymentStatus} tone={order.paymentStatus === "fully_paid" ? "green" : "amber"} />
                  </div>
                  <InfoRow label="Total" value={formatCurrency(order.totalAmount)} />
                  <InfoRow label="Outstanding" value={formatCurrency(order.outstanding)} />
                  <p className="text-[11px] text-text-muted">Payment ledger (multiple entries) lands in Phase 3.</p>
                </>
              ) : (
                <p className="text-xs text-text-muted">Payment details are not visible for your role.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="🖼️" iconTone="pink" title="Image Gallery" subtitle="Uploaded reference images" />
            <CardBody>
              {order.images.length === 0 ? (
                <p className="text-xs text-text-muted">No reference images uploaded.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {order.images.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-app-sm border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL */}
                      <img src={img.url} alt={`Reference ${img.slot}`} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex items-center justify-between gap-3"}>
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm text-text-primary ${multiline ? "mt-1 block whitespace-pre-wrap" : ""}`}>{value}</span>
    </div>
  );
}
