"use client";

import { useEffect, useState } from "react";
import { busiestDay, dayLabel, deliverySeries, isoToday, nextDays, type DeliveryDay, type DeliveryLoadLevel } from "../../../../lib/domain";
import { ordersApi } from "../../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Icon } from "../../../../components/ui/Icon";

const WINDOW_DAYS = 14;

/** The brand's own tones, light to deep: most days light rose, a busy day wine, a full day the deep oxblood. */
const BAR: Record<DeliveryLoadLevel, string> = {
  open: "bg-primary-light/80",
  filling: "bg-primary/75",
  full: "bg-primary-dark",
};

/**
 * The next two weeks of deliveries: orders due each day (shop-wide, as the
 * delivery calendar counts them), against the daily capacity line. Loaded on
 * its own, so the rest of the dashboard never waits for it.
 */
export function DeliveriesCard({ className = "" }: { className?: string }) {
  const [today] = useState(() => isoToday());
  const [data, setData] = useState<{ series: DeliveryDay[]; capacity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const last = nextDays(today, WINDOW_DAYS).at(-1)!;
    ordersApi
      .deliveryLoad(today, last)
      .then((load) => {
        if (cancelled) return;
        setData({ series: deliverySeries(load.days, today, WINDOW_DAYS, load.capacity, load.nearCapacity), capacity: load.capacity });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load deliveries");
      });
    return () => {
      cancelled = true;
    };
  }, [today, reloadKey]);

  const due = data?.series.reduce((n, d) => n + d.count, 0) ?? 0;
  const busiest = data ? busiestDay(data.series) : null;
  const subtitle = !data
    ? "Orders due each day"
    : due === 0
      ? "Nothing due in the next two weeks"
      : `${due} due · busiest ${dayLabel(busiest!.date).short} (${busiest!.count})`;

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader icon={<Icon name="calendar-clock" size={17} />} title="Deliveries · next 14 days" subtitle={subtitle} />
      <CardBody className="flex flex-1 flex-col">
        {error ? (
          <div className="flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-xs text-error">
            <span>{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
              Retry
            </button>
          </div>
        ) : !data ? (
          <div className="flex h-36 items-end gap-1.5" aria-hidden>
            {Array.from({ length: WINDOW_DAYS }, (_, i) => (
              <div key={i} className="skeleton flex-1 rounded-t-[3px]" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
            ))}
          </div>
        ) : (
          <Chart series={data.series} capacity={data.capacity} today={today} />
        )}
      </CardBody>
    </Card>
  );
}

function Chart({ series, capacity, today }: { series: DeliveryDay[]; capacity: number; today: string }) {
  const max = Math.max(capacity, ...series.map((d) => d.count), 1);
  const capacityAt = (capacity / max) * 100;
  return (
    <>
      <div aria-hidden className="relative h-36">
        {/* The daily capacity: a dashed line across the chart. */}
        <div className="absolute inset-x-0 border-t border-dashed border-gold/70" style={{ bottom: `${capacityAt}%` }}>
          <span className="absolute -top-4 right-0 text-[10px] font-semibold text-gold">Capacity {capacity}</span>
        </div>
        <div className="flex h-full items-end gap-1.5">
          {series.map((d, i) => (
            <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${dayLabel(d.date).short}: ${d.count} due`}>
              {d.count > 0 ? (
                <div
                  className={`grow-y rounded-t-[3px] ${BAR[d.level]} ${d.date === today ? "ring-2 ring-gold ring-offset-1 ring-offset-card" : ""}`}
                  style={{ height: `${(d.count / max) * 100}%`, animationDelay: `${i * 35}ms` }}
                />
              ) : (
                <div className="h-[3px] rounded-full bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-1.5">
        {series.map((d) => {
          const { weekday, day } = dayLabel(d.date);
          const isToday = d.date === today;
          return (
            <div key={d.date} className={`flex-1 text-center text-[10px] leading-tight ${isToday ? "font-semibold text-gold" : "text-text-muted"}`}>
              <div>{isToday ? "Today" : weekday.slice(0, 1)}</div>
              <div>{day}</div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
        <Legend cls={BAR.open} label="Open" />
        <Legend cls={BAR.filling} label="Filling up" />
        <Legend cls={BAR.full} label="Full" />
      </div>
      {/* The two weeks in three numbers. */}
      <dl className="mt-auto grid grid-cols-3 gap-px overflow-hidden rounded-app border border-border-light bg-border-light pt-px text-center">
        <Summary label="This week" value={series.slice(0, 7).reduce((n, d) => n + d.count, 0)} />
        <Summary label="Next week" value={series.slice(7).reduce((n, d) => n + d.count, 0)} />
        <Summary label="Full days" value={series.filter((d) => d.level === "full").length} strong />
      </dl>
      {/* The same numbers for screen readers (a table can't shrink to sr-only's 1px, so it sits in a div that can). */}
      <div className="sr-only">
      <table>
        <caption>Orders due per day, next 14 days (capacity {capacity} a day)</caption>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayLabel(d.date).short}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function Summary({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="bg-app-bg/50 px-2 py-2.5">
      <dt className="text-[10.5px] text-text-muted">{label}</dt>
      <dd className={`figure text-[17px] leading-tight ${strong && value > 0 ? "text-primary-dark" : "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-[2px] ${cls}`} />
      {label}
    </span>
  );
}
