import { redirect } from "next/navigation";
import {
  daysOverdue,
  formatCurrency,
  formatDateOnly,
  granularLabel,
  hasCapability,
  overdueOutstandingTotal,
  paymentStatusLabel,
  type OverdueExportResult,
} from "../../../../lib/domain";
import { apiFetchServer, ApiError } from "../../../../lib/api/server";
import { RevenuePrintTrigger } from "../../../../modules/revenue/components/RevenuePrintTrigger";

/**
 * Printable overdue orders (owner_manager / accountant only) -- the "Export
 * PDF" of the overdue-orders export: EVERY order past its delivery due date and
 * not delivered (the Overdue list), all on one page (no paging), most overdue
 * first, with payment details and the total to collect. The browser's print dialog saves it as a
 * PDF. Landscape: fourteen columns don't fit a portrait sheet.
 */
export default async function OverduePrintPage() {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "reports:financial")) {
    redirect("/orders");
  }

  let data: OverdueExportResult;
  try {
    data = await apiFetchServer("/orders/overdue/export");
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

  const total = overdueOutstandingTotal(data);
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: data.timeZone });

  return (
    <div className="mx-auto max-w-6xl text-black">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
      <RevenuePrintTrigger />

      <div className="rounded-app-lg border border-border bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <div className="font-serif text-2xl leading-none font-bold">Needleye</div>
            <div className="mt-1 text-xs tracking-wide text-neutral-600 uppercase">Overdue orders</div>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <div>
              Overdue as of <span className="font-semibold text-black">{formatDateOnly(data.asOf)}</span>
            </div>
            <div>
              {data.orders.length} {data.orders.length === 1 ? "order" : "orders"} · {formatCurrency(total)} to collect
            </div>
            <div>Generated {generated}</div>
          </div>
        </div>

        {/* On screen a narrow window scrolls the table sideways; on paper (A4 landscape) it fits. */}
        <div className="mt-5 overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-240 text-[11px] print:min-w-0">
            <thead>
              <tr className="border-b border-black text-left text-[10px] text-neutral-700 uppercase">
                <th className="py-2 pr-2 font-semibold">Order ID</th>
                <th className="py-2 pr-2 font-semibold">Customer</th>
                <th className="py-2 pr-2 font-semibold">Phone</th>
                <th className="py-2 pr-2 font-semibold">Designer</th>
                <th className="py-2 pr-2 font-semibold">Stage</th>
                <th className="py-2 pr-2 font-semibold">Payment</th>
                <th className="py-2 pr-2 text-right font-semibold">Paid</th>
                <th className="py-2 pr-2 text-right font-semibold">Outstanding</th>
                <th className="py-2 pr-2 font-semibold">Booked</th>
                <th className="py-2 pr-2 font-semibold">Due</th>
                <th className="py-2 pr-2 text-right font-semibold">Days late</th>
                <th className="py-2 pr-2 font-semibold">Last paid</th>
                <th className="py-2 font-semibold">Next payment</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-neutral-600">
                    No order is overdue.
                  </td>
                </tr>
              ) : (
                data.orders.map((o) => (
                  <tr key={o.id} className="break-inside-avoid border-b border-neutral-300 align-top">
                    <td className="py-1.5 pr-2 font-medium whitespace-nowrap">{o.orderNumber}</td>
                    <td className="py-1.5 pr-2">{o.customerName}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{o.phone}</td>
                    <td className="py-1.5 pr-2">{o.designerName ?? "—"}</td>
                    <td className="py-1.5 pr-2">{granularLabel(o.productionStatus)}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{paymentStatusLabel(o.paymentStatus)}</td>
                    <td className="py-1.5 pr-2 text-right whitespace-nowrap">{formatCurrency(o.amountPaid)}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold whitespace-nowrap">
                      {o.outstanding === null ? "Not priced" : formatCurrency(o.outstanding)}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateOnly(o.bookingDate)}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateOnly(o.dueDate)}</td>
                    <td className="py-1.5 pr-2 text-right whitespace-nowrap">{daysOverdue(o.dueDate, data.asOf)}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{o.lastPaymentDate ? formatDateOnly(o.lastPaymentDate) : "—"}</td>
                    <td className="py-1.5 whitespace-nowrap">{o.nextPaymentDate ? formatDateOnly(o.nextPaymentDate) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td className="py-2 pr-2" colSpan={7}>
                  Total to collect · {data.orders.length} {data.orders.length === 1 ? "order" : "orders"}
                </td>
                <td className="py-2 pr-2 text-right whitespace-nowrap">{formatCurrency(total)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-6 text-[10px] text-neutral-500">
          Needleye · by Sakina Ahmed · Every order past its due date and not delivered, most overdue first. Confidential.
        </p>
      </div>
    </div>
  );
}
