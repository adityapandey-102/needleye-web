"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { formatDateOnly, productCategoryDisplayName, type Order } from "../../../lib/domain";
import { Button } from "../../../components/ui/Button";

/** Physical sticker dimensions -- printed, then stuck on the order's processing box. */
const LABEL_W = "8.5in";
const LABEL_H = "2.75in";

/**
 * The order's package label, laid out to match the boutique's existing printed
 * sticker: an antique-gold band framing a white field, the Needleye monogram and
 * wordmark at the left, labelled rule-underlined fields across the middle, and a
 * large scannable QR at the right. Order details sit in an open block (no rule)
 * set apart below the fields, taking whatever vertical space is left, so a long
 * description wraps over several lines instead of being cut to one.
 *
 * Sized to the real sticker stock (8.5in x 2.75in) and driven by an
 * `@page { size: 8.5in 2.75in; margin: 0 }` rule, so Print emits exactly one
 * sticker with no browser margin. `print-color-adjust: exact` keeps the gold
 * band from being dropped by the browser's "background graphics" default.
 *
 * The customer phone is intentionally NOT on the label (it's a workshop/package
 * tag, not a contact card). Rendered on its own route so window.print() emits
 * just this sticker -- the app chrome (sidebar/header) is already `print:hidden`.
 */
