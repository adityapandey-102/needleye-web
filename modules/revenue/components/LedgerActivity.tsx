"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDate, PAYMENT_METHODS, type LedgerEvent, type LedgerEventsResult } from "../../../lib/domain";
import { ordersApi } from "../../orders/api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Icon } from "../../../components/ui/Icon";

/** How many events per page. */
const PAGE_SIZE = 15;

type Granularity = "year" | "month" | "week";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last 6 years through the current one — enough history for a boutique's ledger review. */
function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - 5 + i);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Monday-started weeks that overlap the given month, oldest first — mirrors the staff report's week model. */
function weeksInMonth(year: number, month1: number): { from: string; to: string; label: string }[] {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const last = new Date(Date.UTC(year, month1, 0));
  // Back up to the Monday on//before the 1st (getUTCDay: 0=Sun..6=Sat).
  const start = new Date(first);
  const dow = (start.getUTCDay() + 6) % 7; // 0 = Monday
  start.setUTCDate(start.getUTCDate() - dow);

  const weeks: { from: string; to: string; label: string }[] = [];
  const cursor = new Date(start);
  while (cursor <= last) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const fmt = (d: Date) => `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
    weeks.push({
      from: `${weekStart.getUTCFullYear()}-${pad(weekStart.getUTCMonth() + 1)}-${pad(weekStart.getUTCDate())}`,
      to: `${weekEnd.getUTCFullYear()}-${pad(weekEnd.getUTCMonth() + 1)}-${pad(weekEnd.getUTCDate())}`,
      label: `${fmt(weekStart)} – ${fmt(weekEnd)}`,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return weeks;
}

function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/**
 * Ledger Activity — the payment audit trail on the revenue page: who recorded,
 * edited, or removed a payment, when, on which order, and what changed. Reads
 * the append-only audit log via GET /orders/ledger-events. Cascading
 * year → month → week filters narrow the window; the table pages through the
 * matches (newest first). Owner/Manager + Accountant only (reports:financial).
 */
export function LedgerActivity() {
  const years = useMemo(() => yearOptions(), []);
  const now = new Date();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [weekIndex, setWeekIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<LedgerEventsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const weeks = useMemo(() => weeksInMonth(year, month), [year, month]);
  // Keep the selected week valid when the month/year (and thus week list) changes.
  const safeWeekIndex = Math.min(weekIndex, Math.max(0, weeks.length - 1));

  // Resolve the active [from, to] window from the granularity + selectors.
  const { from, to } = useMemo(() => {
    if (granularity === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
    if (granularity === "month") {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
    }
    const w = weeks[safeWeekIndex];
    return { from: w?.from ?? `${year}-${pad(month)}-01`, to: w?.to ?? `${year}-${pad(month)}-01` };
  }, [granularity, year, month, weeks, safeWeekIndex]);

  // Any filter change resets to the first page (done in the handlers below, not
  // in an effect, to avoid a cascading-render setState-in-effect).
  function changeGranularity(g: Granularity) {
    setGranularity(g);
    setOffset(0);
  }
  function changeYear(y: number) {
    setYear(y);
    setOffset(0);
  }
  function changeMonth(m: number) {
    setMonth(m);
    setOffset(0);
  }
  function changeWeek(i: number) {
    setWeekIndex(i);
    setOffset(0);
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ordersApi.ledgerEvents({ from, to, limit: PAGE_SIZE, offset });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load ledger activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [from, to, offset, reloadKey]);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <Card className="mt-5">
      <CardHeader
        icon="🧾"
        iconTone="blue"
        title="Ledger Activity"
        subtitle="Who recorded, edited, or removed a payment — and what changed"
      />
      <CardBody>
        {/* Cascading filters: granularity → year → (month) → (week). */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-muted">View by</label>
            <div className="inline-flex rounded-app-sm border border-border p-0.5">
              {(["year", "month", "week"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => changeGranularity(g)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    granularity === g ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-muted">Year</label>
            <Select className="w-auto" value={year} onChange={(e) => changeYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          {granularity !== "year" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Month</label>
              <Select className="w-auto" value={month} onChange={(e) => changeMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {granularity === "week" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Week</label>
              <Select className="w-auto" value={safeWeekIndex} onChange={(e) => changeWeek(Number(e.target.value))}>
                {weeks.map((w, i) => (
                  <option key={w.from} value={i}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
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
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-app-sm bg-app-bg/70" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">No payment activity in this period.</div>
        ) : (
          <div className={`transition-opacity ${loading ? "pointer-events-none opacity-50" : "opacity-100"}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-sm">
                <thead>
                  <tr className="border-b border-border-light text-left text-xs text-text-muted">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">Who</th>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Order</th>
                    <th className="py-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="rows-in">
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-border-light transition-colors last:border-0 hover:bg-primary-bg/30">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-text-secondary">{formatDate(ev.at)}</td>
                      <td className="py-2.5 pr-4 font-medium text-text-primary">{ev.actorName ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <ActionBadge action={ev.action} />
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-text-primary">{ev.orderNumber ?? "—"}</td>
                      <td className="py-2.5 text-text-secondary">
                        <ChangeCell event={ev} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
              <span>
                Showing <span className="font-semibold text-text-secondary">{showingFrom}</span>–
                <span className="font-semibold text-text-secondary">{showingTo}</span> of{" "}
                <span className="font-semibold text-text-secondary">{total}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" className="px-3 py-1 text-xs" disabled={!canPrev} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
                  <Icon name="chevron-right" size={14} className="rotate-180" />
                  Prev
                </Button>
                <Button variant="outline" className="px-3 py-1 text-xs" disabled={!canNext} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                  Next
                  <Icon name="chevron-right" size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ActionBadge({ action }: { action: LedgerEvent["action"] }) {
  const map = {
    created: { label: "Recorded", cls: "bg-success-bg text-success" },
    updated: { label: "Edited", cls: "bg-warning-bg text-warning" },
    deleted: { label: "Removed", cls: "bg-error-bg text-error" },
  } as const;
  const { label, cls } = map[action];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

/** Renders what changed: a signed amount for created/deleted, a before→after for edits. */
function ChangeCell({ event }: { event: LedgerEvent }) {
  if (event.action === "updated" && event.before && event.after) {
    const amountChanged = event.before.amount !== event.after.amount;
    const methodChanged = event.before.method !== event.after.method;
    return (
      <span>
        {amountChanged ? (
          <>
            <span className="text-text-muted line-through">{formatCurrency(event.before.amount)}</span>{" "}
            <span className="font-semibold text-text-primary">→ {formatCurrency(event.after.amount)}</span>
          </>
        ) : (
          <span className="font-semibold text-text-primary">{formatCurrency(event.after.amount)}</span>
        )}
        {methodChanged && (
          <span className="ml-1 text-text-muted">
            ({methodLabel(event.before.method)} → {methodLabel(event.after.method)})
          </span>
        )}
        {!amountChanged && !methodChanged && <span className="ml-1 text-text-muted">· {methodLabel(event.after.method)}</span>}
      </span>
    );
  }

  const snap = event.snapshot;
  if (!snap) return <span className="text-text-muted">—</span>;
  const sign = event.action === "deleted" ? "−" : "+";
  const tone = event.action === "deleted" ? "text-error" : "text-success";
  return (
    <span>
      <span className={`font-semibold ${tone}`}>
        {sign}
        {formatCurrency(snap.amount)}
      </span>{" "}
      <span className="text-text-muted">· {methodLabel(snap.method)}</span>
    </span>
  );
}
