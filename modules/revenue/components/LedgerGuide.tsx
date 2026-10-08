"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "../../../components/ui/Icon";

// The guide's text is loaded only when someone opens it -- the page doesn't carry it.
const LedgerGuideContent = dynamic(() => import("./LedgerGuideContent").then((m) => m.LedgerGuideContent), {
  loading: () => (
    <div className="mt-3 space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 animate-pulse rounded-app bg-app-bg/70" />
      ))}
    </div>
  ),
});

/**
 * The Revenue & Ledger guide, at the top of the Revenue page: how the numbers,
 * prices, payments, closing and the books check work, in plain words, for the
 * Owner and the Accountant. Closed until opened.
 */
export function LedgerGuide() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section aria-label="Revenue and ledger guide" className="mb-5 rounded-app border border-border-light bg-card px-4 py-3 shadow-app">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span aria-hidden className="mt-0.5 text-lg leading-none">
            📘
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">Revenue &amp; Ledger guide</h2>
            <p className="text-xs text-text-muted">How the numbers, prices, payments, closing and the books check work &mdash; in simple words.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-1 rounded-app border border-border px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-primary-bg"
        >
          {open ? "Hide guide" : "Open guide"}
          <Icon name="chevron-right" size={14} className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>
      <div id={panelId} hidden={!open}>
        {open && <LedgerGuideContent />}
      </div>
    </section>
  );
}
