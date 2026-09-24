"use client";

import { useEffect, useId, useState } from "react";
import {
  addMonthsIso,
  compareMonths,
  dayOfMonth,
  deliveryLoadLevel,
  isoToday,
  lastBookableDate,
  longDateLabel,
  monthBounds,
  monthLabel,
  monthWeeks,
  shiftMonth,
  yearMonthOf,
  type DeliveryLoadLevel,
  type YearMonth,
} from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Icon } from "../../../components/ui/Icon";
import { Modal } from "../../../components/ui/Modal";
import { useMediaQuery } from "../../../lib/hooks/useMediaQuery";
import { DeliveryDayList } from "./DeliveryDayList";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LEVEL_TEXT: Record<DeliveryLoadLevel, string> = {
  open: "text-info",
  filling: "text-warning",
  full: "text-error",
};

const monthKey = (ym: YearMonth) => `${ym.year}-${ym.month}`;

/**
 * The delivery calendar: how many orders are already due on each day, so a
 * due date can be chosen with the workshop's load in view. Two months side by
 * side (one on a phone), navigable from the current month to six months ahead
 * and no further. Each day shows its booked count -- blue while open, amber
 * once filling up, red with a warning sign when full. A full day CAN be picked:
 * `onSelect` says so, and the date field reopens the full-day dialog (the
 * Production Manager override). Past days and days beyond the six-month window
 * can't be picked. Counts and thresholds come from
 * GET /orders/delivery-load, fetched lazily: only the month(s) on screen, each
 * once per opening -- paging with the arrows fetches just the newly shown month.
 *
 * Mount it only while open (`{open && <DeliveryCalendar … />}`) -- its starting
 * month is derived from `value` when it mounts.
 */
