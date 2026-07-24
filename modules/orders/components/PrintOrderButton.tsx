"use client";

import { Button } from "../../../components/ui/Button";

/**
 * A tiny client-only wrapper around window.print() -- OrderDetailView is a
 * Server Component, and Server Components can't pass closures as event
 * handler props, so the one thing that needs `onClick` lives in its own
 * file (same pattern as OrderQrCode/PaymentLedger/OrderTimeline).
 */
export function PrintOrderButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      🖨️ Print Order
    </Button>
  );
}
