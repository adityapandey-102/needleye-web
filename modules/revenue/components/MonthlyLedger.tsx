"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency, MONTH_OPTIONS, revenueYears, toDateInputValue, type LedgerMonth, type LedgerMonthsPage } from "../../../lib/domain";
import { ledgerApi } from "../api/ledgerApi";
import { downloadCsv, ledgerMonthsToCsv, revenueMonthLabel, monthRangeLabel } from "../export";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";
import { MonthBooksDialog } from "./MonthBooksDialog";

const PAGE_SIZE = 12;

/** The user's current month (YYYY-MM) -- the range's default end. */
function currentMonth(): string {
  return toDateInputValue(new Date()).slice(0, 7);
}

/**
 * Calendar months for any range (from 2020), newest first, paged by the API
 * -- 12 months a page -- with the range's totals summed by the API, and CSV /
 * PDF export of the whole range. Replaces the old unpaged "Monthly Revenue
 * History" (payday cycles are gone: always calendar months). Each month shows
 * its books (phase 5): Close a finished month, see a closed one's record, and
 * -- Owner only -- reopen it.
 */
export function MonthlyLedger({ canClose, canReopen }: { canClose: boolean; canReopen: boolean }) {
  const { showToast } = useToast();
  const now = useMemo(() => currentMonth(), []);
  const years = useMemo(() => revenueYears(Number(now.slice(0, 4))), [now]);
  const [from, setFrom] = useState(`${now.slice(0, 4)}-01`);
  const [to, setTo] = useState(now);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LedgerMonthsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [booksMonth, setBooksMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ledgerApi.months(from, to, page * PAGE_SIZE, PAGE_SIZE);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the months");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [from, to, page, reloadKey]);

  /** A new range starts on page 1; picking a start after the end pulls the end along (and vice versa). */
  function changeRange(nextFrom: string, nextTo: string, moved: "from" | "to") {
    if (nextFrom > now) nextFrom = now;
    if (nextTo > now) nextTo = now;
    if (nextFrom > nextTo) {
      if (moved === "from") nextTo = nextFrom;
      else nextFrom = nextTo;
    }
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(0);
  }

  function preset(kind: "year" | "last12" | "all") {
    const year = now.slice(0, 4);
    if (kind === "year") changeRange(`${year}-01`, now, "from");
    else if (kind === "all") changeRange(`${years[0]}-01`, now, "from");
    else {
      const [y, m] = now.split("-").map(Number);
      const start = new Date(Date.UTC(y!, m! - 12, 1)).toISOString().slice(0, 7);
      changeRange(start, now, "from");
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const report = await ledgerApi.export(from, to);
      downloadCsv(`needleye-revenue-${monthRangeLabel(from, to).replace(/[^\w–-]+/g, "-")}.csv`, ledgerMonthsToCsv(report));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  const totals = data?.totals;
  return (
    <Card className="mb-5">
      <CardHeader icon="📈" iconTone="green" title="Monthly ledger" subtitle="Calendar months · booked, paid, outstanding and cash collected" />
      <CardBody>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <MonthPicker label="From" value={from} years={years} onChange={(v) => changeRange(v, to, "from")} />
            <MonthPicker label="To" value={to} years={years} onChange={(v) => changeRange(from, v, "to")} />
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              <Button variant="outline" className="px-2.5 py-1.5 text-xs" onClick={() => preset("year")}>
                This year
              </Button>
              <Button variant="outline" className="px-2.5 py-1.5 text-xs" onClick={() => preset("last12")}>
                Last 12 months
              </Button>
              <Button variant="outline" className="px-2.5 py-1.5 text-xs" onClick={() => preset("all")}>
                Since {years[0]}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={exporting || !data} onClick={() => void exportCsv()}>
              <Icon name="download" size={14} /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Link href={`/revenue/print?from=${from}&to=${to}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="px-3 py-1.5 text-xs">
                <Icon name="printer" size={14} /> Export PDF
              </Button>
            </Link>
          </div>
        </div>

        {/* The range's totals, summed by the API -- not just the visible page. */}
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-app border border-border-light bg-border-light text-sm sm:grid-cols-4" aria-label="Range totals">
          <RangeTotal label={`Booked · ${monthRangeLabel(from, to)}`} value={totals?.total} note={totals ? `${totals.ordersBooked} orders` : undefined} />
          <RangeTotal label="Paid so far" value={totals?.paidSoFar} />
          <RangeTotal label="Outstanding" value={totals?.outstanding} />
          <RangeTotal label="Cash collected" value={totals?.cashCollected} note={totals ? `${totals.paymentsCount} payments` : undefined} />
        </div>

        {error ? (
          <div className="flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
            <span>{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-app-sm bg-app-bg/70" />
            ))}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-xs text-text-muted">
                  <th className="py-2 pr-4 font-medium">Month</th>
                  <th className="py-2 pr-4 font-medium">Orders</th>
                  <th className="py-2 pr-4 text-right font-medium">Total booked</th>
                  <th className="py-2 pr-4 text-right font-medium">Paid so far</th>
                  <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
                  <th className="py-2 pr-4 text-right font-medium">Cash collected</th>
                  <th className="py-2 text-right font-medium">Books</th>
                </tr>
              </thead>
              <tbody className="rows-in">
                {data?.months.map((m) => (
                  <tr key={m.month} className="border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30">
                    <td className="py-2.5 pr-4 font-medium text-text-primary">{revenueMonthLabel(m.month)}</td>
                    <td className="py-2.5 pr-4 text-text-secondary">
                      {m.ordersBooked}
                      {m.ordersNotPriced > 0 && <span className="ml-1 text-xs text-warning-text">({m.ordersNotPriced} not priced)</span>}
                    </td>
                    <td className="figure py-2.5 pr-4 text-right text-text-primary">{formatCurrency(m.total)}</td>
                    <td className="figure py-2.5 pr-4 text-right text-success">{formatCurrency(m.paidSoFar)}</td>
                    <td className="figure py-2.5 pr-4 text-right text-warning">{formatCurrency(m.outstanding)}</td>
                    <td className="figure py-2.5 pr-4 text-right font-semibold text-text-primary">{formatCurrency(m.cashCollected)}</td>
                    <td className="py-2.5 text-right">
                      <BooksCell m={m} canClose={canClose} onOpen={() => setBooksMonth(m.month)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} className="mt-2 -mx-4 -mb-4" />}
        <p className="mt-3 text-[11px] text-text-muted">
          Total booked and paid so far follow each month&rsquo;s orders (paid on any date); cash collected is the money received in that month, from
          any order. A closed month&rsquo;s payments are locked; only the Owner can reopen it.
        </p>
      </CardBody>
      {booksMonth && (
        <MonthBooksDialog
          month={booksMonth}
          canClose={canClose}
          canReopen={canReopen}
          onCancel={() => setBooksMonth(null)}
          onChanged={() => {
            setBooksMonth(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </Card>
  );
}

/** A month's books: Closed (opens its record), Close… (a finished open month), or Running (this month). */
function BooksCell({ m, canClose, onOpen }: { m: LedgerMonth; canClose: boolean; onOpen: () => void }) {
  const label = revenueMonthLabel(m.month);
  if (m.books.status === "closed") {
    return (
      <button
        onClick={onOpen}
        aria-label={`${label}: books closed — see the closing record`}
        className="inline-flex items-center gap-1 rounded-full bg-primary-bg px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-bg/70"
      >
        <Icon name="lock" size={12} /> Closed
      </button>
    );
  }
  if (!m.books.ended) return <span className="text-[11px] text-text-muted">Running</span>;
  return canClose ? (
    <Button variant="outline" className="px-2 py-1 text-[11px]" onClick={onOpen} aria-label={`Close ${label}`}>
      Close…
    </Button>
  ) : (
    <span className="text-[11px] text-text-muted">Open</span>
  );
}

function MonthPicker({ label, value, years, onChange }: { label: string; value: string; years: number[]; onChange: (month: string) => void }) {
  const [year, month] = value.split("-");
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-text-muted">{label}</span>
      <div className="flex gap-1.5">
        <Select aria-label={`${label} month`} className="w-auto" value={month} onChange={(e) => onChange(`${year}-${e.target.value}`)}>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label.slice(0, 3)}
            </option>
          ))}
        </Select>
        <Select aria-label={`${label} year`} className="w-auto" value={year} onChange={(e) => onChange(`${e.target.value}-${month}`)}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function RangeTotal({ label, value, note }: { label: string; value?: string; note?: string }) {
  return (
    <div className="bg-app-bg/40 px-4 py-3">
      <div className="text-[11px] font-medium text-text-muted">{label}</div>
      <div className="figure mt-1 text-[16px] text-text-primary">{value === undefined ? "—" : formatCurrency(value)}</div>
      {note && <div className="text-[11px] text-text-muted">{note}</div>}
    </div>
  );
}
