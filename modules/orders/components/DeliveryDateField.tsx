"use client";

import { useEffect, useId, useRef, useState } from "react";
import { deliveryLoadLevel, longDateLabel, type DeliveryLoadLevel } from "../../../lib/domain";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { ordersApi } from "../api/ordersApi";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Field";
import { Icon } from "../../../components/ui/Icon";
import { Modal } from "../../../components/ui/Modal";
import { DeliveryCalendar } from "./DeliveryCalendar";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "known"; date: string; booked: number; capacity: number; level: DeliveryLoadLevel }
  | { state: "error" };

/**
 * The Delivery Due Date input, with the workshop's delivery capacity in view.
 *
 * Picking a date (typed, or from the calendar) checks how many orders are
 * already due that day: "Checking delivery availability…", then green when
 * there's room, amber when the day is filling up. A FULL day opens the
 * full-day dialog: check the calendar for another date, proceed because the
 * Production Manager already agreed to take it (the override the API records
 * in the audit log), or cancel (the date is cleared). The check is advisory --
 * the API re-checks under a per-day lock when the order is saved, and a
 * 409 DELIVERY_DAY_FULL there reopens the same dialog (`promptOpen`).
 *
 * Editing: an unchanged date (`originalValue`) isn't re-checked -- the order
 * already holds its slot -- and `excludeOrderId` keeps it out of the counts.
 */