export function DeliveryCalendar({
  value = "",
  onSelect,
  onClose,
  excludeOrderId,
  mode = "pick",
}: {
  value?: string;
  /** `full`: the day already has its full quota -- the caller must ask about an override. (pick mode) */
  onSelect?: (date: string, full: boolean) => void;
  onClose: () => void;
  excludeOrderId?: string;
  /**
   * `pick` (order form): choose a due date from today to 6 months ahead.
   * `browse` (owner / production manager dashboard): look back 3 months and
   * ahead 6, and click ANY day -- past or full included -- to list the orders
   * due that day, inside this same window.
   */
  mode?: "pick" | "browse";
}) {
  const browse = mode === "browse";
  const titleId = `${useId()}-title`;
  const [today] = useState(isoToday);
  const lastDate = lastBookableDate(today);
  // Browsing reaches back 3 months (overdue days); picking starts today.
  const earliest = browse ? addMonthsIso(today, -3) : today;
  const minMonth = yearMonthOf(earliest);
  /** The day whose order list is open (browse mode). */
  const [openDay, setOpenDay] = useState<string | null>(null);
  const maxMonth = yearMonthOf(lastDate);

  // Two months side by side from `sm` up, one on a phone -- paging (and how far
  // "next" can go) follows what's actually on screen.
  const wide = useMediaQuery("(min-width: 640px)", true);

  // Open on the chosen date's month when it's inside the window, else this month.
  const [anchor, setAnchor] = useState<YearMonth>(() =>
    value && value >= today && value <= lastDate ? yearMonthOf(value) : yearMonthOf(today),
  );
  // Side by side, the last page is (max - 1, max) rather than (max, max + 1).
  const first =
    wide && compareMonths(anchor, maxMonth) >= 0 && compareMonths(shiftMonth(maxMonth, -1), minMonth) >= 0
      ? shiftMonth(maxMonth, -1)
      : anchor;
  const visible = wide ? [first, shiftMonth(first, 1)] : [first];
  const lastVisible = visible[visible.length - 1]!;

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const [thresholds, setThresholds] = useState<{ capacity: number; nearCapacity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needed = visible.filter((m) => !loaded.has(monthKey(m)));
  const loading = needed.length > 0 && !error;

  useEffect(() => {
    if (needed.length === 0) return;
    let cancelled = false;
    const from = monthBounds(needed[0]!).from;
    const to = monthBounds(needed[needed.length - 1]!).to;
    ordersApi
      .deliveryLoad(from, to, excludeOrderId)
      .then((load) => {
        if (cancelled) return;
        setThresholds({ capacity: load.capacity, nearCapacity: load.nearCapacity });
        setCounts((prev) => {
          const next = { ...prev };
          for (const d of load.days) next[d.date] = d.count;
          return next;
        });
        setLoaded((prev) => new Set([...prev, ...needed.map(monthKey)]));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the delivery calendar");
      });
    return () => {
      cancelled = true;
    };
    // `needed` is derived from the visible months + `loaded`; keying on those avoids refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey(first), wide, loaded, excludeOrderId]);

  const canGoBack = compareMonths(first, minMonth) > 0;
  const canGoForward = compareMonths(lastVisible, maxMonth) < 0;

  function renderMonth(ym: YearMonth, className = "") {
    const monthLoaded = loaded.has(monthKey(ym));
    return (
      <div className={className}>
        <h3 className="mb-3 text-center font-serif text-lg font-bold text-text-primary">{monthLabel(ym)}</h3>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthWeeks(ym)
            .flat()
            .map((date, i) => {
              if (!date) return <div key={`pad-${i}`} />;
              const outside = date < earliest || date > lastDate;
              const count = counts[date] ?? 0;
              const level = thresholds ? deliveryLoadLevel(count, thresholds.capacity, thresholds.nearCapacity) : "open";
              const full = level === "full";
              const selected = date === value;
              const disabled = outside || !monthLoaded;
              const label = outside
                ? `${longDateLabel(date)}: outside the ${browse ? "calendar" : "booking"} window`
                : thresholds
                  ? `${longDateLabel(date)}: ${count} of ${thresholds.capacity} deliveries booked${full ? ", fully booked" : ""}`
                  : longDateLabel(date);
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  disabled={disabled}
                  aria-label={label}
                  aria-pressed={selected}
                  title={label}
                  onClick={() => (browse ? setOpenDay(date) : onSelect?.(date, full))}
                  className={`flex h-14 flex-col items-center justify-center rounded-app-sm transition-colors ${
                    selected
                      ? "bg-primary text-white shadow-primary"
                      : outside
                        ? "cursor-not-allowed text-text-muted/40"
                        : full
                          ? "bg-error-bg/50 text-text-primary ring-1 ring-error/25 hover:bg-error-bg"
                          : "text-text-primary hover:bg-primary-bg"
                  } ${date === today && !selected ? "ring-1 ring-gold/60" : ""}`}
                >
                  <span className="text-sm leading-none font-semibold tabular-nums">{dayOfMonth(date)}</span>
                  {!outside &&
                    (monthLoaded ? (
                      <span
                        className={`mt-1 flex items-center gap-0.5 text-[11px] leading-none font-medium tabular-nums ${
                          selected ? "text-white/85" : count === 0 ? "text-info/45" : LEVEL_TEXT[level]
                        }`}
                      >
                        {full && <Icon name="alert" size={11} strokeWidth={2.5} />}
                        {count}
                      </span>
                    ) : (
                      <span className="mt-1.5 h-1.5 w-4 animate-pulse rounded-full bg-border" />
                    ))}
                </button>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} labelledBy={titleId} panelClassName="max-h-[92vh] sm:max-w-3xl">
      <div className="flex items-start justify-between gap-4 border-b border-border-light px-5 pt-5 pb-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold text-gold">Delivery calendar</p>
          <h2 id={titleId} className="mt-1 font-serif text-xl font-bold text-text-primary">
            {browse ? "Deliveries by day" : "Choose a delivery date"}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {browse ? (
              <>
                Orders due on each day{thresholds ? ` · a day is full at ${thresholds.capacity}` : ""}. Click a day to see
                its orders.
              </>
            ) : (
              <>
                Deliveries already booked per day
                {thresholds ? ` · a day is full at ${thresholds.capacity}` : ""}. Bookable up to{" "}
                {longDateLabel(lastDate)}.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-app-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:outline-none"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {openDay ? (
          <DeliveryDayList date={openDay} onBack={() => setOpenDay(null)} />
        ) : (
          <>
        <div className="absolute top-5 right-5 left-5 flex justify-between sm:right-6 sm:left-6">
          <button
            type="button"
            onClick={() => setAnchor(shiftMonth(first, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-bg disabled:cursor-not-allowed disabled:text-text-muted/40 disabled:hover:bg-transparent"
          >
            <Icon name="chevron-right" size={18} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftMonth(first, 1))}
            disabled={!canGoForward}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-bg disabled:cursor-not-allowed disabled:text-text-muted/40 disabled:hover:bg-transparent"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </div>

        {error ? (
          <div className="py-16 text-center">
            <p className="font-serif text-lg font-bold text-text-primary">Couldn&apos;t load the calendar</p>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoaded(new Set());
              }}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2" aria-busy={loading}>
            {visible.map((m) => (
              <div key={monthKey(m)}>{renderMonth(m)}</div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border-light bg-app-bg/40 px-5 py-3 text-[11px] text-text-secondary sm:px-6">
        <Legend dot="bg-info" label={thresholds ? `Open (under ${thresholds.nearCapacity})` : "Open"} />
        <Legend
          dot="bg-warning"
          label={thresholds ? `Filling up (${thresholds.nearCapacity}–${thresholds.capacity - 1})` : "Filling up"}
        />
        <Legend
          dot="bg-error"
          label={
            thresholds
              ? browse
                ? `Full (${thresholds.capacity}+)`
                : `Full (${thresholds.capacity}+) — needs the Production Manager's OK`
              : "Full"
          }
        />
      </div>
    </Modal>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
