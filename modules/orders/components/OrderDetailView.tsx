import Link from "next/link";
import {
  formatCurrency,
  formatDateOnly,
  getTimelineSummary,
  granularLabel,
  paidFraction,
  stageIndex,
  subtractMoney,
  isPositiveMoney,
  PAYMENT_STATUSES,
  GRANULAR_STATUS_VALUES,
  productCategoryDisplayName,
  type Order,
  type Role,
} from "../../../lib/domain";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { ButtonLink } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { OrderQrCode } from "./OrderQrCode";
import { PaymentLedger } from "./PaymentLedger";
import { PricingCard } from "./PricingCard";
import { ImageGallery } from "./ImageGallery";
import { OrderTimeline } from "./OrderTimeline";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { OrderStatusControl } from "./OrderStatusControl";
import { StatusAdvancePrompt } from "./StatusAdvancePrompt";
import { PrintOrderButton } from "./PrintOrderButton";
import { StageProgress } from "./StageProgress";

function WorkChip({ icon, label, active }: { icon: IconName; label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
        active ? "bg-success text-white ring-success" : "bg-gray-pill-bg text-text-muted opacity-80 ring-black/5"
      }`}
    >
      <Icon name={icon} size={14} />
      {label}
      {active && <Icon name="check" size={13} className="ml-0.5" />}
    </span>
  );
}

/** Timeline pills read better in sentence case than the shouting labels. */
function sentence(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

export function OrderDetailView({
  order,
  role,
  viewOnly = false,
  viaScan = false,
  canEdit,
  canSeePayment,
  canManagePayments,
  canCorrectPayments = false,
  canSetPrice = false,
  canAdjustPrice = false,
  askPricing = false,
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
  /** Edit / delete a recorded payment (owner, accountant) -- before delivery only. */
  canCorrectPayments?: boolean;
  /** Give the order its first price (owner, accountant, its own designer). */
  canSetPrice?: boolean;
  /** Raise / discount the price (owner, accountant). */
  canAdjustPrice?: boolean;
  /** Opened right after creating the order: ask "Add pricing now?". */
  askPricing?: boolean;
  /** Whether the viewer's role can change the production stage at all (tier-based). */
  canChangeStatus: boolean;
}) {
  // "Shirt (Mens Wear)" for labels that repeat across collections.
  const categoryName = productCategoryDisplayName(order.productCategory);
  const payment = PAYMENT_STATUSES.find((p) => p.value === order.paymentStatus);
  const timeline = getTimelineSummary(order);

  // Money stays as 2dp strings; arithmetic goes through the money helpers.
  // No price yet (ADR 0008): the money figures read "Price not set", not ₹0.
  const priced = order.totalAmount !== null && order.totalAmount !== undefined;
  const total = order.totalAmount ?? "0.00";
  const outstanding = order.outstanding ?? "0.00";
  const paid = order.amountPaid ?? subtractMoney(total, outstanding);
  const paidPct = priced ? Math.round(paidFraction(paid, total) * 100) : 0;
  const delivered = order.productionStatus === "delivered";
  const stageNumber = stageIndex(order.productionStatus) + 1;

  // Rendered in one place on phones and another on wider screens (see the hero band).
  const statusPills = (
    <>
      <StatusPill label={sentence(timeline.statusLabel)} tone={timeline.tone} />
      {canSeePayment && payment && (
        <StatusPill
          label={payment.label}
          tone={order.paymentStatus === "fully_paid" ? "green" : order.paymentStatus === "not_priced" ? "gray" : "amber"}
        />
      )}
    </>
  );
  const paidRing =
    canSeePayment && priced
      ? (size: number) => <ProgressRing percent={paidPct} label="paid" tone={paidPct >= 100 ? "success" : "gold"} size={size} onDark />
      : null;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Only when reached via a QR scan: prompt whoever received the garment to
          advance the stage ("Product received for X"). Silent otherwise. */}
      {viaScan && canChangeStatus && (
        <StatusAdvancePrompt orderId={order.id} currentStatus={order.productionStatus} role={role} priceSet={order.priceSet} />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary">
          <Icon name="chevron-right" size={16} className="rotate-180" /> All Orders
        </Link>
        {/* Phones: the two prints side by side, Edit across the full width. */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <PrintOrderButton />
          <ButtonLink href={`/orders/${order.id}/label`} variant="outline">
            <Icon name="printer" size={16} /> Print Label
          </ButtonLink>
          {canEdit && (
            <ButtonLink href={`/orders/${order.id}/edit`} className="col-span-2">
              <Icon name="edit" size={16} /> Edit Order
            </ButtonLink>
          )}
        </div>
      </div>

      {/* The order's header on the hero band (the brand's dark red, gold outline)
          -- who it's for, its labels, how much is paid -- and its four facts in
          hairline-divided cells. Prints plain. On phones it stacks into a tidy
          column: labels + a small ring, the name, a key/value list instead of the
          run-on "Bill No. · Booked · Due" line, the status pills, then a 2x2 grid. */}
      <section aria-label="Order summary" className="hero-band mb-5">
        <div className="relative flex flex-wrap items-center justify-between gap-5 px-5 pt-6 pb-5 sm:px-7 sm:pt-7">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 font-medium text-white ring-1 ring-white/20 print:text-black">
                  <Icon name="shirt" size={13} />
                  {categoryName}
                </span>
                <span className="rounded-full bg-gold/25 px-2.5 py-1 font-semibold tracking-wide text-gold-light ring-1 ring-gold-light/40 print:text-black">
                  {order.orderNumber}
                </span>
                {/* Wider screens: the status pills sit in this row; phones give them a row of their own below. */}
                <span className="hidden sm:contents">{statusPills}</span>
              </div>
              {paidRing && <div className="sm:hidden">{paidRing(64)}</div>}
            </div>
            <h1 className="animate-rise mt-3 font-serif text-[24px] leading-tight text-white sm:text-[38px] print:text-black">{order.customerName}</h1>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1 text-[13px] sm:hidden">
              <dt className="text-white/60 print:text-neutral-500">Bill no.</dt>
              <dd className="font-medium wrap-break-word text-white print:text-black">{order.billNumber}</dd>
              <dt className="text-white/60 print:text-neutral-500">Booked</dt>
              <dd className="font-medium text-white print:text-black">{formatDateOnly(order.bookingDate)}</dd>
              <dt className="text-white/60 print:text-neutral-500">Due</dt>
              <dd className="font-medium text-white print:text-black">{formatDateOnly(order.dueDate)}</dd>
            </dl>
            <p className="mt-1.5 hidden text-sm text-white/75 sm:block print:text-neutral-600">
              Bill No. {order.billNumber} · Booked {formatDateOnly(order.bookingDate)} · Due {formatDateOnly(order.dueDate)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:hidden">{statusPills}</div>
          </div>
          {paidRing && <div className="hidden sm:block">{paidRing(96)}</div>}
        </div>
        <div className="hero-cells stagger-in grid-cols-2 border-t border-white/10 sm:grid-cols-4">
          <Fact label="Stage" aside={`${stageNumber}/${GRANULAR_STATUS_VALUES.length}`}>
            {/* Phones and tablets (narrow cells): the stage name gets the cell's full width (its
                counter moved up beside the label) and StageProgress draws just the bar; wide
                screens show StageProgress whole, as before. */}
            <div className="flex flex-col">
              <StageProgress status={order.productionStatus} onDark headerClassName="max-lg:hidden" />
              {/* Shown first by CSS; after the bar in the page, so the visible name comes first on desktop. */}
              <div className="order-first text-[15px] leading-snug font-medium text-white lg:hidden print:text-black">
                {granularLabel(order.productionStatus)}
              </div>
            </div>
          </Fact>
          <Fact
            label="Timeline"
            value={timeline.daysRemainingLabel}
            tone={timeline.remainingDays !== null && timeline.remainingDays < 0 ? "text-(--on-dark-error)" : "text-white"}
          />
          {canSeePayment ? (
            <>
              <Fact label="Total" value={priced ? formatCurrency(total) : "Price not set"} tone={priced ? "text-white" : "text-(--on-dark-muted)"} />
              <Fact
                label="Outstanding"
                value={priced ? formatCurrency(outstanding) : "—"}
                tone={priced && isPositiveMoney(outstanding) ? "text-(--on-dark-warning)" : priced ? "text-(--on-dark-success)" : "text-(--on-dark-muted)"}
              />
            </>
          ) : (
            <>
              <Fact label="Booked" value={formatDateOnly(order.bookingDate)} />
              <Fact label="Due" value={formatDateOnly(order.dueDate)} />
            </>
          )}
        </div>
      </section>

      <Card className="mb-5">
        <CardHeader
          icon={<Icon name="layers" size={17} />}
          title="Production progress"
          subtitle={`Stage ${stageNumber} of ${GRANULAR_STATUS_VALUES.length} · ${granularLabel(order.productionStatus)}`}
        />
        <CardBody>
          <OrderStatusTracker status={order.productionStatus} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="stagger-in flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Icon name="user" size={17} />} title="Customer" subtitle={order.orderNumber} />
            <CardBody className="divide-y divide-border-light py-2">
              <InfoRow icon="user" label="Customer" value={order.customerName} />
              <InfoRow icon="phone" label="Phone" value={order.phone} figure />
              <InfoRow icon="receipt" label="Bill No." value={order.billNumber} />
              <InfoRow icon="palette" label="Designer" value={order.designerName ?? "—"} />
              <InfoRow icon="scissors" label="Master Tailor" value={order.masterTailorName ?? "—"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Icon name="shirt" size={17} />} title="Product" subtitle="Category, details and work needed" />
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
            <CardHeader icon={<Icon name="edit" size={17} />} title="Instructions" subtitle="Designer notes and delivery context" />
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

          <Card>
            <CardHeader icon={<Icon name="image" size={17} />} title="Reference images" subtitle="Uploaded with the order" />
            <CardBody>
              <ImageGallery images={order.images} />
            </CardBody>
          </Card>
        </div>

        <div className="stagger-in flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Icon name="factory" size={17} />} title="Production stage" subtitle={`Stage ${stageNumber} of ${GRANULAR_STATUS_VALUES.length}`} />
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs whitespace-nowrap text-text-muted">Current stage</span>
                {canChangeStatus ? (
                  <>
                    <span className="print:hidden">
                      <OrderStatusControl orderId={order.id} currentStatus={order.productionStatus} role={role} priceSet={order.priceSet} />
                    </span>
                    <span className="hidden print:inline">
                      <StatusPill label={granularLabel(order.productionStatus)} />
                    </span>
                  </>
                ) : (
                  <StatusPill label={granularLabel(order.productionStatus)} />
                )}
              </div>
              {!canSeePayment && <p className="text-xs text-text-muted">Payment details are not visible for your role.</p>}
            </CardBody>
          </Card>

          {canSeePayment && (
            <PricingCard
              orderId={order.id}
              total={order.totalAmount ?? null}
              collected={paid}
              delivered={delivered}
              canSet={canSetPrice}
              canAdjust={canAdjustPrice}
              askNow={askPricing}
            />
          )}

          {canSeePayment && (
            <PaymentLedger
              orderId={order.id}
              canManage={canManagePayments}
              canCorrect={canCorrectPayments}
              orderTotal={order.totalAmount ?? null}
              paymentStatus={order.paymentStatus ?? null}
              nextPaymentDate={order.nextPaymentDate}
            />
          )}

          {/* The detailed status-history feed is row-scoped server-side (and
              names who changed what), so it's hidden for a view-only outsider --
              the tracker above already shows the current stage.
              key={order.updatedAt} forces a fresh fetch after a status change
              (the orders_set_updated_at trigger bumps it), avoiding a stale list. */}
          {!viewOnly && <OrderTimeline orderId={order.id} key={order.updatedAt} />}

          <Card>
            <CardHeader icon={<Icon name="qr" size={17} />} title="Order QR" subtitle="Scan to open this order" />
            <CardBody>
              {/* ?scan=1 marks this as a QR entry -- the order page shows the
                  "product received / advance stage" popup only for scans. */}
              <OrderQrCode path={`/orders/${order.id}?scan=1`} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** One cell of the header's figure strip, on the hero band. */
function Fact({
  label,
  aside,
  value,
  tone = "text-white",
  children,
}: {
  label: string;
  /** A small note at the label's right -- below lg only (wide cells show it in the value). */
  aside?: string;
  value?: string;
  tone?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="hero-cell min-w-0 px-4 py-3.5 sm:px-7 sm:py-4">
      <div className="flex items-baseline justify-between gap-2 text-[12px] font-medium text-white/70 print:text-neutral-500">
        <span>{label}</span>
        {aside && <span className="shrink-0 text-[11px] font-normal text-white/60 tabular-nums lg:hidden">{aside}</span>}
      </div>
      {children ? (
        <div className="mt-1 sm:mt-2">{children}</div>
      ) : (
        <div className={`figure mt-1 text-[17px] leading-snug sm:text-[19px] ${tone}`} title={value}>
          {value}
        </div>
      )}
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
