"use client";

import { useEffect, useState } from "react";
import type { StaffActivity } from "../../../lib/domain";
import { initialsOf } from "../../../lib/domain/utils/reports";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { reportsApi } from "../api/reportsApi";
import { Input } from "../../../components/ui/Field";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { StatusPill } from "../../../components/ui/StatusPill";

const PAGE_SIZE = 15;

/**
 * The Staff report's "pick a person" list: one team (designers or master
 * tailors), searched by name (debounced) and paged by the API
 * (GET /reports/staff-activity?role=) -- never the whole team at once. The
 * same answer carries each person's Working / Idle status, shown for free.
 */
export function StaffPicker({
  role,
  roleLabel,
  selectedId,
  onPick,
}: {
  role: "designer" | "master_tailor";
  roleLabel: string;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [data, setData] = useState<StaffActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      setLoading(true);
      reportsApi
        .staffActivity({ role, q: debouncedSearch || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the team");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [role, debouncedSearch, page, reloadKey]);

  // A new search starts at page 1 -- set here, with the search, not in an effect.
  function changeSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  const people = data?.staff ?? [];
  const lower = roleLabel.toLowerCase();

  return (
    <>
      <div className="border-b border-border-light p-3">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
          <Input
            aria-label={`Search ${lower} by name`}
            placeholder={`Search ${lower} by name`}
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className={`p-1.5 transition-opacity ${loading && data ? "opacity-60" : ""}`} aria-busy={loading}>
        {!data && loading ? (
          <div className="flex flex-col gap-1.5 p-1.5" aria-label="Loading">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-app-sm bg-app-bg" />
            ))}
          </div>
        ) : error && !data ? (
          <div role="alert" className="flex items-center justify-between gap-3 p-3 text-sm text-error">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : people.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-muted">
            {debouncedSearch ? `No ${lower} match “${debouncedSearch}”.` : `No active ${lower} yet.`}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {people.map((m, i) => {
              const selected = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onPick(m.id)}
                    aria-current={selected ? "true" : undefined}
                    style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                    className={`group animate-fade-in flex w-full items-center gap-3 rounded-app-sm px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                      selected ? "bg-primary-bg shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-primary-bg/40"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-bold text-primary ring-1 ring-primary/10 ring-inset"
                    >
                      {initialsOf(m.fullName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-medium ${selected ? "text-primary" : "text-text-primary"}`}>{m.fullName}</span>
                      <span className="block text-xs text-text-muted">
                        {m.openOrders} {m.openOrders === 1 ? "order" : "orders"} in hand
                      </span>
                    </span>
                    <StatusPill label={m.status === "working" ? "Working" : "Idle"} tone={m.status === "working" ? "green" : "gray"} />
                    <span className="sr-only">View report</span>
                    <Icon
                      name="chevron-right"
                      size={16}
                      className={`transition-transform group-hover:translate-x-0.5 ${selected ? "text-primary" : "text-primary/40"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {data && <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </>
  );
}
