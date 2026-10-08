import type { LedgerMonthsExport, LedgerMonthsPage, LedgerSummary } from "../../../lib/domain";
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
};
