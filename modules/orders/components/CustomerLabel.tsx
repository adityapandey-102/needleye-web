"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { formatDateOnly, PRODUCT_CATEGORIES, type Order } from "../../../lib/domain";
import { Button } from "../../../components/ui/Button";

/**
 * A single-A4-sheet package label for an order: a large, scannable QR plus the
 * details a workshop needs to match a physical package to its order (customer,
 * phone, order number, category, due date, brief order details). Rendered on
 * its own route so window.print() emits just this sheet -- the app chrome
 * (sidebar/header) is already `print:hidden`. The on-screen toolbar is hidden
 * when printing.
 */
export function CustomerLabel({ order, qrUrl }: { order: Order; qrUrl: string }) {
  const category = PRODUCT_CATEGORIES.find((c) => c.value === order.productCategory);

  return (
    <div className="mx-auto max-w-[210mm]">
      {/* Print-page setup: single A4 sheet, comfortable margin. */}
      <style>{`@media print { @page { size: A4; margin: 14mm; } }`}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline">← Back to Order</Button>
        </Link>
        <Button onClick={() => window.print()}>🖨️ Print Label</Button>
      </div>

      <div className="mx-auto rounded-app-lg border-2 border-border bg-white p-8 text-black shadow-app print:border-black print:shadow-none">
        {/* Brand header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-app bg-primary text-2xl">🪡</div>
            <div>
              <div className="font-serif text-2xl font-bold leading-none">Needle Eye</div>
              <div className="text-xs tracking-wide text-neutral-500 uppercase">Luxury Tailoring</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs tracking-wide text-neutral-500 uppercase">Order Number</div>
            <div className="font-mono text-2xl font-bold">{order.orderNumber}</div>
          </div>
        </div>

        {/* QR + key details */}
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center">
            <div className="rounded-app border-2 border-black bg-white p-4">
              <QRCodeSVG value={qrUrl} size={260} level="M" />
            </div>
            <p className="mt-2 max-w-[260px] text-center text-[11px] text-neutral-500">
              Scan to open this order (staff login required).
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <LabelField label="Customer" value={order.customerName} big />
            <LabelField label="Phone" value={order.phone} />
            <LabelField label="Product Category" value={category?.label ?? order.productCategory} />
            <LabelField label="Due Date" value={formatDateOnly(order.dueDate)} big />
            <LabelField label="Bill Number" value={order.billNumber} />
          </div>
        </div>

        {/* Order details block */}
        <div className="mt-8 border-t-2 border-black pt-4">
          <div className="text-xs tracking-wide text-neutral-500 uppercase">Order Details</div>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{order.orderDetails || "—"}</p>
          {(order.handWork || order.machineWork || order.purchaseRequired) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {order.handWork && <Tag>Hand Work</Tag>}
              {order.machineWork && <Tag>Machine Work</Tag>}
              {order.purchaseRequired && <Tag>Purchase Required</Tag>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className={`font-semibold ${big ? "text-2xl" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black px-3 py-0.5 text-xs font-medium">{children}</span>
  );
}
