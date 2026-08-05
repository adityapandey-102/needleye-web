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
import { Icon, type IconName } from "../../../components/ui/Icon";
import { OrderQrCode } from "./OrderQrCode";
import { PaymentLedger } from "./PaymentLedger";
import { ImageGallery } from "./ImageGallery";
import { OrderTimeline } from "./OrderTimeline";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { OrderStatusControl } from "./OrderStatusControl";
import { StatusAdvancePrompt } from "./StatusAdvancePrompt";
import { PrintOrderButton } from "./PrintOrderButton";

function WorkChip({ icon, label, active }: { icon: IconName; label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        active ? "bg-success-bg text-success ring-success/20" : "bg-gray-pill-bg text-text-muted ring-black/5"
      }`}
    >
      <Icon name={icon} size={14} />
      {label}
      {active && <Icon name="check" size={13} className="ml-0.5" />}
    </span>
  );
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

  // Payment progress (visual bar) — only meaningful when the caller can see money.
  const total = order.totalAmount ?? 0;
  const outstanding = order.outstanding ?? 0;
  const paid = Math.max(total - outstanding, 0);
  const paidPct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;

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
          <Icon name="eye" size={16} />
          <span>View only — this order isn&rsquo;t assigned to you, so payments and status changes are hidden.</span>
        </div>
      )}

      {/* Action row (kept on the light background, above the hero). */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary">
          <Icon name="chevron-right" size={16} className="rotate-180" /> All Orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <PrintOrderButton />
          <Link href={`/orders/${order.id}/label`}>
            <Button variant="outline">
              <Icon name="printer" size={16} /> Print Label
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/orders/${order.id}/edit`}>
              <Button>
                <Icon name="edit" size={16} /> Edit Order
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Gradient hero — customer, order identity, and an at-a-glance visual stat strip. */}
      <div className="gradient-primary relative mb-4 overflow-hidden rounded-app-lg p-5 text-white shadow-app-lg sm:p-6 print:bg-white print:text-black print:shadow-none print:ring-1 print:ring-neutral-300">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-white/10 blur-3xl print:hidden" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-black/10 blur-3xl print:hidden" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase print:text-neutral-500">
            <Icon name="shirt" size={14} />
            {category?.label ?? order.productCategory}
            <span className="text-white/40">·</span>
            {order.orderNumber}
          </div>
          <h1 className="mt-1.5 font-serif text-2xl font-bold sm:text-3xl">{order.customerName}</h1>
          <p className="mt-0.5 text-sm text-white/70 print:text-neutral-500">Bill No. {order.billNumber}</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <HeroStat icon="check" label="Stage" value={granularLabel(order.productionStatus)} />
            <HeroStat icon="clock" label="Timeline" value={timeline.daysRemainingLabel} />
            {canSeePayment ? (
              <>
                <HeroStat icon="wallet" label="Total" value={formatCurrency(total)} />
                <HeroStat icon="card" label="Outstanding" value={formatCurrency(outstanding)} />
              </>
            ) : (
              <>
                <HeroStat icon="calendar" label="Booked" value={formatDateOnly(order.bookingDate)} />
                <HeroStat icon="clock" label="Due" value={formatDateOnly(order.dueDate)} />
              </>
            )}
          </div>
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
              {/* Work requirements as visual chips (designers scan these at a glance). */}
              <div>
                <div className="mb-1.5 text-xs text-text-muted">Work Requirements</div>
                <div className="flex flex-wrap gap-2">
                  <WorkChip icon="hand" label="Hand Work" active={order.handWork} />
                  <WorkChip icon="settings" label="Machine Work" active={order.machineWork} />
                  <WorkChip icon="cart" label="Purchase Required" active={order.purchaseRequired} />
                </div>
              </div>
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
                  {/* Visual paid-vs-total progress. */}
                  <div className="mt-1">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-success">{formatCurrency(paid)} paid</span>
                      <span className="font-semibold text-text-secondary">{paidPct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-bg ring-1 ring-inset ring-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${order.paymentStatus === "fully_paid" ? "bg-success" : "gradient-gold"}`}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                  <InfoRow label="Total" value={formatCurrency(total)} />
                  <InfoRow label="Outstanding" value={formatCurrency(outstanding)} />
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

function HeroStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="rounded-app bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm print:bg-neutral-50 print:ring-neutral-200">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/70 uppercase print:text-neutral-500">
        <Icon name={icon} size={13} /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-bold text-white print:text-black" title={value}>
        {value}
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
