import { redirect } from "next/navigation";
import { formatCurrency, hasCapability, periodLabel, type RevenueReport } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { RevenuePrintTrigger } from "../../../../modules/revenue/components/RevenuePrintTrigger";

/**
 * Printable revenue statement (owner_manager / accountant only). Opened by the
 * revenue page's "Export PDF" action with ?from=&to=; the browser's print
 * dialog saves it as a PDF. App chrome is print:hidden, so the print output is
 * just this statement.
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
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const report: RevenueReport = await apiFetchServer(`/orders/revenue?${query.toString()}`);

  const total = report.periods.reduce((sum, p) => sum + p.collected, 0);
  const payments = report.periods.reduce((sum, p) => sum + p.paymentCount, 0);
  const fromYear = report.from.slice(0, 4);
  const toYear = report.to.slice(0, 4);
  const rangeLabel = fromYear === toYear ? fromYear : `${fromYear}–${toYear}`;
  const generated = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-3xl text-black">
      <RevenuePrintTrigger />

      <div className="rounded-app-lg border border-border bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-app bg-primary text-xl">🪡</div>
            <div>
              <div className="font-serif text-2xl leading-none font-bold">Needle Eye</div>
              <div className="text-xs tracking-wide text-neutral-500 uppercase">Revenue Statement</div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>
              Period: <span className="font-semibold text-black">{rangeLabel}</span>
            </div>
            <div>{report.from} → {report.to}</div>
            <div>Generated {generated}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <PrintStat label="Total Collected" value={formatCurrency(total)} />
          <PrintStat label="Accounting Periods" value={String(report.periods.length)} />
          <PrintStat label="Payments Recorded" value={String(payments)} />
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left text-xs text-neutral-600 uppercase">
              <th className="py-2 pr-4 font-semibold">Period</th>
              <th className="py-2 pr-4 font-semibold">Collected</th>
              <th className="py-2 font-semibold">Payments</th>
            </tr>
          </thead>
          <tbody>
            {report.periods.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-neutral-500">
                  No collected revenue in {rangeLabel}.
                </td>
              </tr>
            ) : (
              report.periods.map((p) => (
                <tr key={p.periodStart} className="border-b border-neutral-200">
                  <td className="py-2 pr-4">{periodLabel(p.periodStart, report.cycleStartDay)}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(p.collected)}</td>
                  <td className="py-2">{p.paymentCount}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4">{formatCurrency(total)}</td>
              <td className="py-2">{payments}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[11px] text-neutral-400">
          Needle Eye Luxury Tailoring · Collected revenue by{" "}
          {report.cycleStartDay === 1 ? "calendar month" : `accounting cycle (day ${report.cycleStartDay})`}. Confidential.
        </p>
      </div>
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app border border-neutral-200 p-3">
      <div className="text-[10px] tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
