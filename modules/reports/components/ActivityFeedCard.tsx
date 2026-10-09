"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACTIVITY_CATEGORIES,
  describeActivity,
  ROLE_LABELS,
  ROLES,
  type ActivityCategory,
  type ActivityDays,
  type ActivityEvent,
  type ActivitySentence,
  type Role,
} from "../../../lib/domain";
import { reportsApi } from "../api/reportsApi";
import { Button } from "../../../components/ui/Button";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { FigureBoard, LoadError, SectionIntro, SkeletonBoard, SkeletonRows, Spinner } from "./ReportParts";

const PAGE_SIZE = 50;
const BOARD_COLUMNS = "grid-cols-2 lg:grid-cols-3 [&>:first-child]:col-span-2 lg:[&>:first-child]:col-span-1";

interface CategoryState {
  events: ActivityEvent[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface DayState {
  /** The open tab. */
  category: ActivityCategory;
  /** Events per category that day -- arrives with the first page of any tab. */
  counts: Record<ActivityCategory, number> | null;
  byCategory: Partial<Record<ActivityCategory, CategoryState>>;
}

const TONE: Record<ActivitySentence["tone"], { icon: IconName; className: string }> = {
  order: { icon: "clipboard", className: "bg-primary-bg text-primary" },
  stage: { icon: "chevron-right", className: "bg-info-bg text-info" },
  payment: { icon: "wallet", className: "bg-success text-white" },
  lead: { icon: "inbox", className: "bg-gold-bg text-gold" },
  account: { icon: "user", className: "bg-app-bg text-text-secondary" },
  session: { icon: "key", className: "bg-app-bg text-text-muted" },
  warning: { icon: "alert", className: "bg-warning-bg text-warning-text" },
};

const CATEGORY_ICON: Record<ActivityCategory, IconName> = {
  orders: "clipboard",
  stages: "layers",
  payments: "wallet",
  leads: "inbox",
  accounts: "key",
};

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" });

/** 'Today' / 'Yesterday' / 'Tuesday', plus '22 Sep 2026' -- the day is a plain YYYY-MM-DD, formatted in UTC so it can't shift. */
function dayHeading(day: string, index: number): { title: string; date: string } {
  const d = utc(day);
  const weekday = fmt({ weekday: "long" }).format(d);
  const date = fmt({ day: "numeric", month: "short", year: "numeric" }).format(d);
  return {
    title: index === 0 ? "Today" : index === 1 ? "Yesterday" : weekday,
    date: index < 2 ? `${weekday}, ${date}` : date,
  };
}

/** "3 – 9 Oct" (or "28 Sep – 4 Oct") for the 7 days covered, newest last. */
function periodLabel(days: string[]): string {
  if (days.length === 0) return "—";
  const newest = utc(days[0]!);
  const oldest = utc(days[days.length - 1]!);
  const sameMonth = newest.getUTCMonth() === oldest.getUTCMonth();
  const from = sameMonth ? fmt({ day: "numeric" }).format(oldest) : fmt({ day: "numeric", month: "short" }).format(oldest);
  return `${from} – ${fmt({ day: "numeric", month: "short" }).format(newest)}`;
}

function roleLabel(role: string | null): string | null {
  return role && (ROLES as readonly string[]).includes(role) ? ROLE_LABELS[role as Role] : null;
}

function sumCounts(counts: Record<ActivityCategory, number>): number {
  return ACTIVITY_CATEGORIES.reduce((sum, c) => sum + (counts[c.value] ?? 0), 0);
}

/**
 * What everyone did on each of the last 7 days, read from the separate logs
 * (needleye-api ADR 0008) in five tabs -- Orders (incl. pricing), Stages,
 * Payments, Leads, Sign-ins & accounts -- so a busy day reads by kind. Nothing
 * is loaded up front except the list of days: a day's first tab is fetched
 * when the day is opened, every other tab when it's chosen, 50 events at a
 * time, and the tab counts come with the first page. The figures at the top
 * only add up what has been opened -- they never trigger a fetch of their own.
 */
export function ActivityFeedCard() {
  const [days, setDays] = useState<ActivityDays | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [daysReload, setDaysReload] = useState(0);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [byDay, setByDay] = useState<Record<string, DayState>>({});

  useEffect(() => {
    let cancelled = false;
    reportsApi
      .activityDays()
      .then((res) => {
        if (!cancelled) setDays(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDaysError(err instanceof Error ? err.message : "Failed to load the activity days");
      });
    return () => {
      cancelled = true;
    };
  }, [daysReload]);

  function patchCategory(day: string, category: ActivityCategory, patch: (prev: CategoryState | undefined) => CategoryState) {
    setByDay((prev) => {
      const dayState = prev[day] ?? { category, counts: null, byCategory: {} };
      return { ...prev, [day]: { ...dayState, byCategory: { ...dayState.byCategory, [category]: patch(dayState.byCategory[category]) } } };
    });
  }

  async function load(day: string, category: ActivityCategory, offset: number) {
    patchCategory(day, category, (prev) => ({ events: prev?.events ?? [], total: prev?.total ?? 0, loading: true, error: null }));
    try {
      const page = await reportsApi.activity(day, category, offset, PAGE_SIZE);
      setByDay((prev) => {
        const dayState = prev[day] ?? { category, counts: null, byCategory: {} };
        const before = dayState.byCategory[category];
        return {
          ...prev,
          [day]: {
            ...dayState,
            counts: page.counts,
            byCategory: {
              ...dayState.byCategory,
              [category]: {
                events: offset === 0 ? page.events : [...(before?.events ?? []), ...page.events],
                total: page.total,
                loading: false,
                error: null,
              },
            },
          },
        };
      });
    } catch (err) {
      patchCategory(day, category, (prev) => ({
        events: prev?.events ?? [],
        total: prev?.total ?? 0,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load this day",
      }));
    }
  }

  function toggle(day: string) {
    const next = new Set(open);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
      if (!byDay[day]) void load(day, "orders", 0); // first open only -- reopening reuses what's loaded
    }
    setOpen(next);
  }

  function chooseTab(day: string, category: ActivityCategory) {
    setByDay((prev) => ({ ...prev, [day]: { ...(prev[day] ?? { counts: null, byCategory: {} }), category } }));
    if (!byDay[day]?.byCategory[category]) void load(day, category, 0);
  }

  const timeFormat = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: days?.timeZone,
  });

