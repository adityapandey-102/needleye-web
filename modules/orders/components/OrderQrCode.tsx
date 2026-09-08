"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Just a link to this order's own (already auth-gated) detail URL -- scanning
 * it opens the same page anyone would get by navigating there directly.
 * Logged-out scanners hit proxy.ts's redirect to /login exactly as they
 * would from any other link; logged-in scanners see the same role-scoped
 * data (payment fields already stripped server-side for Master Tailor,
 * see OrdersService.applyPaymentVisibility).
 *
 * The QR encodes an ABSOLUTE url. It uses NEXT_PUBLIC_WEB_APP_URL when set (so a
 * shop can pin the QR to a LAN IP like http://192.168.1.8:3000 that phones on
 * the network can reach, even when staff view the app at localhost on the host
 * machine) and otherwise falls back to the origin the viewer is on -- which is
 * the right default in production. NOTE: NEXT_PUBLIC_* vars are inlined when the
 * (dev) server STARTS, so changing .env.local requires a dev-server restart.
 * Computed after mount to avoid an SSR/client hydration mismatch.
 */
export function OrderQrCode({ path }: { path: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // Deferred so it's not a synchronous setState in the effect body; client-only.
    const base = process.env.NEXT_PUBLIC_WEB_APP_URL || window.location.origin;
    queueMicrotask(() => setUrl(`${base}${path}`));
  }, [path]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-app-sm border border-border bg-white p-3">
        {url ? <QRCodeSVG value={url} size={140} /> : <div className="h-35 w-35 animate-pulse rounded bg-primary-bg/40" />}
      </div>
      <p className="text-center text-[11px] text-text-muted">Scan to open this order. Login required.</p>
    </div>
  );
}
