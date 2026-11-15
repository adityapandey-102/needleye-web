"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatDateOnly, productCategoryDisplayName, type Order } from "../../../lib/domain";
import { Button, ButtonLink } from "../../../components/ui/Button";

/**
 * The sticker stock the shop's label printer takes -- all 100mm wide (the
 * team's sizes, 2026-11). Each has its own layout: one wide strip can't be
 * squeezed into a square or a tall label and still read well.
 */
export const LABEL_SIZES = [
  { id: "100x50", width: 100, height: 50, name: "100 × 50 mm" },
  { id: "100x100", width: 100, height: 100, name: "100 × 100 mm" },
  { id: "100x150", width: 100, height: 150, name: "100 × 150 mm" },
] as const;

type LabelSize = (typeof LABEL_SIZES)[number];
type LabelSizeId = LabelSize["id"];

/** The last size printed on this device -- one shop, one printer, so it's remembered. */
const SIZE_STORAGE_KEY = "ne-label-size";

function savedSize(): LabelSizeId | null {
  try {
    const v = window.localStorage.getItem(SIZE_STORAGE_KEY);
    return LABEL_SIZES.some((s) => s.id === v) ? (v as LabelSizeId) : null;
  } catch {
    return null;
  }
}

function saveSize(id: LabelSizeId) {
  try {
    window.localStorage.setItem(SIZE_STORAGE_KEY, id);
  } catch {
    /* private window / blocked storage: the choice just isn't remembered */
  }
}

/**
 * The order's package label, printed in pure black on white (the shop's label
 * printer, 2026-11): a thin black frame round a white field, the Needleye
 * monogram (rendered solid black) and wordmark, labelled
 * rule-underlined fields, ticked boxes for hand/machine/purchase, the order
 * details, and a scannable QR.
 *
 * Three sticker sizes (LABEL_SIZES), chosen above the label. The chosen size
 * drives an `@page { size: <w>mm <h>mm; margin: 0 }` rule, so Print emits
 * exactly one sticker with no browser margin. There are no background fills or
 * greys -- every line, box, letter and the QR is solid black, everything else
 * plain white -- so it prints crisply on a thermal/mono printer.
 *
 * The customer phone is intentionally NOT on the label (it's a workshop/package
 * tag, not a contact card). Rendered on its own route so window.print() emits
 * just this sticker -- the app chrome (sidebar/header) is already `print:hidden`.
 */
