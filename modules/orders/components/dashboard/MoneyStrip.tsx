import Link from "next/link";
import { collectedShare, formatCurrency, type OrderStats } from "../../../../lib/domain";
import { Icon } from "../../../../components/ui/Icon";
import { CountUp } from "../../../../components/ui/CountUp";

const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/**
 * Payments on the brand's dark red with the gold outline: collected and
 * outstanding for the Owner and Accountant (with how much of the booked value
 * is in), and for everyone who sees payments, what's owed and what has no
 * price yet.
 */
export function MoneyStrip({ stats, showRevenue }: { stats: OrderStats; showRevenue: boolean }) {
  const share = collectedShare(stats.collectedRevenue, stats.outstandingRevenue);
  const cells = [
    ...(showRevenue
      ? [
          { href: "/revenue", icon: "wallet" as const, label: "Collected", value: formatCurrency(stats.collectedRevenue), countTo: Number(stats.collectedRevenue ?? 0), money: true, caption: "Received, all orders", tone: "text-gold-light" },
          { href: "/orders/pending-payments", icon: "trending-up" as const, label: "Outstanding", value: formatCurrency(stats.outstandingRevenue), countTo: Number(stats.outstandingRevenue ?? 0), money: true, caption: "Still to collect", tone: "text-white" },
        ]
      : []),
    { href: "/orders/pending-payments", icon: "card" as const, label: "Pending payments", value: (stats.pendingPayments ?? 0).toLocaleString("en-IN"), countTo: stats.pendingPayments ?? 0, money: false, caption: "Orders still owing", tone: "text-white" },
    { href: "/orders/bucket/not_priced", icon: "receipt" as const, label: "Price not set", value: (stats.notPriced ?? 0).toLocaleString("en-IN"), countTo: stats.notPriced ?? 0, money: false, caption: "Need a price", tone: "text-white" },
  ];

  return (
    <section aria-labelledby="payments-heading">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="payments-heading" className="text-sm font-semibold text-text-primary">
          Payments
        </h2>
        {showRevenue && (
          <Link href="/revenue" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Revenue &amp; Ledger <Icon name="chevron-right" size={13} />
          </Link>
        )}
      </div>
      <div className="hero-band">
        <div className={`hero-cells stagger-in grid-cols-2 ${cells.length === 4 ? "lg:grid-cols-4" : ""}`}>
          {cells.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="hero-cell group px-5 pt-5 pb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light/70 focus-visible:ring-inset"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-white/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-app bg-white/10 text-gold-light ring-1 ring-inset ring-white/15 transition-transform duration-200 group-hover:scale-110">
                  <Icon name={c.icon} size={14} />
                </span>
                {c.label}
              </span>
              <span className={`figure mt-2.5 block truncate text-[21px] leading-tight sm:text-[26px] ${c.tone}`}>
                <CountUp to={c.countTo} final={c.value} format={c.money ? rupees : undefined} />
              </span>
              <span className="mt-1 block text-xs text-(--on-dark-muted)">{c.caption}</span>
            </Link>
          ))}
        </div>
        {showRevenue && (
          <div className="border-t border-white/14 px-5 py-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">Collected of the value booked</span>
              <span className="figure font-semibold text-gold-light">{share}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12" role="img" aria-label={`${share}% of the value booked has been collected`}>
              <div className="grow-x gradient-gold h-full rounded-full" style={{ width: `${share}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
