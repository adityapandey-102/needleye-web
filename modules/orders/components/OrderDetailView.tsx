import Link from "next/link";
import {
  formatCurrency,
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  paidFraction,
  subtractMoney,
  PAYMENT_STATUSES,
  productCategoryDisplayName,
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
        active ? "bg-success-bg text-success ring-success/25" : "bg-gray-pill-bg text-text-muted opacity-80 ring-black/5"
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
  viaScan = false,
  canEdit,
  canSeePayment,
  canManagePayments,
  canChangeStatus,
}: {
  order: Order;
  role: Role;
  viewOnly?: boolean;
  /** True only when the page was opened via a QR scan (`?scan=1`). */
  viaScan?: boolean;
  canEdit: boolean;
  canSeePayment: boolean;
  canManagePayments: boolean;
  /** Whether the viewer's role can change the production stage at all (tier-based). */
  canChangeStatus: boolean;
}) {
  // "Shirt (Mens Wear)" for labels that repeat across collections.
  const categoryName = productCategoryDisplayName(order.productCategory);
  const payment = PAYMENT_STATUSES.find((p) => p.value === order.paymentStatus);
  const timeline = getTimelineSummary(order);

  // Payment progress (visual bar) — only meaningful when the caller can see money.
  // Money stays as 2dp strings; arithmetic goes through the money helpers.
  const total = order.totalAmount ?? "0.00";
  const outstanding = order.outstanding ?? "0.00";
  const paid = subtractMoney(total, outstanding);
  const paidPct = Math.round(paidFraction(paid, total) * 100);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Only when reached via a QR scan: prompt whoever received the garment to
          advance the stage ("Product received for X"). Silent otherwise. */}
      {viaScan && canChangeStatus && (
        <StatusAdvancePrompt orderId={order.id} currentStatus={order.productionStatus} role={role} />
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

      {/* Order heading on white paper, with the gold hairline: who it's for, what it
          is, and the four facts that matter, in the same ledger strip as the dashboard. */}
      {/* Brand hero: the order's identity on the burgundy of the logo, with a gold
          hairline, and its four key facts on a darker band beneath. Prints plain. */}
      <div className="card-accent-top gradient-primary mb-4 overflow-hidden rounded-app-lg text-white shadow-app-lg print:bg-none print:text-black print:shadow-none print:ring-1 print:ring-neutral-300">
        <div className="px-5 pt-6 pb-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 font-medium text-white ring-1 ring-white/20 print:text-black">
              <Icon name="shirt" size={13} />
              {categoryName}
            </span>
            <span className="rounded-full bg-gold/25 px-2.5 py-1 font-semibold tracking-wide text-gold-light ring-1 ring-gold-light/30 print:text-black">
              {order.orderNumber}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-[30px] leading-tight text-white sm:text-[38px] print:text-black">{order.customerName}</h1>
          <p className="mt-1 text-sm text-white/75 print:text-neutral-600">Bill No. {order.billNumber}</p>
        </div>
        <div>
          <div className="stagger-in grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4 print:bg-neutral-200">
            <HeroStat icon="layers" label="Stage" value={granularLabel(order.productionStatus)} />
            <HeroStat icon="hourglass" label="Timeline" value={timeline.daysRemainingLabel} />
            {canSeePayment ? (
              <>
                <HeroStat icon="rupee" label="Total" value={formatCurrency(total)} />
                <HeroStat icon="wallet" label="Outstanding" value={formatCurrency(outstanding)} />
              </>
            ) : (
              <>
                <HeroStat icon="calendar" label="Booked" value={formatDateOnly(order.bookingDate)} />
                <HeroStat icon="calendar-clock" label="Due" value={formatDateOnly(order.dueDate)} />
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
            <SummaryItem icon="calendar" label="Booking Date" value={formatDateOnly(order.bookingDate)} />
            <SummaryItem icon="calendar-clock" label="Delivery Due Date" value={formatDateOnly(order.dueDate)} />
            <SummaryItem icon="hourglass" label="Days Remaining" value={timeline.daysRemainingLabel} />
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-gold-bg text-gold">
                <Icon name="clock" size={16} />
              </span>
              <div>
                <div className="text-xs font-medium text-text-muted">Timeline Status</div>
                <div className="mt-1">
                  <StatusPill label={timeline.statusLabel} tone={timeline.tone} />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="stagger-in flex flex-col gap-4">
          <Card>
            <CardHeader icon="📌" iconTone="purple" title="Customer Details" subtitle={order.orderNumber} />
            <CardBody className="divide-y divide-border-light py-2">
              <InfoRow icon="user" label="Customer" value={order.customerName} />
              <InfoRow icon="phone" label="Phone" value={order.phone} figure />
              <InfoRow icon="receipt" label="Bill No." value={order.billNumber} />
              <InfoRow icon="palette" label="Designer" value={order.designerName ?? "—"} />
              <InfoRow icon="scissors" label="Master Tailor" value={order.masterTailorName ?? "—"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="👗" iconTone="pink" title="Product Details" subtitle="Category, notes, and work requirements" />
            <CardBody className="divide-y divide-border-light py-2">
              <InfoRow icon="shirt" label="Category" value={categoryName} />
              <InfoRow icon="file" label="Order Details" value={order.orderDetails} multiline />
              {/* Work requirements as visual chips (designers scan these at a glance). */}
              <div className="py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text-muted">
                  <Icon name="wrench" size={14} className="text-primary/70" />
                  Work Requirements
                </div>
                <div className="flex flex-wrap gap-2">
                  <WorkChip icon="hand" label="Hand Work" active={order.handWork} />
                  <WorkChip icon="cog" label="Machine Work" active={order.machineWork} />
                  <WorkChip icon="cart" label="Purchase Required" active={order.purchaseRequired} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="📝" iconTone="blue" title="Instructions" subtitle="Designer notes and delivery context" />
            <CardBody className="divide-y divide-border-light py-1">
              <InfoRow
                icon="palette"
                label="Designer Instructions"
                value={order.designerInstructions || "No designer instructions added."}
                empty={!order.designerInstructions}
                multiline
              />
              <InfoRow
                icon="clipboard"
                label="Special Notes"
                value={order.specialNotes || "No special notes added."}
                empty={!order.specialNotes}
                multiline
              />
            </CardBody>
          </Card>
        </div>

        <div className="stagger-in flex flex-col gap-4">
          <Card>
            <CardHeader icon="🏭" iconTone="green" title="Production Details" subtitle="Status and payment" />
            <CardBody className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Status</span>
                {canChangeStatus ? (
                  <>
                    <span className="print:hidden">
                      <OrderStatusControl orderId={order.id} currentStatus={order.productionStatus} role={role} />
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
                  <div className="mt-1 rounded-app border border-border-light bg-app-bg/50 p-3">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="figure text-[15px] text-success">
                        {formatCurrency(paid)} <span className="text-xs font-medium text-text-muted">paid</span>
                      </span>
                      <span className="figure text-sm text-text-secondary">{paidPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-primary-bg ring-1 ring-inset ring-border">
                      <div
                        className={`grow-x h-full rounded-full ${order.paymentStatus === "fully_paid" ? "bg-success" : "gradient-gold"}`}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-border-light">
                    <InfoRow icon="rupee" label="Total" value={formatCurrency(total)} figure />
                    <InfoRow icon="wallet" label="Outstanding" value={formatCurrency(outstanding)} figure />
                  </div>
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
              orderTotal={order.totalAmount ?? "0.00"}
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
              {/* ?scan=1 marks this as a QR entry -- the order page shows the
                  "product received / advance stage" popup only for scans. */}
              <OrderQrCode path={`/orders/${order.id}?scan=1`} />
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
    <div className="flex items-center gap-3 bg-[#4a1020]/55 px-5 py-4 sm:px-7 print:bg-white">
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-app bg-white/10 text-gold-light ring-1 ring-inset ring-white/15 sm:flex">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-white/70 print:text-neutral-500">{label}</div>
        <div className="figure mt-0.5 text-[16px] leading-snug text-white sm:text-[17px] print:text-black" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-gold-bg text-gold">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-text-muted">{label}</div>
        <div className="figure mt-0.5 text-[15px] text-text-primary">{value}</div>
      </div>
    </div>
  );
}

/**
 * One labelled value. Short values sit on one line (label left, value right);
 * long text (`multiline`) goes in a soft inset panel. `empty` shows the
 * placeholder text muted and italic so it doesn't read like real content.
 */
function InfoRow({
  label,
  value,
  multiline,
  icon,
  empty,
  figure,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  icon?: IconName;
  empty?: boolean;
  /** Numbers / money: the clear figure style. */
  figure?: boolean;
}) {
  const labelEl = (
    <span className="flex items-center gap-2 text-xs font-medium text-text-muted">
      {icon && <Icon name={icon} size={14} className="text-primary/70" />}
      {label}
    </span>
  );
  if (multiline) {
    return (
      <div className="py-3">
        {labelEl}
        <p
          className={`mt-2 rounded-app border border-border-light bg-app-bg/60 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            empty ? "text-text-muted italic" : "text-text-primary"
          }`}
        >
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      {labelEl}
      <span className={`text-right text-sm ${figure ? "figure text-[15px]" : "font-medium"} text-text-primary`}>{value}</span>
    </div>
  );
}
