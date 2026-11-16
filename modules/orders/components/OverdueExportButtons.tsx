"use client";

import { useState } from "react";
import { overdueOrdersToCsv } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { downloadCsv } from "../../revenue/export";
import { Button, ButtonLink } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";

/**
 * "Export CSV" / "Export PDF" for EVERY overdue order -- past its delivery due
 * date and not delivered, the Overdue list (/orders/bucket/overdue) -- the
 * whole list at once, not a page of it, with each order's payment details. Owner / accountant only (the parent
 * shows it for `reports:financial`; the API enforces the same). The CSV is
 * fetched on click and built in the browser; the PDF is the printable page
 * /revenue/overdue-print, opened in a new tab.
 */
export function OverdueExportButtons({ className = "" }: { className?: string }) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleCsv() {
    setExporting(true);
    try {
      const data = await ordersApi.overdueOrdersExport();
      if (data.orders.length === 0) {
        showToast("No order is overdue right now — nothing to export.", "info");
        return;
      }
      downloadCsv(`needleye-overdue-orders-${data.asOf}.csv`, overdueOrdersToCsv(data));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't export the overdue orders", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={exporting} onClick={() => void handleCsv()}>
        <Icon name="download" size={14} /> {exporting ? "Exporting…" : "Export CSV"}
      </Button>
      <ButtonLink href="/revenue/overdue-print" target="_blank" rel="noopener noreferrer" variant="outline" className="px-3 py-1.5 text-xs">
        <Icon name="printer" size={14} /> Export PDF
      </ButtonLink>
    </div>
  );
}
