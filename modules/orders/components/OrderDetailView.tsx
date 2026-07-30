import Link from "next/link";
import {
  formatCurrency,
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  type Order,
} from "../../../lib/domain";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { OrderQrCode } from "./OrderQrCode";
import { PaymentLedger } from "./PaymentLedger";
import { ImageGallery } from "./ImageGallery";
import { OrderTimeline } from "./OrderTimeline";
import { OrderStatusControl } from "./OrderStatusControl";
import { PrintOrderButton } from "./PrintOrderButton";

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export function OrderDetailView({
  order,
  canEdit,
  canSeePayment,
  canManagePayments,
  canChangeDesignStage,
  canChangeProductionStage,
}: {
  order: Order;
  canEdit: boolean;
  canSeePayment: boolean;
  canManagePayments: boolean;
  canChangeDesignStage: boolean;
  canChangeProductionStage: boolean;
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
        <div className="flex gap-2 print:hidden">
          <Link href="/orders">
            <Button variant="outline">All Orders</Button>
          </Link>
          <PrintOrderButton />
          <Link href={`/orders/${order.id}/label`}>
            <Button variant="outline">🏷️ Print Label</Button>
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
                {canChangeDesignStage || canChangeProductionStage ? (
                  <>
                    <span className="print:hidden">
                      <OrderStatusControl
                        orderId={order.id}
                        currentStatus={order.productionStatus}
                        canChangeDesignStage={canChangeDesignStage}
                        canChangeProductionStage={canChangeProductionStage}
                      />
                    </span>
                    <span className="hidden print:inline">
                      <StatusPill label={granularLabel(order.productionStatus)} />
                    </span>
                  </>
                ) : (
                  <StatusPill label={granularLabel(order.productionStatus)} />
                )}
              </div>
              {canSeePayment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Payment</span>
                    <StatusPill label={payment?.label ?? order.paymentStatus ?? ""} tone={order.paymentStatus === "fully_paid" ? "green" : "amber"} />
                  </div>
                  <InfoRow label="Total" value={formatCurrency(order.totalAmount ?? 0)} />
                  <InfoRow label="Outstanding" value={formatCurrency(order.outstanding ?? 0)} />
                </>
              ) : (
                <p className="text-xs text-text-muted">Payment details are not visible for your role.</p>
              )}
            </CardBody>
          </Card>

          {canSeePayment && (
            <PaymentLedger
              orderId={order.id}
              canManage={canManagePayments}
              orderTotal={order.totalAmount ?? 0}
              paymentStatus={order.paymentStatus ?? null}
              nextPaymentDate={order.nextPaymentDate}
            />
          )}

          {/* key={order.updatedAt} forces a remount (and a fresh fetch) whenever the
              order changes -- the orders_set_updated_at DB trigger touches this on
              every status transition, so router.refresh() after a status change
              actually shows the new history entry instead of a stale mount-time fetch. */}
          <OrderTimeline orderId={order.id} key={order.updatedAt} />

          <Card>
            <CardHeader icon="📱" iconTone="purple" title="Order QR" subtitle="Quick access for the team" />
            <CardBody>
              <OrderQrCode url={`${process.env.NEXT_PUBLIC_WEB_APP_URL}/orders/${order.id}`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="🖼️" iconTone="pink" title="Image Gallery" subtitle="Uploaded reference images" />
            <CardBody>
              <ImageGallery images={order.images} />
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
