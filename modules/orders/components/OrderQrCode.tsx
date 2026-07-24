"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * Just a link to this order's own (already auth-gated) detail URL -- scanning
 * it opens the same page anyone would get by navigating there directly.
 * Logged-out scanners hit proxy.ts's redirect to /login exactly as they
 * would from any other link; logged-in scanners see the same role-scoped
 * data (payment fields already stripped server-side for Master Tailor,
 * see OrdersService.applyPaymentVisibility).
 */
export function OrderQrCode({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-app-sm border border-border bg-white p-3">
        <QRCodeSVG value={url} size={140} />
      </div>
      <p className="text-center text-[11px] text-text-muted">Scan to open this order. Login required.</p>
    </div>
  );
}