export function CustomerLabel({ order }: { order: Order }) {
  const [sizeId, setSizeId] = useState<LabelSizeId>(LABEL_SIZES[0].id);
  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];

  // Encode an absolute URL from the origin the label is printed from (LAN IP,
  // localhost, or prod domain) so the printed QR resolves for staff scanning on
  // that same network -- not a fixed env host. Computed after mount (client-only).
  // NEXT_PUBLIC_WEB_APP_URL (e.g. a LAN IP a phone can reach) when set, else the
  // viewing origin. Inlined at dev-server START -- restart after editing .env.local.
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WEB_APP_URL || window.location.origin;
    const remembered = savedSize();
    queueMicrotask(() => {
      // ?scan=1 -> scanning this printed label opens the order with the
      // "product received / advance stage" popup (same as scanning the on-screen QR).
      setQrUrl(`${base}/orders/${order.id}?scan=1`);
      if (remembered) setSizeId(remembered);
    });
  }, [order.id]);

  function chooseSize(id: LabelSizeId) {
    setSizeId(id);
    saveSize(id);
  }

  const data: LabelData = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    billNumber: order.billNumber,
    dueDate: formatDateOnly(order.dueDate),
    designer: order.designerName ?? "—",
    masterTailor: order.masterTailorName ?? "—",
    // "Shirt (Mens Wear)" for labels that repeat across collections.
    category: productCategoryDisplayName(order.productCategory),
    details: order.orderDetails || "—",
    handWork: order.handWork,
    machineWork: order.machineWork,
    purchase: order.purchaseRequired,
    qrUrl,
  };

  return (
    <div className="mx-auto w-fit">
      <style>{`
        @page { size: ${size.width}mm ${size.height}mm; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .ne-label, .ne-label * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .ne-label { box-shadow: none !important; }
        }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ButtonLink href={`/orders/${order.id}`} variant="outline">
          ← Back to Order
        </ButtonLink>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Sticker size" className="inline-flex rounded-app border border-border bg-app-bg/70 p-0.5">
            {LABEL_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={size.id === s.id}
                onClick={() => chooseSize(s.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  size.id === s.id ? "bg-card text-primary shadow-app" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <Button onClick={() => window.print()}>🖨️ Print Label</Button>
        </div>
      </div>

      {/* The sticker itself -- fixed physical size, on screen and on paper alike. */}
      <div
        data-label-size={size.id}
        className="ne-label flex shrink-0 overflow-hidden border-[0.5mm] border-black bg-white p-[0.9mm] text-black shadow-app print:shadow-none"
        style={{ width: `${size.width}mm`, height: `${size.height}mm` }}
      >
        {size.id === "100x50" ? <StripLayout d={data} /> : size.id === "100x100" ? <SquareLayout d={data} /> : <TallLayout d={data} />}
      </div>

      <p className="mt-3 max-w-[100mm] text-xs text-text-muted print:hidden">
        Sticker size is {size.name} (width × height). In the print dialog choose that paper size (or a custom size
        with those dimensions), set margins to <strong>None</strong> and scale to <strong>100%</strong>. It prints in black and white only.
      </p>
    </div>
  );
}

type LabelData = {
  orderNumber: string;
  customerName: string;
  billNumber: string;
  dueDate: string;
  designer: string;
  masterTailor: string;
  category: string;
  details: string;
  handWork: boolean;
  machineWork: boolean;
  purchase: boolean;
  qrUrl: string;
};

/** 100 x 50 mm: fields on the left under a slim brand line, the QR and the ticks on the right. */
function StripLayout({ d }: { d: LabelData }) {
  return (
    <div className="flex w-full gap-[2.5mm] bg-white px-[2.5mm] py-[2mm]">
      <div className="flex min-w-0 flex-1 flex-col gap-[1.3mm]">
        <div className="flex shrink-0 items-center justify-between gap-[2mm] border-b border-black pb-[1mm]">
          <div className="flex items-center gap-[1.5mm]">
            <Monogram className="w-[9mm]" />
            <span className="font-serif text-[8pt] leading-none font-bold text-black">Needleye</span>
          </div>
          <OrderNumber value={d.orderNumber} className="text-right" valueClass="text-[9.5pt]" />
        </div>
        {/* Fields paired up, so the order details keep a couple of lines on this short sticker. */}
        <Row>
          <Field label="Customer" value={d.customerName} size="lg" grow />
          <Field label="Bill Number" value={d.billNumber} className="max-w-[24mm]" mono />
        </Row>
        <Row>
          <Field label="Due Date" value={d.dueDate} className="w-[17mm]" />
          <Field label="Product Category" value={d.category} grow />
        </Row>
        <Row>
          <Field label="Designer" value={d.designer} grow />
          <Field label="Master Tailor" value={d.masterTailor} grow />
        </Row>
        <Details value={d.details} textClass="text-[6pt] leading-[1.3]" />
      </div>
      {/* The QR as large as the strip allows (~30mm), unframed so the white round it is a clean quiet zone for phone cameras. */}
      <div className="flex w-[31mm] shrink-0 flex-col items-center justify-center gap-[1mm] border-l border-black pl-[2mm]">
        <Qr url={d.qrUrl} className="h-[30mm] w-[30mm]" frameless />
        <div className="flex flex-col gap-[0.5mm] self-stretch">
          <Check label="Hand Work" on={d.handWork} />
          <Check label="Machine Work" on={d.machineWork} />
          <Check label="Purchase" on={d.purchase} />
        </div>
      </div>
    </div>
  );
}

/** 100 x 100 mm: brand and order number across the top, fields beside the QR, then the order details. */
function SquareLayout({ d }: { d: LabelData }) {
  return (
    <div className="flex w-full flex-col gap-[2mm] bg-white px-[3mm] py-[2.5mm]">
      <div className="flex shrink-0 items-center justify-between gap-[3mm] border-b border-black pb-[1.8mm]">
        <Brand monogramClass="w-[15mm]" wordmarkClass="text-[10pt]" />
        <OrderNumber value={d.orderNumber} className="text-right" valueClass="text-[13pt]" />
      </div>
      <div className="flex shrink-0 gap-[3mm]">
        <div className="flex min-w-0 flex-1 flex-col gap-[1.6mm]">
          <Field label="Customer" value={d.customerName} size="lg" />
          <Field label="Bill Number" value={d.billNumber} mono />
          <Field label="Due Date" value={d.dueDate} />
          <Field label="Designer" value={d.designer} />
          <Field label="Master Tailor" value={d.masterTailor} />
        </div>
        <div className="flex w-[34mm] shrink-0 flex-col items-center justify-center">
          <Qr url={d.qrUrl} className="h-[34mm] w-[34mm]" />
          <ScanHint className="mt-[1mm]" />
        </div>
      </div>
      <Field label="Product Category" value={d.category} />
      <div className="flex shrink-0 items-center gap-[3mm]">
        <Check label="Hand Work" on={d.handWork} />
        <Check label="Machine Work" on={d.machineWork} />
        <Check label="Purchase" on={d.purchase} />
      </div>
      <Details value={d.details} textClass="text-[7.5pt] leading-[1.35]" />
    </div>
  );
}

/** 100 x 150 mm: the brand on top, fields in two columns, the order details, and a large QR with the order number at the foot. */
function TallLayout({ d }: { d: LabelData }) {
  return (
    <div className="flex w-full flex-col gap-[2.2mm] bg-white px-[3.5mm] py-[3mm]">
      <div className="flex shrink-0 justify-center border-b border-black pb-[2mm]">
        <Brand monogramClass="w-[22mm]" wordmarkClass="text-[13pt]" centered />
      </div>
      <Field label="Customer" value={d.customerName} size="xl" />
      <Row>
        <Field label="Bill Number" value={d.billNumber} grow mono />
        <Field label="Due Date" value={d.dueDate} className="w-[26mm]" />
      </Row>
      <Row>
        <Field label="Designer" value={d.designer} grow />
        <Field label="Master Tailor" value={d.masterTailor} grow />
      </Row>
      <Field label="Product Category" value={d.category} />
      <div className="flex shrink-0 items-center gap-[4mm]">
        <Check label="Hand Work" on={d.handWork} />
        <Check label="Machine Work" on={d.machineWork} />
        <Check label="Purchase" on={d.purchase} />
      </div>
      <Details value={d.details} textClass="text-[8pt] leading-[1.4]" />
      <div className="flex shrink-0 items-center gap-[4mm] border-t border-black pt-[2.5mm]">
        <Qr url={d.qrUrl} className="h-[40mm] w-[40mm]" />
        <div className="min-w-0 flex-1">
          <OrderNumber value={d.orderNumber} valueClass="text-[16pt]" />
          <ScanHint className="mt-[2mm] text-left" />
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-end gap-[2.5mm]">{children}</div>;
}

/** One labelled value sitting on a rule, mirroring the printed sticker's "NAME ______" fields. */
function Field({
  label,
  value,
  size = "md",
  grow,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  size?: "md" | "lg" | "xl";
  grow?: boolean;
  mono?: boolean;
  className?: string;
}) {
  const valueSize =
    size === "xl"
      ? "text-[14pt] leading-tight"
      : size === "lg"
        ? "text-[10.5pt] leading-tight"
        : mono
          ? "font-mono text-[7.5pt] leading-tight"
          : "text-[8pt] leading-tight";

  return (
    <div className={`${grow ? "min-w-0 flex-1" : "min-w-0 shrink-0"} ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      <div className={`truncate border-b border-black pb-px font-bold text-black ${valueSize}`} title={value}>
        {value}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[5.2pt] font-semibold tracking-[0.12em] text-black uppercase">{children}</div>;
}

function OrderNumber({ value, className = "", valueClass }: { value: string; className?: string; valueClass: string }) {
  return (
    <div className={`shrink-0 ${className}`}>
      <FieldLabel>Order Number</FieldLabel>
      <div className={`font-mono leading-tight font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

/** Order details -- an open block (no rule) taking the space left, so a long description wraps instead of being cut to one line. */
function Details({ value, textClass }: { value: string; textClass: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FieldLabel>Order Details</FieldLabel>
      <p className={`mt-[0.4mm] min-h-0 flex-1 overflow-hidden font-medium wrap-anywhere whitespace-pre-wrap text-black ${textClass}`}>{value}</p>
    </div>
  );
}

function Brand({ monogramClass, wordmarkClass, centered }: { monogramClass: string; wordmarkClass: string; centered?: boolean }) {
  return (
    <div className={`flex items-center gap-[2mm] ${centered ? "flex-col gap-[1mm] text-center" : ""}`}>
      <Monogram className={monogramClass} />
      <div>
        <div className={`font-serif leading-none font-bold text-black ${wordmarkClass}`}>Needleye</div>
        <div className="mt-[0.6mm] text-[5pt] font-semibold tracking-[0.16em] text-black uppercase">Luxury Tailoring</div>
      </div>
    </div>
  );
}

function Qr({ url, className, frameless }: { url: string; className: string; frameless?: boolean }) {
  return (
    <div className={`shrink-0 bg-white ${frameless ? "" : "border border-black p-[0.8mm]"} ${className}`}>
      {url ? <QRCodeSVG value={url} size={512} level="M" fgColor="#000000" bgColor="#ffffff" className="h-full w-full" /> : <div className="h-full w-full" />}
    </div>
  );
}

function ScanHint({ className = "" }: { className?: string }) {
  return <p className={`text-center text-[5pt] leading-[1.35] font-medium text-black ${className}`}>Scan to open this order (staff login required).</p>;
}

/** A ticked/blank box, the sticker's own way of showing a yes/no attribute. */
function Check({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-[1mm]">
      <span className="flex h-[3.4mm] w-[3.4mm] shrink-0 items-center justify-center border-[0.3mm] border-black text-[7pt] leading-none font-bold text-black">
        {on ? "✓" : ""}
      </span>
      <span className="text-[5.2pt] font-semibold tracking-[0.06em] whitespace-nowrap text-black uppercase">{label}</span>
    </div>
  );
}

/**
 * The brand monogram -- the ornate "N" crossed by two needles.
 * `public/needleye-monogram.png` is already trimmed to the artwork (770x451,
 * transparent background), so it just needs a width; the height follows the
 * aspect ratio. Even at 22mm wide the 770px source prints at ~890dpi, well past
 * anything a label printer resolves. Degrades to a burgundy serif "N" if the
 * asset is missing.
 */
function Monogram({ className }: { className: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can 404 before React attaches onError; re-check on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span className={`flex aspect-770/451 shrink-0 items-center justify-center font-serif text-[16pt] leading-none font-bold text-black ${className}`}>
        N
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand asset from /public; a plain <img> is needed for the onError fallback
    <img
      ref={imgRef}
      src="/needleye-monogram.png"
      alt="Needleye"
      onError={() => setFailed(true)}
      className={`block h-auto shrink-0 brightness-0 ${className}`}
    />
  );
}
