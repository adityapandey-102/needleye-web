import { redirect } from "next/navigation";
import { formatCurrency, hasCapability, revenueMonthLabel, monthRangeLabel, type LedgerMonthsExport } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { RevenuePrintTrigger } from "../../../../modules/revenue/components/RevenuePrintTrigger";

/**
 * Printable revenue statement (owner_manager / accountant only). Opened by the
 * monthly ledger's "Export PDF" with ?from=YYYY-MM&to=YYYY-MM; the browser's
 * print dialog saves it as a PDF. App chrome is print:hidden, so the print
 * output is just this statement. Every month of the range (at most 240), from
 * GET /ledger/months/export -- the same figures as the screen.
 */
export default async function RevenuePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "reports:financial")) {
    redirect("/orders");
  }

  const { from, to } = await searchParams;
  const query = new URLSearchParams({ from: from ?? "", to: to ?? "" });
  const report: LedgerMonthsExport = await apiFetchServer(`/ledger/months/export?${query.toString()}`);
  const t = report.totals;
  const rangeLabel = monthRangeLabel(report.from, report.to);
  const generated = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: report.timeZone }).format(new Date());

  return (
    <div className="mx-auto max-w-4xl text-black">
      <RevenuePrintTrigger />

      <div className="rounded-app-lg border border-border bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-app bg-primary text-xl">🪡</div>
            <div>
              <div className="font-serif text-2xl leading-none font-bold">Needleye</div>
              <div className="text-xs tracking-wide text-neutral-500 uppercase">Revenue Statement</div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>
              Period: <span className="font-semibold text-black">{rangeLabel}</span>
            </div>
            <div>
              {revenueMonthLabel(report.from)} → {revenueMonthLabel(report.to)}
            </div>
            <div>Generated {generated}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PrintStat label="Total booked" value={formatCurrency(t.total)} note={`${t.ordersBooked} orders`} />
          <PrintStat label="Paid so far" value={formatCurrency(t.paidSoFar)} />
          <PrintStat label="Outstanding" value={formatCurrency(t.outstanding)} />
          <PrintStat label="Cash collected" value={formatCurrency(t.cashCollected)} note={`${t.paymentsCount} payments`} />
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left text-xs text-neutral-600 uppercase">
              <th className="py-2 pr-3 font-semibold">Month</th>
              <th className="py-2 pr-3 font-semibold">Orders</th>
              <th className="py-2 pr-3 text-right font-semibold">Total booked</th>
              <th className="py-2 pr-3 text-right font-semibold">Paid so far</th>
              <th className="py-2 pr-3 text-right font-semibold">Outstanding</th>
              <th className="py-2 text-right font-semibold">Cash collected</th>
            </tr>
          </thead>
          <tbody>
            {report.months.map((m) => (
              <tr key={m.month} className="border-b border-neutral-200">
                <td className="py-1.5 pr-3">
                  {revenueMonthLabel(m.month)}
                  {m.books.status === "closed" ? " · Closed" : ""}
                </td>
                <td className="py-1.5 pr-3">
                  {m.ordersBooked}
                  {m.ordersNotPriced > 0 ? ` (${m.ordersNotPriced} not priced)` : ""}
                </td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(m.total)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(m.paidSoFar)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(m.outstanding)}</td>
                <td className="py-1.5 text-right font-medium">{formatCurrency(m.cashCollected)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3">{t.ordersBooked}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(t.total)}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(t.paidSoFar)}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(t.outstanding)}</td>
              <td className="py-2 text-right">{formatCurrency(t.cashCollected)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[11px] text-neutral-400">
          Needleye · by Sakina Ahmed · Calendar months. Total booked and paid so far follow each month&rsquo;s orders (paid on any date); cash
          collected is the money received in that month, from any order. Closed: the month&rsquo;s books are closed and its cash collected is final.
          Confidential.
        </p>
      </div>
    </div>
  );
}

function PrintStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-app border border-neutral-200 p-3">
      <div className="text-[10px] tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {note && <div className="text-[11px] text-neutral-500">{note}</div>}
    </div>
  );
}
