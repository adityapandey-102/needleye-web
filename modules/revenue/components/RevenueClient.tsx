"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency, type OrderStats, type RevenueReport } from "../../../lib/domain";
import { ordersApi } from "../../orders/api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { periodLabel, revenueToCsv, downloadCsv } from "../export";
import { LedgerActivity } from "./LedgerActivity";

/** Years offered in the range selector: the last 10 years through the current one. */
function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, i) => current - 10 + i);
}

export function RevenueClient() {
  const years = useMemo(() => yearOptions(), []);
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState(currentYear);
  const [toYear, setToYear] = useState(currentYear);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Keep the range coherent -- picking a "from" after "to" pulls "to" along.
  function changeFrom(y: number) {
    setFromYear(y);
    if (y > toYear) setToYear(y);
  }
  function changeTo(y: number) {
    setToYear(y);
    if (y < fromYear) setFromYear(y);
  }

  const from = `${fromYear}-01-01`;
  const to = `${toYear}-12-31`;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rev, st] = await Promise.all([ordersApi.revenue(from, to), ordersApi.stats()]);
        if (!cancelled) {
          setReport(rev);
          setStats(st);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load revenue report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  const periods = report?.periods ?? [];
  const maxCollected = Math.max(1, ...periods.map((p) => p.collected));
  const rangeTotal = periods.reduce((sum, p) => sum + p.collected, 0);
  const rangeLabel = fromYear === toYear ? `${fromYear}` : `${fromYear}–${toYear}`;

  function handleExportCsv() {
    if (!report) return;
    downloadCsv(`needleye-revenue-${rangeLabel}.csv`, revenueToCsv(report));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-text-primary">Revenue &amp; Ledger</h1>
        <p className="text-sm text-text-muted">
          Collected and outstanding revenue across all orders, with a monthly accounting-cycle breakdown.
        </p>
      </div>

      {/* Financial summary -- all-time collected/outstanding + open payments. */}
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <SummaryCard label="Collected Revenue" value={formatCurrency(stats?.collectedRevenue)} tone="success" loading={loading && !stats} />
        <SummaryCard label="Outstanding Revenue" value={formatCurrency(stats?.outstandingRevenue)} tone="warning" loading={loading && !stats} />
        <Link
          href="/orders/pending-payments"
          className="rounded-app-lg border border-border bg-card p-4 shadow-app transition-shadow hover:shadow-app-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="text-[11px] font-bold tracking-wide text-text-muted uppercase">Pending Payments</div>
          <div className="mt-1 text-2xl font-extrabold text-text-primary">{loading && !stats ? "—" : (stats?.pendingPayments ?? 0)}</div>
          <div className="mt-1 text-[11px] font-semibold text-primary">View orders needing collection →</div>
        </Link>
      </div>

      <Card>
        <CardHeader
          icon="📈"
          iconTone="green"
          title="Monthly Revenue History"
          subtitle={
            report
              ? report.cycleStartDay === 1
                ? "Calendar-month accounting periods"
                : `Accounting periods start on day ${report.cycleStartDay} of each month`
              : "Collected revenue by accounting period"
          }
        />
        <CardBody>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted uppercase">From year</label>
                <Select className="w-auto" value={fromYear} onChange={(e) => changeFrom(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted uppercase">To year</label>
                <Select className="w-auto" value={toYear} onChange={(e) => changeTo(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={!report || periods.length === 0} onClick={handleExportCsv}>
                ⬇️ Export CSV
              </Button>
              <Link href={`/revenue/print?from=${from}&to=${to}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="px-3 py-1.5 text-xs">
                  🖨️ Export PDF
                </Button>
              </Link>
            </div>
          </div>

          <div className="mb-4 text-sm text-text-secondary">
            {loading ? (
              "Loading…"
            ) : (
              <>
                Collected in <span className="font-semibold text-text-primary">{rangeLabel}</span> over {periods.length}{" "}
                {periods.length === 1 ? "period" : "periods"}:{" "}
                <span className="font-semibold text-text-primary">{formatCurrency(rangeTotal)}</span>
              </>
            )}
          </div>

          {error ? (
            <div className="flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
              <span>{error}</span>
              <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-app-sm bg-primary-bg/40" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">No collected revenue in {rangeLabel}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-105 text-sm">
                <thead>
                  <tr className="border-b border-border-light text-left text-xs text-text-muted uppercase">
                    <th className="py-2 pr-4 font-medium">Period</th>
                    <th className="py-2 pr-4 font-medium">Collected</th>
                    <th className="hidden py-2 pr-4 font-medium sm:table-cell">Payments</th>
                    <th className="py-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Most recent first for at-a-glance reading. */}
                  {[...periods].reverse().map((p) => (
                    <tr key={p.periodStart} className="border-b border-border-light last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-text-primary">{periodLabel(p.periodStart, report!.cycleStartDay)}</td>
                      <td className="py-2.5 pr-4 font-semibold text-text-primary">{formatCurrency(p.collected)}</td>
                      <td className="hidden py-2.5 pr-4 text-text-secondary sm:table-cell">{p.paymentCount}</td>
                      <td className="py-2.5">
                        <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-primary-bg/60">
                          <div className="h-full rounded-full bg-success" style={{ width: `${Math.round((p.collected / maxCollected) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Payment audit trail — who recorded/edited/removed a payment, when, and what changed. */}
      <LedgerActivity />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: string;
  tone: "success" | "warning";
  loading: boolean;
}) {
  const valueClass = tone === "success" ? "text-success" : "text-warning";
  return (
    <div className="rounded-app-lg border border-border bg-card p-4 shadow-app">
      <div className="text-[11px] font-bold tracking-wide text-text-muted uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${valueClass}`}>{loading ? "—" : value}</div>
    </div>
  );
}
