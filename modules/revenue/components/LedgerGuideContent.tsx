import type { ReactNode } from "react";

/**
 * The Revenue & Ledger guide's text (loaded only when the guide is opened).
 * Written for the Owner and the Accountant, in plain words. Every rule here is
 * a rule the app enforces -- needleye-api ADR 0008 (phases 1-5). If a rule
 * changes, change this guide in the same change.
 */
export function LedgerGuideContent() {
  return (
    <div className="mt-3 space-y-2 text-sm text-text-secondary">
      <p className="text-xs text-text-muted">
        This page is for the Owner and the Accountant. Every number here comes from the orders and payments entered in the app &mdash; nobody types
        these numbers by hand.
      </p>

      <Section n={1} title="The 4 numbers" open>
        <p>Every month shows four numbers:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Total booked</b> &mdash; the price of all orders <i>booked</i> in that month (by booking date). An order without a price isn&rsquo;t
            counted yet; it shows as &ldquo;not priced&rdquo;.
          </li>
          <li>
            <b>Paid so far</b> &mdash; how much customers have paid <i>on those orders</i> up to today, even if they paid in a later month.
          </li>
          <li>
            <b>Outstanding</b> &mdash; Total booked minus Paid so far: what is still to be collected on that month&rsquo;s orders.
          </li>
          <li>
            <b>Cash collected</b> &mdash; all money <i>received</i> in that month, from any order, old or new.
          </li>
        </ul>
        <Example>
          <p>An order is booked on 10 March for ₹10,000. The customer pays ₹4,000 on 10 March and ₹6,000 on 5 April.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>March: Total booked ₹10,000 · Paid so far ₹10,000 · Outstanding ₹0 · Cash collected ₹4,000</li>
            <li>April: Cash collected ₹6,000 (the April payment). This order is not in April&rsquo;s Total booked.</li>
          </ul>
          <p className="mt-1">
            So <b>Paid so far</b> and <b>Cash collected</b> are different on purpose: one follows the orders, the other follows the money.
          </p>
        </Example>
        <ul className="list-disc space-y-1 pl-5">
          <li>Months are calendar months (the 1st to the last day), in Indian time.</li>
          <li>The totals above the month table are for the whole range you picked, not only the page you can see.</li>
        </ul>
      </Section>

      <Section n={2} title="Prices">
        <ul className="list-disc space-y-1 pl-5">
          <li>A new order is saved without a price. The app then asks &ldquo;Add pricing now?&rdquo;.</li>
          <li>The first price can be set by the Owner, the Accountant or the order&rsquo;s designer.</li>
          <li>
            After that, only the Owner or the Accountant can change it:
            <ul className="mt-0.5 list-[circle] space-y-0.5 pl-5">
              <li>
                <b>Raise</b> the price &mdash; with a reason.
              </li>
              <li>
                <b>Discount</b> (lower the price) &mdash; with a reason, and never below what the customer has already paid.
              </li>
            </ul>
          </li>
          <li>Before a price is saved, the app shows the amount in words, to double-check it.</li>
          <li>A price of ₹0 means free work: the order counts as fully paid.</li>
          <li>
            An order can&rsquo;t be marked <b>Delivered</b> without a price. Once it is Delivered, the price is locked.
          </li>
          <li>Every price change is kept in the order&rsquo;s price history (on the order page): who, when and why.</li>
        </ul>
      </Section>

      <Section n={3} title="Payments">
        <ul className="list-disc space-y-1 pl-5">
          <li>A payment can be recorded by the Owner, the Accountant, or the order&rsquo;s designer (on their own orders).</li>
          <li>A payment can be recorded only after the order has a price.</li>
          <li>A payment can&rsquo;t be more than what is left to pay.</li>
          <li>The app records a payment with today&rsquo;s date.</li>
          <li>
            The payment status changes by itself: <b>Not priced</b> → <b>Unpaid</b> → <b>Advance paid</b> → <b>Fully paid</b>.
          </li>
          <li>If the order isn&rsquo;t fully paid, you can set the date of the next payment.</li>
        </ul>
      </Section>

      <Section n={4} title="Fixing a payment mistake">
        <ul className="list-disc space-y-1 pl-5">
          <li>Only the Owner or the Accountant can remove a payment.</li>
          <li>
            A payment can be removed only if the order is <b>not Delivered</b> and the payment&rsquo;s month is <b>not closed</b>.
          </li>
          <li>Wrong amount? Remove the payment and record the right amount. The new entry gets today&rsquo;s date.</li>
          <li>
            Nothing disappears from history: every payment recorded, edited or removed is listed in <b>Ledger Activity</b> (at the bottom of this page)
            with who did it and when.
          </li>
          <li>Once an order is Delivered, its payments are final.</li>
          <li>A price can&rsquo;t be lowered below what has already been paid &mdash; the app can&rsquo;t do this yet.</li>
        </ul>
      </Section>

      <Section n={5} title="Closing a month">
        <p>
          Closing a month means: <i>&ldquo;this month&rsquo;s money is checked and final&rdquo;</i>.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The Owner or the Accountant can close a month, once the month has ended.</li>
          <li>
            In the month table, click <b>Close…</b> on the month, check the numbers, then click <b>Close</b>.
          </li>
          <li>
            After closing, <b>no payment dated in that month can be added, changed or removed</b>. The month shows 🔒 <b>Closed</b>.
          </li>
          <li>
            The month&rsquo;s numbers at the moment of closing are saved as its <b>closing record</b>.
          </li>
          <li>
            Closing doesn&rsquo;t lock that month&rsquo;s orders: a discount, or a customer paying later, can still change its Total booked, Paid so
            far and Outstanding. Its <b>Cash collected</b> stays fixed.
          </li>
          <li>
            To change something in a closed month, the <b>Owner</b> reopens it (click 🔒 Closed, write the reason, click Reopen), fixes it, and
            closes it again.
          </li>
          <li>Every close and reopen is kept: who, when, and the reason.</li>
        </ul>
        <Example title="A good monthly routine">
          <ol className="list-decimal space-y-0.5 pl-5">
            <li>In the first days of the new month, make sure all of last month&rsquo;s payments are entered.</li>
            <li>
              Check that the books bar says <b>Books verified</b> (or press <b>Verify now</b>).
            </li>
            <li>Close last month.</li>
          </ol>
        </Example>
      </Section>

      <Section n={6} title="The books check">
        <ul className="list-disc space-y-1 pl-5">
          <li>Every night at 2:00 AM, the app checks the books by itself.</li>
          <li>
            It counts every order and payment again and compares them with the monthly numbers. It also checks that:
            <ul className="mt-0.5 list-[circle] space-y-0.5 pl-5">
              <li>no order is paid more than its price;</li>
              <li>every order shows the right payment status;</li>
              <li>every closed month still has the same cash as when it was closed.</li>
            </ul>
          </li>
          <li>
            <b>Books verified</b> means everything matches.
          </li>
          <li>
            <b>The check found problems</b> means something doesn&rsquo;t match. Click <b>Details</b> to see which day and which number. Don&rsquo;t
            close a month until it is fixed &mdash; tell your developer.
          </li>
          <li>
            <b>Verify now</b> runs the same check at any time. The check only reads: it never changes a number.
          </li>
          <li>If the nightly check stops running, a warning appears in the books bar.</li>
        </ul>
      </Section>

      <Section n={7} title="Exports and history">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Export CSV</b> (opens in Excel) and <b>Export PDF</b> give every month of the range you picked. The Books column shows{" "}
            <b>Closed</b>, <b>Open</b> (the month has ended but isn&rsquo;t closed) or <b>Running</b> (this month).
          </li>
          <li>
            <b>Ledger Activity</b> lists every payment recorded, edited or removed: who, when, the amount and the method. It can be exported by month
            or by week.
          </li>
          <li>
            Changes to orders, prices and stages are in <b>Reports → Daily activity</b> (Owner).
          </li>
        </ul>
      </Section>

      <Section n={8} title="Quick answers">
        <dl className="space-y-2">
          <Qa q="Why is a new order not in Total booked?">It has no price yet. Set the price and it is counted.</Qa>
          <Qa q="A March order was paid in April. Where does it show?">In April&rsquo;s Cash collected, and in March&rsquo;s Paid so far.</Qa>
          <Qa q="Why is there no Remove button on a payment?">
            The order is Delivered, or the payment&rsquo;s month is closed (🔒 Month closed), or you aren&rsquo;t the Owner or the Accountant.
          </Qa>
          <Qa q="I need to fix a payment in a closed month.">
            The Owner reopens the month with a reason, the payment is fixed, then the month is closed again.
          </Qa>
          <Qa q="The books check found problems.">Don&rsquo;t close any month. Open Details and share it with your developer.</Qa>
          <Qa q="Who can see this page?">Only the Owner and the Accountant.</Qa>
        </dl>
      </Section>
    </div>
  );
}

function Section({ n, title, open = false, children }: { n: number; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-app border border-border-light bg-app-bg/30 open:bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 font-semibold text-text-primary select-none [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs text-primary">{n}</span>
        <span className="flex-1">{title}</span>
        <span aria-hidden className="text-text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="space-y-2 px-3 pt-0.5 pb-3 leading-relaxed">{children}</div>
    </details>
  );
}

function Example({ title = "Example", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-app-sm border border-gold/25 bg-gold-bg/40 px-3 py-2 text-[13px]">
      <div className="mb-0.5 text-[11px] font-semibold tracking-wide text-gold uppercase">{title}</div>
      {children}
    </div>
  );
}

function Qa({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-text-primary">{q}</dt>
      <dd className="text-text-secondary">{children}</dd>
    </div>
  );
}
