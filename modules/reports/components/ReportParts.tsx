"use client";

import { Icon, type IconName } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { CountUp } from "../../../components/ui/CountUp";

/**
 * The pieces every Reports section is built from, so the three read as one
 * page: a section heading, a board of headline figures (the dashboard's light
 * KPI board -- paper, gold top line, hairlines between cells), and the
 * loading / error states.
 */

/** A section's heading: serif title, one plain line of what it shows, and an optional action (refresh). */
export function SectionIntro({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="font-serif text-xl leading-tight text-text-primary sm:text-[22px]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export type FigureTone = "default" | "success" | "warning" | "error";

/** Colour only where it carries meaning (as on the Orders dashboard). */
const VALUE_TONE: Record<FigureTone, string> = {
  default: "text-text-primary",
  success: "text-success",
  warning: "text-warning-text",
  error: "text-error",
};
const DOT_TONE: Record<FigureTone, string> = {
  default: "bg-accent-light",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export interface Figure {
  key: string;
  icon: IconName;
  label: string;
  /** A count (animated) or ready-formatted text such as money or a date range. */
  value: number | string;
  caption?: string;
  tone?: FigureTone;
  /** Makes the cell a toggle button (a filter): `pressed` is its state. */
  onToggle?: () => void;
  pressed?: boolean;
}

/**
 * Headline figures for a section. `columns` is the grid's classes, chosen by
 * the caller so every row is full (no empty cell showing through). Cells with
 * `onToggle` are real buttons with aria-pressed -- the Working / Idle filters.
 */
export function FigureBoard({ label, figures, columns }: { label: string; figures: Figure[]; columns: string }) {
  return (
    <section aria-label={label} className="card-accent-top rounded-app-lg bg-card shadow-app-md ring-1 ring-gold/30">
      <div className={`stagger-in grid gap-px bg-border-light ${columns}`}>
        {figures.map((f) => {
          const tone = f.tone ?? "default";
          const body = (
            <>
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-text-secondary">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-app bg-primary-bg text-primary ring-1 ring-primary/10 ring-inset">
                  <Icon name={f.icon} size={14} />
                </span>
                <span className="min-w-0 truncate">{f.label}</span>
              </span>
              <span className={`figure mt-2.5 block truncate text-[24px] leading-none sm:text-[28px] ${VALUE_TONE[tone]}`}>
                {typeof f.value === "number" ? <CountUp to={f.value} /> : f.value}
              </span>
              {f.caption && (
                <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONE[tone]}`} />
                  <span className="min-w-0 truncate">{f.caption}</span>
                </span>
              )}
            </>
          );
          const cell = "relative flex min-w-0 flex-col bg-card px-4 pt-4 pb-3.5 text-left sm:px-5 sm:pt-5 sm:pb-4";
          return f.onToggle ? (
            <button
              key={f.key}
              type="button"
              onClick={f.onToggle}
              aria-pressed={f.pressed ?? false}
              className={`${cell} transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-inset ${
                f.pressed ? "bg-primary-bg! shadow-[inset_0_-2px_0_var(--color-primary)]" : "hover:bg-primary-bg/40"
              }`}
            >
              {body}
              <span
                aria-hidden
                className={`absolute top-4 right-4 rounded-full px-1.5 py-px text-[10px] font-semibold sm:top-5 ${
                  f.pressed ? "bg-primary text-white" : "text-text-muted"
                }`}
              >
                {f.pressed ? "Filtered" : "Filter"}
              </span>
            </button>
          ) : (
            <div key={f.key} className={cell}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Grey placeholders while a section's first answer is on its way. */
export function SkeletonRows({ rows, className = "h-14" }: { rows: number; className?: string }) {
  return (
    <div className="flex flex-col gap-2" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-app-sm bg-app-bg ${className}`} />
      ))}
    </div>
  );
}

/** A figure board's shape while loading, so the page doesn't jump when the numbers land. */
export function SkeletonBoard({ cells, columns }: { cells: number; columns: string }) {
  return (
    <div className="overflow-hidden rounded-app-lg bg-card shadow-app-md ring-1 ring-gold/30" aria-hidden>
      <div className={`grid gap-px bg-border-light ${columns}`}>
        {Array.from({ length: cells }, (_, i) => (
          <div key={i} className="bg-card px-5 pt-5 pb-4">
            <div className="h-3.5 w-24 animate-pulse rounded bg-app-bg" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-app-bg" />
            <div className="mt-2.5 h-3 w-28 animate-pulse rounded bg-app-bg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Couldn't load …" with the reason and a Try again button -- never a blank panel. */
export function LoadError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-app-lg border border-error/25 bg-error-bg/30 px-5 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-bg text-error">
        <Icon name="alert" size={18} />
      </span>
      <p className="mt-3 font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-md text-sm text-text-muted">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <Icon name="refresh" size={15} /> Try again
      </Button>
    </div>
  );
}

/** A quiet empty state inside a panel. */
export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-bg text-primary ring-1 ring-primary/10 ring-inset">
        <Icon name={icon} size={20} />
      </span>
      <p className="mt-3 font-semibold text-text-primary">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-text-muted">{hint}</p>}
    </div>
  );
}

/** A small spinning ring for "refreshing" next to a control. */
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
    />
  );
}
