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
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Icon, type IconName } from "../../../components/ui/Icon";

const PAGE_SIZE = 50;

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
  payment: { icon: "wallet", className: "bg-success-bg text-success" },
  lead: { icon: "inbox", className: "bg-gold-bg text-gold" },
  account: { icon: "user", className: "bg-app-bg text-text-secondary" },
  session: { icon: "key", className: "bg-app-bg text-text-muted" },
  warning: { icon: "alert", className: "bg-warning-bg text-warning-text" },
};

/** 'Today' / 'Yesterday' / 'Tuesday', plus '22 Sep 2026' -- the day is a plain YYYY-MM-DD, formatted in UTC so it can't shift. */
function dayHeading(day: string, index: number): { title: string; date: string } {
  const d = new Date(`${day}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" }).format(d);
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  return {
    title: index === 0 ? "Today" : index === 1 ? "Yesterday" : weekday,
    date: index < 2 ? `${weekday}, ${date}` : date,
  };
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
 * is loaded up front: a day's first tab is fetched when the day is opened,
 * every other tab when it's chosen, 50 events at a time, and the tab counts
 * come with the first page.
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

  return (
    <Card>
      <CardHeader
        icon={<Icon name="history" size={18} />}
        iconTone="blue"
        title="Daily activity"
        subtitle="The last 7 days · open a day, then pick a tab · each tab loads on its own"
      />
      <CardBody className="flex flex-col gap-2">
        {daysError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">{daysError}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setDaysError(null);
                setDaysReload((k) => k + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : !days ? (
          Array.from({ length: 7 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-app-sm bg-app-bg" />)
        ) : (
          days.days.map((day, i) => {
            const isOpen = open.has(day);
            const dayState = byDay[day];
            const category = dayState?.category ?? "orders";
            const state = dayState?.byCategory[category];
            const panelId = `activity-${day}`;
            return (
              <div key={day} className="overflow-hidden rounded-app-sm border border-border-light">
                <button
                  type="button"
                  onClick={() => toggle(day)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-app-bg/60"
                >
                  <Icon
                    name="chevron-right"
                    size={16}
                    className={`shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                  <span className="font-semibold text-text-primary">{dayHeading(day, i).title}</span>
                  <span className="text-sm text-text-muted">{dayHeading(day, i).date}</span>
                  {dayState?.counts && (
                    <span className="ml-auto text-xs text-text-muted tabular-nums">
                      {sumCounts(dayState.counts)} {sumCounts(dayState.counts) === 1 ? "action" : "actions"}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div id={panelId} className="border-t border-border-light bg-app-bg/30 px-4 py-3">
                    <div role="tablist" aria-label="Activity categories" className="mb-2 flex gap-1 overflow-x-auto pb-1">
                      {ACTIVITY_CATEGORIES.map((c) => {
                        const active = c.value === category;
                        const count = dayState?.counts?.[c.value];
                        return (
                          <button
                            key={c.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => chooseTab(day, c.value)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                              active ? "bg-primary text-white" : "bg-card text-text-secondary ring-1 ring-border-light hover:bg-primary-bg"
                            }`}
                          >
                            {c.label}
                            {count !== undefined && (
                              <span className={`rounded-full px-1.5 tabular-nums ${active ? "bg-white/20" : "bg-app-bg text-text-muted"}`}>{count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {state?.error ? (
                      <p className="text-sm text-error">
                        {state.error}{" "}
                        <button type="button" onClick={() => void load(day, category, 0)} className="font-semibold text-primary hover:underline">
                          Retry
                        </button>
                      </p>
                    ) : state && state.events.length === 0 && !state.loading ? (
                      <p className="py-2 text-sm text-text-muted">Nothing in this tab on this day.</p>
                    ) : (
                      <ol role="tabpanel" className="flex flex-col">
                        {state?.events.map((e) => (
                          <ActivityRow key={e.id} event={e} time={timeFormat.format(new Date(e.at))} />
                        ))}
                      </ol>
                    )}

                    {state?.loading && (
                      <p className="flex items-center gap-2 py-2 text-sm text-text-muted">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
                        Loading…
                      </p>
                    )}
                    {state && !state.loading && !state.error && state.events.length < state.total && (
                      <Button variant="outline" className="mt-2" onClick={() => void load(day, category, state.events.length)}>
                        Show more ({state.total - state.events.length} left)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
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
    <li className="flex items-start gap-3 py-2">
      <span className="w-16 shrink-0 pt-1 text-xs text-text-muted tabular-nums">{time}</span>
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.className}`} aria-hidden>
        <Icon name={tone.icon} size={13} strokeWidth={2} />
      </span>
      <span className="min-w-0 text-sm leading-6">
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
