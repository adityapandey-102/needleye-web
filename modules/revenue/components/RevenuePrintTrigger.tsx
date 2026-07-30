"use client";

import { Button } from "../../../components/ui/Button";

/**
 * Print controls for the revenue statement route -- a Print button plus a Close
 * (for the tab opened by "Export PDF"). Hidden when printing so only the
 * statement itself appears on the page. Kept as its own client component
 * because the statement route is a Server Component.
 */
export function RevenuePrintTrigger() {
  return (
    <div className="mb-5 flex justify-end gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.close()}>
        Close
      </Button>
      <Button onClick={() => window.print()}>🖨️ Print / Save as PDF</Button>
    </div>
  );
}