  // What the opened days add up to so far (counts arrive with each day's first page).
  const counted = Object.values(byDay).filter((d) => d.counts);
  const countedTotal = counted.reduce((sum, d) => sum + sumCounts(d.counts!), 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionIntro
        id="daily-activity-heading"
        title="Daily activity"
        description="What everyone did on each of the last 7 days: orders created, stages moved, payments, leads and sign-ins."
      />

      {daysError ? (
        <LoadError
          title="Couldn't load the activity days"
          message={daysError}
          onRetry={() => {
            setDaysError(null);
            setDaysReload((k) => k + 1);
          }}
        />
      ) : !days ? (
        <>
          <SkeletonBoard cells={3} columns={BOARD_COLUMNS} />
          <SkeletonRows rows={7} className="h-16" />
        </>
      ) : (
        <>
          <FigureBoard
            label="The week at a glance"
            columns={BOARD_COLUMNS}
            figures={[
              { key: "period", icon: "calendar", label: "Period", value: periodLabel(days.days), caption: `${days.days.length} days · times in ${days.timeZone}` },
              { key: "opened", icon: "eye", label: "Days opened", value: `${counted.length} of ${days.days.length}`, caption: "Loaded when opened" },
              {
                key: "actions",
                icon: "history",
                label: "Actions counted",
                value: counted.length ? countedTotal : "—",
                caption: counted.length ? "In the days opened" : "Open a day to count",
              },
            ]}
          />

          <ol className="flex flex-col gap-2.5" aria-label="The last 7 days">
            {days.days.map((day, i) => {
              const isOpen = open.has(day);
              const dayState = byDay[day];
              const category = dayState?.category ?? "orders";
              const state = dayState?.byCategory[category];
              const panelId = `activity-${day}`;
              const heading = dayHeading(day, i);
              const total = dayState?.counts ? sumCounts(dayState.counts) : null;
              const d = utc(day);
              return (
                <li
                  key={day}
                  className={`overflow-hidden rounded-app-lg border bg-card shadow-app transition-colors ${isOpen ? "border-primary/25" : "border-border"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(day)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary-bg/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset sm:gap-4 sm:px-4"
                  >
                    <span
                      aria-hidden
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-app border leading-none ${
                        i === 0 ? "border-primary/30 bg-primary text-white" : "border-border-light bg-app-bg text-text-primary"
                      }`}
                    >
                      <span className="figure text-lg">{fmt({ day: "numeric" }).format(d)}</span>
                      <span className={`mt-0.5 text-[10px] font-semibold uppercase ${i === 0 ? "text-white/80" : "text-text-muted"}`}>
                        {fmt({ month: "short" }).format(d)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-text-primary">{heading.title}</span>
                      <span className="block truncate text-xs text-text-muted">{heading.date}</span>
                    </span>
                    {total !== null ? (
                      <span className="shrink-0 rounded-full bg-app-bg px-2.5 py-1 text-xs font-semibold text-text-secondary tabular-nums">
                        {total} {total === 1 ? "action" : "actions"}
                      </span>
                    ) : (
                      !isOpen && <span className="hidden shrink-0 text-xs text-text-muted sm:inline">Open to load</span>
                    )}
                    <Icon
                      name="chevron-right"
                      size={18}
                      className={`shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-90 text-primary" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div id={panelId} className="border-t border-border-light">
                      {/* The day's counts per category, which are also its tabs. */}
                      <div
                        role="tablist"
                        aria-label={`${heading.title}: activity by kind`}
                        className="flex gap-2 overflow-x-auto bg-app-bg/40 p-3 md:grid md:grid-cols-5 md:overflow-visible"
                      >
                        {ACTIVITY_CATEGORIES.map((c) => {
                          const active = c.value === category;
                          const count = dayState?.counts?.[c.value];
                          return (
                            <button
                              key={c.value}
                              type="button"
                              role="tab"
                              id={`${panelId}-${c.value}`}
                              aria-selected={active}
                              aria-controls={`${panelId}-panel`}
                              onClick={() => chooseTab(day, c.value)}
                              className={`flex min-w-34 shrink-0 flex-col items-start rounded-app border px-3 py-2 text-left transition-colors md:min-w-0 ${
                                active
                                  ? "border-primary/40 bg-card text-primary shadow-[inset_0_-2px_0_var(--color-primary)]"
                                  : "border-border-light bg-card/70 text-text-secondary hover:border-primary/25 hover:bg-card"
                              }`}
                            >
                              <span className="flex w-full items-center gap-1.5 text-xs font-semibold">
                                <span className="truncate">{c.label}</span>
                              </span>
                              <span className="mt-1 flex items-center gap-1.5">
                                <Icon name={CATEGORY_ICON[c.value]} size={14} className={active ? "text-primary" : "text-text-muted"} />
                                <span className={`figure text-xl leading-none ${active ? "text-primary" : "text-text-primary"}`}>
                                  {count ?? <span className="text-text-muted">·</span>}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div role="tabpanel" id={`${panelId}-panel`} aria-labelledby={`${panelId}-${category}`} className="px-3 py-2 sm:px-4">
                        {state?.error ? (
                          <p role="alert" className="flex flex-wrap items-center gap-2 py-3 text-sm text-error">
                            {state.error}
                            <button type="button" onClick={() => void load(day, category, 0)} className="font-semibold text-primary hover:underline">
                              Retry
                            </button>
                          </p>
                        ) : state && state.events.length === 0 && !state.loading ? (
                          <p className="py-6 text-center text-sm text-text-muted">Nothing in this tab on this day.</p>
                        ) : (
                          <ol className="divide-y divide-border-light">
                            {state?.events.map((e) => (
                              <ActivityRow key={e.id} event={e} time={timeFormat.format(new Date(e.at))} />
                            ))}
                          </ol>
                        )}

                        {state?.loading && (
                          <p className="flex items-center gap-2 py-3 text-sm text-text-muted">
                            <Spinner /> Loading…
                          </p>
                        )}
                        {state && !state.loading && !state.error && state.events.length < state.total && (
                          <div className="border-t border-border-light py-3">
                            <Button variant="outline" className="w-full sm:w-auto" onClick={() => void load(day, category, state.events.length)}>
                              Show more ({state.total - state.events.length} left)
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

function ActivityRow({ event, time }: { event: ActivityEvent; time: string }) {
  const sentence = describeActivity(event);
  const tone = TONE[sentence.tone];
  const role = roleLabel(event.actorRole);
  // A lead's events link to the lead; everything else about an order, to the order.
  const href = sentence.leadId ? `/leads/${sentence.leadId}` : sentence.orderId ? `/orders/${sentence.orderId}` : null;
  // The public form has no signed-in person.
  const actor = event.actorName ?? (event.category === "leads" ? "Public enquiry form" : "Someone");
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="w-14 shrink-0 pt-1 text-right text-xs text-text-muted tabular-nums sm:w-16">{time}</span>
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.className}`} aria-hidden>
        <Icon name={tone.icon} size={13} strokeWidth={2} />
      </span>
      <span className="min-w-0 text-sm leading-6 wrap-break-word">
        <span className="font-semibold text-text-primary">{actor}</span>
        {role && <span className="text-text-muted"> · {role}</span>}
        <span className="text-text-secondary"> — </span>
        {href ? (
          <Link href={href} className="text-text-secondary hover:text-primary hover:underline">
            {sentence.text}
          </Link>
        ) : (
          <span className="text-text-secondary">{sentence.text}</span>
        )}
        {sentence.detail && <span className="block text-xs leading-5 text-text-muted">{sentence.detail}</span>}
      </span>
    </li>
  );
}
