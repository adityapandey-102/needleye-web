import Link from "next/link";
import {
  formatCurrency,
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  type Order,
  type Role,
} from "../../../lib/domain";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { OrderQrCode } from "./OrderQrCode";
import { PaymentLedger } from "./PaymentLedger";
import { ImageGallery } from "./ImageGallery";
import { OrderTimeline } from "./OrderTimeline";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { OrderStatusControl } from "./OrderStatusControl";
import { StatusAdvancePrompt } from "./StatusAdvancePrompt";
import { PrintOrderButton } from "./PrintOrderButton";

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export function OrderDetailView({
  order,
  role,
  viewOnly = false,
  canEdit,
  canSeePayment,
  canManagePayments,
  canChangeDesignStage,
  canChangeProductionStage,
}: {
  order: Order;
  role: Role;
  viewOnly?: boolean;
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
      {/* On open (esp. via QR), prompt the assigned designer/master to advance the stage. */}
      <StatusAdvancePrompt
        orderId={order.id}
        currentStatus={order.productionStatus}
        role={role}
        canChangeDesignStage={canChangeDesignStage}
        canChangeProductionStage={canChangeProductionStage}
      />

      {viewOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-app-sm border border-info-bg bg-info-bg/40 px-3 py-2 text-sm text-info print:hidden">
          <span>👁️</span>
          <span>View only — this order isn&rsquo;t assigned to you, so payments and status changes are hidden.</span>
        </div>
      )}

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
        <CardHeader icon="📅" iconTone="amber" title="Order Timeline" subtitle="Production progress, booking, and due date" />
        <CardBody className="flex flex-col gap-5">
          <OrderStatusTracker status={order.productionStatus} />
          <div className="grid grid-cols-2 gap-4 border-t border-border-light pt-4 sm:grid-cols-4">
            <SummaryItem label="Booking Date" value={formatDateOnly(order.bookingDate)} />
            <SummaryItem label="Delivery Due Date" value={formatDateOnly(order.dueDate)} />
            <SummaryItem label="Days Remaining" value={timeline.daysRemainingLabel} />
            <div>
              <div className="text-xs text-text-muted">Timeline Status</div>
              <div className="mt-1">
                <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
              </div>
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

          {/* The detailed status-history feed is row-scoped server-side (and
              names who changed what), so it's hidden for a view-only outsider --
              the visual OrderStatusTracker above already shows the current stage.
              key={order.updatedAt} forces a fresh fetch after a status change
              (the orders_set_updated_at trigger bumps it), avoiding a stale list. */}
          {!viewOnly && <OrderTimeline orderId={order.id} key={order.updatedAt} />}

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