export function CustomerLabel({ order }: { order: Order }) {
  // "Shirt (Mens Wear)" for labels that repeat across collections.
  const categoryName = productCategoryDisplayName(order.productCategory);
  // Encode an absolute URL from the origin the label is printed from (LAN IP,
  // localhost, or prod domain) so the printed QR resolves for staff scanning on
  // that same network -- not a fixed env host. Computed after mount (client-only).
  // NEXT_PUBLIC_WEB_APP_URL (e.g. a LAN IP a phone can reach) when set, else the
  // viewing origin. Inlined at dev-server START -- restart after editing .env.local.
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WEB_APP_URL || window.location.origin;
    // ?scan=1 -> scanning this printed label opens the order with the
    // "product received / advance stage" popup (same as scanning the on-screen QR).
    queueMicrotask(() => setQrUrl(`${base}/orders/${order.id}?scan=1`));
  }, [order.id]);

  return (
    <div className="mx-auto w-fit">
      <style>{`
        @page { size: ${LABEL_W} ${LABEL_H}; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          /* The band and rules are backgrounds/borders -- force them to print even
             when the user leaves "Background graphics" unticked. */
          .ne-label, .ne-label * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .ne-label { box-shadow: none !important; }
        }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline">← Back to Order</Button>
        </Link>
        <Button onClick={() => window.print()}>🖨️ Print Label</Button>
      </div>

      {/* The sticker itself -- fixed physical size, on screen and on paper alike. */}
      <div
        className="ne-label flex shrink-0 overflow-hidden bg-gold p-[0.09in] text-black shadow-app print:shadow-none"
        style={{ width: LABEL_W, height: LABEL_H }}
      >
        <div className="flex w-full gap-[0.16in] bg-white px-[0.17in] py-[0.13in]">
          {/* Brand block */}
          <div className="flex w-[1.5in] shrink-0 flex-col items-center justify-center gap-[0.13in] border-r border-gold/45 pr-[0.15in]">
            <div className="text-center">
              <Monogram />
              <div className="mt-[0.03in] font-serif text-[11.5pt] leading-none font-bold text-primary">Needleye</div>
              <div className="mt-[0.03in] text-[4.8pt] tracking-[0.16em] text-neutral-500 uppercase">
                Luxury Tailoring
              </div>
            </div>
            <div className="w-full border-t border-gold/35 pt-[0.09in] text-center">
              <div className="text-[5pt] tracking-[0.14em] text-gold uppercase">Order Number</div>
              <div className="font-mono text-[13pt] leading-tight font-bold">{order.orderNumber}</div>
            </div>
          </div>

          {/* Fields -- labelled, rule-underlined, in the sticker's own idiom */}
          <div className="flex min-w-0 flex-1 flex-col gap-[0.12in]">
            <Row>
              <Field label="Customer" value={order.customerName} grow big />
              {/* Bill numbers run long -- given a wide column and a condensed mono
                  face so the whole value shows instead of truncating. */}
              <Field label="Bill Number" value={order.billNumber} className="w-[1.75in]" mono />
            </Row>
            <Row>
              <Field label="Due Date" value={formatDateOnly(order.dueDate)} className="w-[1in]" />
              <Field label="Designer" value={order.designerName ?? "—"} grow />
              <Field label="Master Tailor" value={order.masterTailorName ?? "—"} grow />
            </Row>
            <Row>
              <Field label="Product Category" value={categoryName} grow />
              <div className="flex shrink-0 items-end gap-[0.12in] pb-px">
                <Check label="Hand Work" on={order.handWork} />
                <Check label="Machine Work" on={order.machineWork} />
                <Check label="Purchase" on={order.purchaseRequired} />
              </div>
            </Row>

            {/* Order details -- open block, no rule, set apart from the field rows and
                taking all remaining height so a long description wraps freely. */}
            <div className="mt-[0.05in] flex min-h-0 flex-1 flex-col">
              <div className="text-[5pt] tracking-[0.14em] text-gold uppercase">Order Details</div>
              <p className="mt-[0.02in] min-h-0 flex-1 overflow-hidden text-[7.8pt] leading-[1.35] wrap-anywhere whitespace-pre-wrap">
                {order.orderDetails || "—"}
              </p>
            </div>
          </div>

          {/* QR */}
          <div className="flex w-[1.75in] shrink-0 flex-col items-center justify-center border-l border-gold/45 pl-[0.15in]">
            <div className="h-[1.6in] w-[1.6in] border border-gold/60 p-[0.04in]">
              {qrUrl ? (
                <QRCodeSVG value={qrUrl} size={512} level="M" className="h-full w-full" />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
            <p className="mt-[0.05in] text-center text-[4.6pt] leading-[1.35] text-neutral-500">
              Scan to open this order (staff login required).
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-[8.5in] text-xs text-text-muted print:hidden">
        Sticker size is {LABEL_W} × {LABEL_H}. In the print dialog choose that paper size (or a custom size with
        those dimensions), set margins to <strong>None</strong>, scale to <strong>100%</strong>, and tick{" "}
        <strong>Background graphics</strong> if the gold border doesn&apos;t appear.
      </p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-end gap-[0.16in]">{children}</div>;
}

/** One labelled value sitting on a rule, mirroring the printed sticker's "NAME ______" fields. */
function Field({
  label,
  value,
  big,
  grow,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  big?: boolean;
  grow?: boolean;
  mono?: boolean;
  className?: string;
}) {
  const valueSize = big
    ? "text-[13pt] leading-tight"
    : mono
      ? "font-mono text-[8.5pt] leading-tight"
      : "text-[9.5pt] leading-tight";

  return (
    <div className={`${grow ? "min-w-0 flex-1" : "shrink-0"} ${className}`}>
      <div className="text-[5pt] tracking-[0.14em] text-gold uppercase">{label}</div>
      <div className={`truncate border-b border-neutral-400 pb-px font-semibold ${valueSize}`} title={value}>
        {value}
      </div>
    </div>
  );
}

/** A ticked/blank box, the sticker's own way of showing a yes/no attribute. */
function Check({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-[0.04in]">
      <span className="flex h-[0.14in] w-[0.14in] items-center justify-center border border-neutral-500 text-[7.5pt] leading-none font-bold text-primary">
        {on ? "✓" : ""}
      </span>
      <span className="text-[5pt] tracking-[0.08em] text-neutral-600 uppercase">{label}</span>
    </div>
  );
}

/**
 * The brand monogram -- the ornate "N" crossed by two needles.
 * `public/needleye-monogram.png` is already trimmed to the artwork (770x451,
 * transparent background), so it just needs a width; the height follows the
 * aspect ratio. At 1.32in wide the 770px source prints at ~580dpi, well past
 * anything a label printer resolves. Degrades to a burgundy serif "N" if the
 * asset is missing.
 */
function Monogram() {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can 404 before React attaches onError; re-check on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span className="mx-auto flex h-[0.77in] w-[1.32in] items-center justify-center font-serif text-[30pt] leading-none font-bold text-primary">
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
      className="mx-auto block h-auto w-[1.32in]"
    />
  );
}
