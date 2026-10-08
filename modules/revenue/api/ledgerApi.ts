import type { LedgerClosing, LedgerMonthClosings, LedgerMonthsExport, LedgerMonthsPage, LedgerSummary, LedgerVerification } from "../../../lib/domain";
import { apiFetch } from "../../../lib/api/client";

/** The Revenue page's numbers (GET /ledger/*) -- owner_manager / accountant only (reports:financial). */
export const ledgerApi = {
  /** This month's cards. */
  summary(): Promise<LedgerSummary> {
    return apiFetch("/ledger/summary");
  },

  /** One page of calendar months in [from, to] (YYYY-MM), newest first, with the range's totals. */
  months(from: string, to: string, offset: number, limit: number): Promise<LedgerMonthsPage> {
    const query = new URLSearchParams({ from, to, offset: String(offset), limit: String(limit) });
    return apiFetch(`/ledger/months?${query.toString()}`);
  },

  /** Every month of the range (at most 240) -- the CSV export. */
  export(from: string, to: string): Promise<LedgerMonthsExport> {
    return apiFetch(`/ledger/months/export?${new URLSearchParams({ from, to }).toString()}`);
  },

  /** A month's books: its figures now, and every close and reopen (ADR 0008 phase 5). */
  closings(month: string): Promise<LedgerMonthClosings> {
    return apiFetch(`/ledger/months/${encodeURIComponent(month)}/closings`);
  },

  /** Close a finished month's books (owner_manager / accountant). */
  async close(month: string): Promise<LedgerClosing> {
    const res = (await apiFetch(`/ledger/months/${encodeURIComponent(month)}/close`, { method: "POST" })) as { closing: LedgerClosing };
    return res.closing;
  },

  /** Reopen a closed month (owner_manager), with a reason. */
  async reopen(month: string, reason: string): Promise<LedgerClosing> {
    const res = (await apiFetch(`/ledger/months/${encodeURIComponent(month)}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })) as { closing: LedgerClosing };
    return res.closing;
  },

  /** The latest check of the register against the receipts. */
  verification(): Promise<LedgerVerification> {
    return apiFetch("/ledger/reconciliations/latest");
  },

  /** "Verify now": run the check. */
  verifyNow(): Promise<LedgerVerification> {
    return apiFetch("/ledger/reconciliations", { method: "POST" });
  },
};
