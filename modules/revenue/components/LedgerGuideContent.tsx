import type { ReactNode } from "react";

/**
 * The Revenue & Ledger guide's text (loaded only when the guide is opened).
 * Written for the Owner and the Accountant, in plain words and short steps.
 * Every rule here is a rule the app enforces -- needleye-api ADR 0008 and its
 * 2026-10-09 amendment. If a rule changes, change this guide in the same change.
 */
export function LedgerGuideContent() {
  return (
    <div className="mt-3 space-y-2 text-sm text-text-secondary">
      <p className="text-xs text-text-muted">
        For the Owner and the Accountant. Every number on this page comes from the orders and payments entered in the app &mdash; nobody types
        them by hand.
      </p>

      <Section n={1} title="The 4 numbers" open>
        <Rows
          rows={[
            ["Total booked", "The price of every order booked in the month (by booking date). Orders without a price aren't counted yet."],
            ["Paid so far", "What customers have paid on those orders, up to today — even if they paid in a later month."],
            ["Outstanding", "Total booked minus Paid so far: still to collect on that month's orders."],
            ["Cash collected", "All money received in the month, from any order, old or new."],
          ]}
        />
        <Example>
          <p>Booked 10 March for ₹10,000. Paid ₹4,000 on 10 March and ₹6,000 on 5 April.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>March: Total booked ₹10,000 · Paid so far ₹10,000 · Outstanding ₹0 · Cash collected ₹4,000</li>
            <li>April: Cash collected ₹6,000. The order isn&rsquo;t in April&rsquo;s Total booked.</li>
          </ul>
          <p className="mt-1">
            Paid so far and Cash collected differ on purpose: one follows the orders, the other follows the money.
          </p>
        </Example>
        <p className="text-xs text-text-muted">Months are calendar months, in Indian time. The totals above the table cover the whole range you picked.</p>
      </Section>

      <Section n={2} title="Prices">
        <Steps
          items={[
            <>A new order is saved without a price; the app then asks &ldquo;Add pricing now?&rdquo;.</>,
            <>
              <b>Set price</b> (the first price): the Owner, the Accountant or the order&rsquo;s designer. The app shows the amount in words to
              double-check it.
            </>,
            <>
              <b>Correct price</b> (any later change, up or down): only the Owner or the Accountant, with a reason.
            </>,
            <>
              A price can&rsquo;t go <b>below what has already been paid</b>. To go lower, first fix the payment (see 4), then correct the price.
            </>,
            <>₹0 means free work: the order counts as fully paid.</>,
            <>
              An order can&rsquo;t be marked <b>Delivered</b> without a price. Delivery doesn&rsquo;t lock anything &mdash; only closing the month
              does (see 5).
            </>,
            <>Every price change is kept in the order&rsquo;s price history: who, when, why.</>,
          ]}
        />
      </Section>

      <Section n={3} title="Payments">
        <Steps
          items={[
            <>Recorded by the Owner, the Accountant, or the order&rsquo;s designer (their own orders) &mdash; only once the order has a price.</>,
            <>A payment can&rsquo;t be more than what is left to pay, and can&rsquo;t be dated in the future.</>,
            <>
              The status follows by itself: <b>Not priced</b> → <b>Unpaid</b> → <b>Advance paid</b> → <b>Fully paid</b>.
            </>,
            <>
              The Owner or the Accountant can <b>remove</b> a payment &mdash; before or after delivery &mdash; unless its month is closed (🔒 Month
              closed).
            </>,
          ]}
        />
      </Section>

      <Section n={4} title="Fixing a mistake">
        <Rows
          rows={[
            ["Wrong payment amount", "Remove the payment, then record the right amount."],
            ["Wrong price", "Correct price, with the reason."],
            ["The price must go below what's paid", "1. Remove (or fix) the payment that's too much.  2. Correct the price."],
            ["The mistake is in a closed month", "The Owner reopens the month (with a reason), it's fixed, then the month is closed again."],
          ]}
        />
        <p className="text-xs text-text-muted">
          Nothing disappears: every payment recorded, edited or removed is in <b>Ledger Activity</b>; every price change is in the order&rsquo;s
          price history.
        </p>
      </Section>

      <Section n={5} title="Closing a month">
        <p>
          Closing means <i>&ldquo;this month is checked and final&rdquo;</i>. The Owner or the Accountant closes a month once it has ended: click{" "}
          <b>Close…</b> in the month table, check the numbers, click <b>Close</b>.
        </p>
        <Rows
          rows={[
            ["Payments dated in that month", "Can't be added, changed or removed."],
            ["Orders booked in that month", "Can't be repriced, and no order can be booked into or moved out of it."],
            ["Still allowed", "Payments today on those orders (a customer paying later), in an open month."],
          ]}
        />
        <Steps
          items={[
            <>
              A month can&rsquo;t be closed while one of its orders has <b>no price</b> &mdash; price them first.
            </>,
            <>
              The month&rsquo;s numbers when it closes are saved as its <b>closing record</b>.
            </>,
            <>
              To change something, the <b>Owner</b> reopens the month (click 🔒 Closed, write the reason, Reopen), fixes it, and closes it again.
              Every close and reopen is kept.
            </>,
          ]}
        />
        <Example title="A good monthly routine">
          <ol className="list-decimal space-y-0.5 pl-5">
            <li>In the first days of the new month, enter all of last month&rsquo;s payments and price every order.</li>
            <li>
              Check that the books bar says <b>Books verified</b> (or press <b>Verify now</b>).
            </li>
            <li>Close last month.</li>
          </ol>
        </Example>
      </Section>

      <Section n={6} title="The books check">
        <Steps
          items={[
            <>Every night at 2:00 AM the app recounts every order and payment and compares them with the monthly numbers.</>,
            <>It also checks that no order is paid more than its price, every payment status is right, and every closed month still matches its closing record.</>,
            <>
              <b>Books verified</b> = everything matches. <b>The check found problems</b> = click <b>Details</b> to see which day and which number;
              don&rsquo;t close a month until it&rsquo;s fixed, and tell your developer.
            </>,
            <>
              <b>Verify now</b> runs the same check any time. It only reads &mdash; it never changes a number.
            </>,
          ]}
        />
      </Section>

      <Section n={7} title="Exports and history">
        <Steps
          items={[
            <>
              <b>Export CSV</b> (Excel) and <b>Export PDF</b> give every month of the range. The Books column says <b>Closed</b>, <b>Open</b> or{" "}
              <b>Running</b> (this month).
            </>,
            <>
              <b>Ledger Activity</b> lists every payment recorded, edited or removed &mdash; who, when, amount, method &mdash; and exports by month or
              week.
            </>,
            <>
              Order, price and stage changes are in <b>Reports → Daily activity</b> (Owner).
            </>,
          ]}
        />
      </Section>

      <Section n={8} title="Quick answers">
        <dl className="space-y-2">
          <Qa q="Why is a new order not in Total booked?">It has no price yet. Set the price and it&rsquo;s counted.</Qa>
          <Qa q="A March order was paid in April. Where does it show?">In April&rsquo;s Cash collected, and in March&rsquo;s Paid so far.</Qa>
          <Qa q="Why can't I lower this price?">It would go below what&rsquo;s paid. Fix the payment first, then correct the price.</Qa>
          <Qa q="Why is there no Remove button on a payment?">Its month is closed (🔒 Month closed), or you aren&rsquo;t the Owner or the Accountant.</Qa>
          <Qa q="Why can't I close last month?">One of its orders has no price yet, or the month hasn&rsquo;t ended. Price the orders, then close.</Qa>
          <Qa q="The books check found problems.">Don&rsquo;t close any month. Open Details and share it with your developer.</Qa>
          <Qa q="Who can see this page?">Only the Owner and the Accountant.</Qa>
        </dl>
      </Section>
    </div>
  );
}

/** A small two-column table: what -> what it means. */
function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border-light overflow-hidden rounded-app-sm border border-border-light">
      {rows.map(([term, meaning]) => (
        <div key={term} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[13rem_1fr] sm:gap-3">
          <dt className="font-semibold text-text-primary">{term}</dt>
          <dd className="whitespace-pre-line">{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A short list of rules, one line each. */
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
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
