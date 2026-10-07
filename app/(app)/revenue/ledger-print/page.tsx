import { redirect } from "next/navigation";
import {
  formatCurrency,
  formatDateOnly,
  formatLedgerWhen,
  hasCapability,
  ledgerActionLabel,
  ledgerEffect,
  ledgerTotals,
  paymentMethodLabel,
  subtractMoney,
  type LedgerEvent,
  type LedgerExportResult,
} from "../../../../lib/domain";
import { apiFetchServer, ApiError } from "../../../../lib/api/server";
import { RevenuePrintTrigger } from "../../../../modules/revenue/components/RevenuePrintTrigger";

/**
 * Printable Ledger Activity (owner_manager / accountant only) -- the "Export
 * PDF" of the revenue page's Ledger Activity for ONE week or ONE month. Same
 * rows as the on-screen table, every page of them, plus totals; the browser's
 * print dialog saves it as a PDF. Times are the shop's (the API sends its zone),
 * so a server render in UTC still prints IST.
 */
export default async function LedgerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "reports:financial")) {
    redirect("/orders");
  }

  const { from = "", to = "" } = await searchParams;
  let data: LedgerExportResult;
  try {
    data = await apiFetchServer(`/orders/ledger-events/export?${new URLSearchParams({ from, to }).toString()}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      return (
        <div className="mx-auto max-w-3xl rounded-app-lg border border-border bg-white p-8 text-sm">
          <p className="font-semibold">This export can&rsquo;t be made.</p>
          <p className="mt-1 text-text-muted">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  const totals = ledgerTotals(data.events);
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: data.timeZone });

  return (
    <div className="mx-auto max-w-4xl text-black">
      <RevenuePrintTrigger />

      <div className="rounded-app-lg border border-border bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-app bg-primary text-xl">🪡</div>
            <div>
              <div className="font-serif text-2xl leading-none font-bold">Needleye</div>
              <div className="text-xs tracking-wide text-neutral-500 uppercase">Ledger Activity</div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>
              Period: <span className="font-semibold text-black">{periodTitle(data.from, data.to)}</span>
            </div>
            <div>
              {formatDateOnly(data.from)} → {formatDateOnly(data.to)}
            </div>
            <div>Generated {generated}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PrintStat label={`Recorded (${totals.recordedCount})`} value={formatCurrency(totals.recordedAmount)} />
          <PrintStat label={`Removed (${totals.removedCount})`} value={formatCurrency(subtractMoney("0", totals.removedAmount))} />
          <PrintStat label={`Edits (${totals.editedCount})`} value={formatCurrency(totals.editedNet)} />
          <PrintStat label="Net change" value={formatCurrency(totals.net)} />
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left text-xs text-neutral-600 uppercase">
              <th className="py-2 pr-3 font-semibold">When</th>
              <th className="py-2 pr-3 font-semibold">Who</th>
              <th className="py-2 pr-3 font-semibold">Action</th>
              <th className="py-2 pr-3 font-semibold">Order</th>
              <th className="py-2 pr-3 font-semibold">Change</th>
              <th className="py-2 text-right font-semibold">Effect</th>
            </tr>
          </thead>
          <tbody>
            {data.events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500">
                  No payment activity in this period.
                </td>
              </tr>
            ) : (
              data.events.map((ev) => (
                <tr key={ev.id} className="break-inside-avoid border-b border-neutral-200">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{formatLedgerWhen(ev.at, data.timeZone)}</td>
                  <td className="py-1.5 pr-3">{ev.actorName ?? "—"}</td>
                  <td className="py-1.5 pr-3">{ledgerActionLabel(ev.action)}</td>
                  <td className="py-1.5 pr-3">{ev.orderNumber ?? "—"}</td>
                  <td className="py-1.5 pr-3">{changeText(ev)}</td>
                  <td className="py-1.5 text-right font-medium whitespace-nowrap">{formatCurrency(ledgerEffect(ev))}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td className="py-2 pr-3" colSpan={5}>
                Net change · {data.events.length} {data.events.length === 1 ? "entry" : "entries"}
              </td>
              <td className="py-2 text-right">{formatCurrency(totals.net)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[11px] text-neutral-400">
          Needleye · by Sakina Ahmed · Every payment recorded, edited or removed in the period, newest first. Confidential.
        </p>
      </div>
    </div>
  );
}

/** "June 2026" for a whole calendar month, otherwise the week's start date. */
function periodTitle(from: string, to: string): string {
  const [y, m] = from.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  if (from.endsWith("-01") && to === `${from.slice(0, 8)}${String(lastDay).padStart(2, "0")}`) {
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T00:00:00Z`));
  }
  return `Week of ${formatDateOnly(from)}`;
}

/** The table's "Change" column as text: amount · method, or before → after for an edit. */
function changeText(ev: LedgerEvent): string {
  if (ev.action === "updated" && ev.before && ev.after) {
    const amount =
      ev.before.amount === ev.after.amount
        ? formatCurrency(ev.after.amount)
        : `${formatCurrency(ev.before.amount)} → ${formatCurrency(ev.after.amount)}`;
    const method =
      ev.before.method === ev.after.method
        ? paymentMethodLabel(ev.after.method)
        : `${paymentMethodLabel(ev.before.method)} → ${paymentMethodLabel(ev.after.method)}`;
    return `${amount} · ${method}`;
  }
  return ev.snapshot ? `${formatCurrency(ev.snapshot.amount)} · ${paymentMethodLabel(ev.snapshot.method)}` : "—";
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app border border-neutral-200 p-3">
      <div className="text-[10px] tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
