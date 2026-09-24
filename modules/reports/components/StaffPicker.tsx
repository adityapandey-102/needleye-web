"use client";

import { useEffect, useState } from "react";
import type { StaffActivity } from "../../../lib/domain";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { reportsApi } from "../api/reportsApi";
import { Input } from "../../../components/ui/Field";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";

const PAGE_SIZE = 15;

/**
 * The Staff Report's "pick a person" step: one team (designers or master
 * tailors), searched by name (debounced) and paged by the API
 * (GET /reports/staff-activity?role=) -- never the whole team at once.
 */
export function StaffPicker({
  role,
  roleLabel,
  onPick,
}: {
  role: "designer" | "master_tailor";
  roleLabel: string;
  onPick: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [data, setData] = useState<StaffActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [role, debouncedSearch, page]);

  // A new search starts at page 1 -- set here, with the search, not in an effect.
  function changeSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  const people = data?.staff ?? [];

  return (
    <>
      <div className="border-b border-border-light p-3">
        <Input
          aria-label={`Search ${roleLabel.toLowerCase()} by name`}
          placeholder={`Search ${roleLabel.toLowerCase()} by name`}
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
        />
      </div>
      <div className={`p-2 transition-opacity ${loading && data ? "opacity-60" : ""}`} aria-busy={loading}>
        {!data && loading ? (
          <div className="p-4 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-error">{error}</div>
        ) : people.length === 0 ? (
          <div className="p-4 text-sm text-text-muted">
            {debouncedSearch ? `No ${roleLabel.toLowerCase()} match “${debouncedSearch}”.` : `No active ${roleLabel.toLowerCase()} yet.`}
          </div>
        ) : (
          <ul className="divide-y divide-border-light">
            {people.map((m, i) => (
              <li key={m.id}>
                <button
                  onClick={() => onPick(m.id)}
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  className="group animate-fade-in flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary-bg/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-bold text-primary ring-1 ring-inset ring-primary/10">
                    {m.fullName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="flex-1 font-medium text-text-primary">{m.fullName}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    View report
                    <Icon name="chevron-right" size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data && <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </>
  );
}
