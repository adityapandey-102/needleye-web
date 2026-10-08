"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  busiestDay,
  dayLabel,
  daysInclusive,
  deliveryChunks,
  deliverySeries,
  deliverySummary,
  deliverySummaryWindow,
  isoToday,
  nextDays,
  rangeLabel,
  shiftDate,
  type DeliveryChunk,
  type DeliveryDay,
  type DeliveryLoadLevel,
  type DeliverySummary,
} from "../../../../lib/domain";
import { ordersApi } from "../../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Icon } from "../../../../components/ui/Icon";

/** How far ahead the chart scrolls: today and the next 59 days. */
const HORIZON_DAYS = 60;
/** One screenful of the chart -- and one fetch. */
const CHUNK_DAYS = 14;

/** The brand's own tones, light to deep: most days light rose, a busy day wine, a full day the deep oxblood. */
const BAR: Record<DeliveryLoadLevel, string> = {
  open: "bg-primary-light/80",
  filling: "bg-primary/75",
  full: "bg-primary-dark",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A chunk with no entry here is still on its way (skeleton bars). */
type ChunkState = { status: "loaded"; series: DeliveryDay[] } | { status: "error"; message: string };

/**
 * The next two months of deliveries: orders due each day (shop-wide, as the
 * delivery calendar counts them), against the daily capacity line. Two weeks
 * fill the card; the rest scrolls sideways inside it, and each two-week chunk
 * is fetched only when it scrolls into view, so opening the dashboard costs a
 * single small request. That first request covers today to the end of the
 * month (at least two weeks), which feeds both the first chunk and the summary
 * underneath. Loaded on its own, so the rest of the dashboard never waits for it.
 */
export function DeliveriesCard({ className = "" }: { className?: string }) {
  const [today] = useState(() => isoToday());
  const chunks = useMemo(() => deliveryChunks(today, HORIZON_DAYS, CHUNK_DAYS), [today]);
  const summaryWindow = useMemo(() => deliverySummaryWindow(today), [today]);
  const [chunkState, setChunkState] = useState<Record<number, ChunkState>>({});
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [capacity, setCapacity] = useState<number | null>(null);
  /** The first day on screen, in days from today -- drives the subtitle. */
  const [firstVisible, setFirstVisible] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The latest request number per chunk: an answer is used only while it's
  // still the newest for its chunk (a retry or unmount makes older ones stale).
  const tickets = useRef<number[]>([]);
  // Chunks already asked for, so scrolling back and forth never refetches.
  const requested = useRef(new Set<number>());

  const load = useCallback(
    (chunk: DeliveryChunk) => {
      const ticket = (tickets.current[chunk.index] ?? 0) + 1;
      tickets.current[chunk.index] = ticket;
      requested.current.add(chunk.index);
      // The first chunk rides on the summary's window (it always contains the first two weeks): one request for both.
      const to = chunk.index === 0 ? summaryWindow.to : chunk.to;
      ordersApi
        .deliveryLoad(chunk.from, to)
        .then((load) => {
          if (tickets.current[chunk.index] !== ticket) return;
          const series = deliverySeries(load.days, chunk.from, chunk.length, load.capacity, load.nearCapacity);
          setCapacity(load.capacity);
          setChunkState((prev) => ({ ...prev, [chunk.index]: { status: "loaded", series } }));
          if (chunk.index === 0) {
            const span = daysInclusive(summaryWindow.from, summaryWindow.to);
            setSummary(deliverySummary(deliverySeries(load.days, summaryWindow.from, span, load.capacity, load.nearCapacity), today));
          }
        })
        .catch((err: unknown) => {
          if (tickets.current[chunk.index] !== ticket) return;
          const message = err instanceof Error ? err.message : "Failed to load deliveries";
          setChunkState((prev) => ({ ...prev, [chunk.index]: { status: "error", message } }));
        });
    },
    [summaryWindow, today],
  );

  function retry(chunk: DeliveryChunk) {
    setChunkState((prev) => {
      const next = { ...prev };
      delete next[chunk.index];
      return next;
    });
    load(chunk);
  }

  useEffect(() => {
    const root = scrollerRef.current;
    const pending = tickets.current;
    const asked = requested.current;
    // The first two weeks are on screen from the start.
    load(chunks[0]!);
    let observer: IntersectionObserver | null = null;
    if (root && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.chunk);
            if (entry.isIntersecting && !asked.has(index)) load(chunks[index]!);
          }
        },
        // Shrunk by 2px each side so the chunk that merely touches the edge
        // (the next one, at rest) doesn't count as on screen until it scrolls in.
        { root, rootMargin: "0px -2px 0px -2px" },
      );
      root.querySelectorAll("[data-chunk]").forEach((el) => observer!.observe(el));
    }
    return () => {
      observer?.disconnect();
      // Unmounting (or React's dev double-run): every answer still on its way is stale.
      for (const c of chunks) pending[c.index] = (pending[c.index] ?? 0) + 1;
      asked.clear();
    };
  }, [chunks, load]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const dayWidth = el.clientWidth / CHUNK_DAYS;
    setFirstVisible(Math.min(HORIZON_DAYS - CHUNK_DAYS, Math.max(0, Math.round(el.scrollLeft / dayWidth))));
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }

  /** The arrow buttons page by one screenful (two weeks); the snap points line them up. */
  function page(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollBy({ left: direction * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  const loadedDays = chunks.flatMap((c) => {
    const state = chunkState[c.index];
    return state?.status === "loaded" ? state.series : [];
  });
  const max = Math.max(capacity ?? 0, ...loadedDays.map((d) => d.count), 1);

  // The subtitle describes the two weeks on screen, once they're all loaded.
  const visibleFrom = shiftDate(today, firstVisible);
  const visibleTo = shiftDate(today, firstVisible + CHUNK_DAYS - 1);
  const visible = loadedDays.filter((d) => d.date >= visibleFrom && d.date <= visibleTo);
  const visibleDue = visible.reduce((n, d) => n + d.count, 0);
  const busiest = busiestDay(visible);
  const range = rangeLabel(visibleFrom, visibleTo);
  const subtitle =
    visible.length < CHUNK_DAYS
      ? `Showing ${range}`
      : visibleDue === 0
        ? `${range} · nothing due`
        : `${range} · ${visibleDue} due · busiest ${dayLabel(busiest!.date).short} (${busiest!.count})`;

  const [, endMonth, endDay] = summaryWindow.to.split("-").map(Number);
  const chunkZero = chunkState[0];

  return (
    <Card className={`flex min-w-0 flex-col ${className}`}>
      <CardHeader
        icon={<Icon name="calendar-clock" size={17} />}
        title="Deliveries · next 2 months"
        subtitle={subtitle}
      />
      <CardBody className="flex flex-1 flex-col">
        {/* contain-inline-size: two months of bars must never widen the card (or the page) -- they scroll inside it. */}
        <div className="relative contain-inline-size">
          {capacity !== null && (
            // The daily capacity: a dashed line across the chart. It stays put while the days scroll under it.
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36">
              <div className="absolute inset-x-0 border-t border-dashed border-gold/70" style={{ bottom: `${(capacity / max) * 100}%` }}>
                <span className="absolute -top-4 right-0 rounded-sm bg-card/85 px-1 text-[10px] font-semibold text-gold">Capacity {capacity}</span>
              </div>
            </div>
          )}
          <div
            ref={scrollerRef}
            tabIndex={0}
            role="region"
            aria-label="Orders due per day for the next two months -- scroll sideways for later weeks"
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-app-sm pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            {chunks.map((c) => (
              <ChunkColumn key={c.index} chunk={c} state={chunkState[c.index]} max={max} today={today} onRetry={() => retry(c)} />
            ))}
          </div>
        </div>
        <div className="mt-2 mb-3 flex items-center gap-3">
          <div aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
            <Legend cls={BAR.open} label="Open" />
            <Legend cls={BAR.filling} label="Filling up" />
            <Legend cls={BAR.full} label="Full" />
          </div>
          {/* Paging arrows: a mouse can't easily scroll sideways, and on a phone they show there's more to swipe to. */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <PageButton label="Earlier two weeks" disabled={atStart} onClick={() => page(-1)} flip />
            <PageButton label="Later two weeks" disabled={atEnd} onClick={() => page(1)} />
          </div>
        </div>
        {/* The weeks ahead in four numbers, from the first request alone. */}
        <dl className="mt-auto grid grid-cols-4 gap-px overflow-hidden rounded-app border border-border-light bg-border-light pt-px text-center">
          <Summary label="This month" value={summary?.thisMonth} failed={chunkZero?.status === "error"} />
          <Summary label="This week" value={summary?.thisWeek} failed={chunkZero?.status === "error"} />
          <Summary label="Next week" value={summary?.nextWeek} failed={chunkZero?.status === "error"} />
          <Summary
            label="Full days"
            hint={`to ${endDay} ${MONTHS[endMonth! - 1]}`}
            value={summary?.fullDays}
            failed={chunkZero?.status === "error"}
            strong
          />
        </dl>
        {/* The same numbers for screen readers (a table can't shrink to sr-only's 1px, so it sits in a div that can). */}
        {capacity !== null && (
          <div className="sr-only">
            <table>
              <caption>
                Orders due per day, as far as loaded (scroll the chart for later weeks); capacity {capacity} a day
              </caption>
              <tbody>
                {loadedDays.map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{dayLabel(d.date).short}</th>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * One two-week slice. Its width is a share of the scroller's (a full chunk is
 * exactly one screen), and the trailing pr-1.5 stands in for the gap between
 * chunks, so every day column is the same width across the whole strip.
 */
function ChunkColumn({
  chunk,
  state,
  max,
  today,
  onRetry,
}: {
  chunk: DeliveryChunk;
  state: ChunkState | undefined;
  max: number;
  today: string;
  onRetry: () => void;
}) {
  const series = state?.status === "loaded" ? state.series : null;
  const dates = series ? series.map((d) => d.date) : nextDays(chunk.from, chunk.length);
  return (
    <div data-chunk={chunk.index} className="relative shrink-0 snap-start pr-1.5"
      style={{ width: `${(chunk.length / CHUNK_DAYS) * 100}%` }}
    >
      <div aria-hidden className="flex h-36 items-end gap-1.5">
        {series
          ? series.map((d, i) => (
              <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dayLabel(d.date).short}: ${d.count} due`}>
                {d.count > 0 ? (
                  <div
                    className={`grow-y rounded-t-[3px] ${BAR[d.level]} ${d.date === today ? "ring-2 ring-gold ring-offset-1 ring-offset-card" : ""}`}
                    style={{ height: `${(d.count / max) * 100}%`, animationDelay: `${i * 35}ms` }}
                  />
                ) : (
                  <div className="h-0.75 rounded-full bg-border" />
                )}
              </div>
            ))
          : dates.map((date, i) => (
              <div
                key={date}
                className={`min-w-0 flex-1 rounded-t-[3px] ${state ? "bg-border-light" : "skeleton"}`}
                style={{ height: `${25 + (((chunk.offset + i) * 37) % 60)}%` }}
              />
            ))}
      </div>
      <div aria-hidden className="mt-2 flex gap-1.5">
        {dates.map((date) => {
          const { weekday, day } = dayLabel(date);
          const isToday = date === today;
          // The 1st of a month names the month, so the strip reads as a calendar.
          const top = isToday ? "Today" : day === 1 ? MONTHS[Number(date.slice(5, 7)) - 1] : weekday.slice(0, 1);
          return (
            <div
              key={date}
              // No min-w-0 here: "Today" may widen its own column a touch rather than run into tomorrow's label.
              className={`flex-1 text-center text-[10px] leading-tight whitespace-nowrap ${
                isToday ? "font-semibold text-gold" : day === 1 ? "font-semibold text-text-secondary" : "text-text-muted"
              }`}
            >
              <div>{top}</div>
              <div>{day}</div>
            </div>
          );
        })}
      </div>
      {state?.status === "error" && (
        <div className="absolute inset-x-0 top-0 z-20 flex h-36 items-center justify-center pr-1.5">
          <div
            className="flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-app-sm border border-error/30 bg-card px-2.5 py-1.5 text-center text-xs text-error shadow-app"
            title={state.message}
            role="alert"
          >
            <span>Couldn&apos;t load</span>
            <button type="button" onClick={onRetry} className="font-medium underline">
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageButton({ label, disabled, onClick, flip = false }: { label: string; disabled: boolean; onClick: () => void; flip?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-app-sm border border-border-light text-text-secondary transition-colors hover:bg-primary-bg/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon name="chevron-right" size={14} className={flip ? "rotate-180" : ""} />
    </button>
  );
}

function Summary({
  label,
  value,
  hint,
  failed,
  strong = false,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  failed: boolean;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 bg-app-bg/50 px-1.5 py-2.5">
      <dt className="truncate text-[10.5px] text-text-muted">{label}</dt>
      <dd className={`figure text-[17px] leading-tight ${strong && value ? "text-primary-dark" : "text-text-primary"}`}>
        {value !== undefined ? value : failed ? "–" : <span className="skeleton mx-auto mt-0.5 block h-4 w-6 rounded" />}
      </dd>
      {hint && <dd className="truncate text-[10px] text-text-muted">{hint}</dd>}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-xs ${cls}`} />
      {label}
    </span>
  );
}
