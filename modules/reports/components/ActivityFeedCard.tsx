"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  describeActivity,
  ROLE_LABELS,
  ROLES,
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

interface DayState {
  events: ActivityEvent[];
  total: number;
  loading: boolean;
  error: string | null;
}

const TONE: Record<ActivitySentence["tone"], { icon: IconName; className: string }> = {
  order: { icon: "clipboard", className: "bg-primary-bg text-primary" },
  stage: { icon: "chevron-right", className: "bg-info-bg text-info" },
  account: { icon: "user", className: "bg-gold-bg text-gold" },
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

/**
 * What everyone did on each of the last 7 days, from the audit trail
 * (payments are left out: they're on Revenue & Ledger). Nothing is loaded up
 * front: a day's events are fetched the first time it's opened, 50 at a time.
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

  async function load(day: string, offset: number) {
    setByDay((prev) => ({
      ...prev,
      [day]: { events: prev[day]?.events ?? [], total: prev[day]?.total ?? 0, loading: true, error: null },
    }));
    try {
      const page = await reportsApi.activity(day, offset, PAGE_SIZE);
      setByDay((prev) => ({
        ...prev,
        [day]: {
          events: offset === 0 ? page.events : [...(prev[day]?.events ?? []), ...page.events],
          total: page.total,
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      setByDay((prev) => ({
        ...prev,
        [day]: {
          events: prev[day]?.events ?? [],
          total: prev[day]?.total ?? 0,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load this day",
        },
      }));
    }
  }

  function toggle(day: string) {
    const next = new Set(open);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
      if (!byDay[day]) void load(day, 0); // first open only -- reopening reuses what's loaded
    }
    setOpen(next);
  }

  function refreshDay(day: string) {
    void load(day, 0);
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
        subtitle="The last 7 days, from the audit trail · open a day to load it · payments are on Revenue & Ledger"
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
            const state = byDay[day];
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
                  <span className="font-semibold text-text-primary">
                    {dayHeading(day, i).title}
                  </span>
                  <span className="text-sm text-text-muted">{dayHeading(day, i).date}</span>
                  {state && !state.loading && !state.error && (
                    <span className="ml-auto text-xs text-text-muted tabular-nums">
                      {state.total} {state.total === 1 ? "action" : "actions"}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div id={panelId} className="border-t border-border-light bg-app-bg/30 px-4 py-3">
                    {state?.error ? (
                      <p className="text-sm text-error">
                        {state.error}{" "}
                        <button type="button" onClick={() => refreshDay(day)} className="font-semibold text-primary hover:underline">
                          Retry
                        </button>
                      </p>
                    ) : state && state.events.length === 0 && !state.loading ? (
                      <p className="py-2 text-sm text-text-muted">No activity recorded on this day.</p>
                    ) : (
                      <ol className="flex flex-col">
                        {state?.events.map((e) => {
                          const sentence = describeActivity(e);
                          const tone = TONE[sentence.tone];
                          const role = roleLabel(e.actorRole);
                          return (
                            <li key={e.id} className="flex items-start gap-3 py-2">
                              <span className="w-16 shrink-0 pt-1 text-xs text-text-muted tabular-nums">
                                {timeFormat.format(new Date(e.at))}
                              </span>
                              <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.className}`}
                                aria-hidden
                              >
                                <Icon name={tone.icon} size={13} strokeWidth={2} />
                              </span>
                              <span className="min-w-0 text-sm leading-6">
                                <span className="font-semibold text-text-primary">{e.actorName ?? "Someone"}</span>
                                {role && <span className="text-text-muted"> · {role}</span>}
                                <span className="text-text-secondary"> — </span>
                                {sentence.orderId ? (
                                  <Link href={`/orders/${sentence.orderId}`} className="text-text-secondary hover:text-primary hover:underline">
                                    {sentence.text}
                                  </Link>
                                ) : (
                                  <span className="text-text-secondary">{sentence.text}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    {state?.loading && (
                      <p className="flex items-center gap-2 py-2 text-sm text-text-muted">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
                        Loading…
                      </p>
                    )}
                    {state && !state.loading && !state.error && state.events.length < state.total && (
                      <Button variant="outline" className="mt-2" onClick={() => void load(day, state.events.length)}>
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