export function DeliveryDateField({
  value,
  onChange,
  confirmed,
  onConfirmedChange,
  promptOpen,
  onPromptOpenChange,
  disabled,
  originalValue,
  excludeOrderId,
}: {
  value: string;
  onChange: (date: string) => void;
  /** The Production Manager has agreed to take this full day. */
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  /** The full-day dialog -- controlled, so the form can reopen it on a 409. */
  promptOpen: boolean;
  onPromptOpenChange: (open: boolean) => void;
  disabled?: boolean;
  originalValue?: string;
  excludeOrderId?: string;
}) {
  const promptTitleId = `${useId()}-full-title`;
  const [calendarOpen, setCalendarOpen] = useState(false);
  // The latest check's outcome, keyed by the date it was for; what's shown is
  // derived from it, so a stale answer for an older date is never displayed.
  const [result, setResult] = useState<{ date: string; availability: Availability } | null>(null);
  const debounced = useDebouncedValue(value, 300);
  const unchanged = originalValue !== undefined && value === originalValue;
  // The date the full-day dialog was last auto-opened for -- so re-renders
  // (or a cancelled calendar) don't pop it again for the same date.
  const promptedFor = useRef<string | null>(null);

  const availability: Availability =
    !value || unchanged || disabled
      ? { state: "idle" }
      : result?.date === value
        ? result.availability
        : { state: "checking" };

  useEffect(() => {
    if (!debounced || debounced !== value || unchanged || disabled) return;
    let cancelled = false;
    ordersApi
      .deliveryLoad(debounced, debounced, excludeOrderId)
      .then((load) => {
        if (cancelled) return;
        const booked = load.days.find((d) => d.date === debounced)?.count ?? 0;
        const level = deliveryLoadLevel(booked, load.capacity, load.nearCapacity);
        setResult({
          date: debounced,
          availability: { state: "known", date: debounced, booked, capacity: load.capacity, level },
        });
        if (level === "full" && !confirmed && promptedFor.current !== debounced) {
          promptedFor.current = debounced;
          onPromptOpenChange(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ date: debounced, availability: { state: "error" } });
      });
    return () => {
      cancelled = true;
    };
    // `confirmed` / `onPromptOpenChange` are read at resolve time only; a change
    // to them must not re-run the check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, value, unchanged, disabled, excludeOrderId]);

  function pick(date: string) {
    if (date !== value) {
      promptedFor.current = null;
      onConfirmedChange(false);
    }
    onChange(date);
  }

  function checkCalendar() {
    onPromptOpenChange(false);
    setCalendarOpen(true);
  }

  function proceedWithPm() {
    onConfirmedChange(true);
    onPromptOpenChange(false);
  }

  function cancelFullDay() {
    onPromptOpenChange(false);
    onConfirmedChange(false);
    promptedFor.current = null;
    onChange(originalValue ?? "");
  }

  const full = availability.state === "known" && availability.level === "full";

  return (
    <>
      <div className="flex gap-2">
        <Input
          type="date"
          aria-label="Delivery due date"
          disabled={disabled}
          value={value}
          onChange={(e) => pick(e.target.value)}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCalendarOpen(true)}
          aria-label="Open the delivery calendar"
          title="Delivery calendar"
          className="flex shrink-0 items-center gap-1.5 rounded-app-sm border border-border bg-card px-3 text-sm font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary-bg focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card"
        >
          <Icon name="calendar" size={17} />
          <span className="hidden sm:inline">Calendar</span>
        </button>
      </div>

      <div aria-live="polite" className="mt-1.5 min-h-5 text-xs">
        {availability.state === "checking" && (
          <span className="flex items-center gap-2 text-text-muted">
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary"
            />
            Checking delivery availability…
          </span>
        )}
        {availability.state === "known" && !full && !confirmed && (
          <span
            className={`flex items-center gap-1.5 font-medium ${
              availability.level === "filling" ? "text-warning-text" : "text-success"
            }`}
          >
            <Icon name={availability.level === "filling" ? "alert" : "check"} size={14} strokeWidth={2.25} />
            {availability.level === "filling" ? "Available, filling up" : "Available for delivery"}
            <span className="font-normal text-text-muted">
              · {availability.booked} of {availability.capacity} booked
            </span>
          </span>
        )}
        {full && !confirmed && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-error">
            <span className="flex items-center gap-1.5">
              <Icon name="alert" size={14} strokeWidth={2.25} />
              Fully booked · {availability.booked} of {availability.capacity}
            </span>
            <button
              type="button"
              onClick={() => onPromptOpenChange(true)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Options
            </button>
          </span>
        )}
        {confirmed && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-warning-text">
            <span className="flex items-center gap-1.5">
              <Icon name="shield" size={14} strokeWidth={2.25} />
              Fully booked, confirmed with the Production Manager
            </span>
            <button
              type="button"
              onClick={() => onConfirmedChange(false)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Undo
            </button>
          </span>
        )}
        {availability.state === "error" && !confirmed && (
          <span className="text-text-muted">
            Couldn&apos;t check delivery availability. It will be checked again when you save.
          </span>
        )}
      </div>

      {calendarOpen && (
        <DeliveryCalendar
          value={value}
          excludeOrderId={excludeOrderId}
          onClose={() => setCalendarOpen(false)}
          onSelect={(date, full) => {
            setCalendarOpen(false);
            pick(date);
            // A full day picked from the calendar: ask straight away, every time
            // (and mark it asked, so the availability check doesn't ask twice).
            if (full) {
              promptedFor.current = date;
              onPromptOpenChange(true);
            }
          }}
        />
      )}

      <Modal open={promptOpen} onClose={() => onPromptOpenChange(false)} labelledBy={promptTitleId} panelClassName="sm:max-w-md">
        <div className="px-6 pt-6 pb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error-bg text-error">
            <Icon name="calendar" size={22} />
          </div>
          <h2 id={promptTitleId} className="mt-4 font-serif text-xl font-bold text-text-primary">
            This delivery date is fully booked
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {value ? (
              <>
                <span className="font-semibold text-text-primary">{longDateLabel(value)}</span> already has
                {availability.state === "known"
                  ? ` ${availability.booked} of ${availability.capacity}`
                  : " its full quota of"}{" "}
                deliveries booked.
              </>
            ) : (
              "That day already has its full quota of deliveries booked."
            )}{" "}
            Pick another date from the calendar, or go ahead only if the Production Manager has agreed to take it.
          </p>
        </div>
        <div className="flex flex-col gap-2 px-6 pt-4 pb-6">
          <Button type="button" onClick={checkCalendar}>
            <Icon name="calendar" size={16} />
            Check the calendar
          </Button>
          <Button type="button" variant="outline" onClick={proceedWithPm}>
            Already checked with Production Manager — proceed
          </Button>
          <Button type="button" variant="ghost" onClick={cancelFullDay}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
