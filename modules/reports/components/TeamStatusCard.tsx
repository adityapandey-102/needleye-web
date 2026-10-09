"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, timeAgoLabel, type StaffActivity, type StaffActivityRow, type TrackedStaffRole } from "../../../lib/domain";
import { initialsOf, lookBackPhrase, workingShare } from "../../../lib/domain/utils/reports";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { reportsApi } from "../api/reportsApi";
import { Card, CardHeader, CARD_GRID_CELL } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { EmptyState, FigureBoard, LoadError, SectionIntro, SkeletonBoard, SkeletonRows, Spinner } from "./ReportParts";

type StatusFilter = "" | "working" | "idle";

const PAGE_SIZE = 20;
const ROLE_ORDER: TrackedStaffRole[] = ["designer", "master_tailor", "production_manager", "worker"];
const BOARD_COLUMNS = "grid-cols-2 lg:grid-cols-4";

/**
 * Team status: who is Working vs Idle right now, for active designers, master
 * tailors, production managers and workers (the owner and accountant are never
 * listed). The rule is the API's (needleye-api reports/domain), and the
 * look-back windows come back with every answer, so the explanation on screen
 * always matches what the API used: designers by the undelivered orders they
 * created in the last `designerDays` days; everyone else by the undelivered
 * orders whose latest stage move was theirs in the last `floorHours` hours.
 *
 * Nothing is filtered in the browser: search (debounced), role, status and the
 * page all go to the API, which returns one page of 20 plus the totals -- so
 * the cost stays the same with 10 staff or 1,000.
 */
export function TeamStatusCard() {
  const [data, setData] = useState<StaffActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<TrackedStaffRole | "">("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      setLoading(true);
      reportsApi
        .staffActivity({
          q: debouncedSearch || undefined,
          role: role || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load team status");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, role, status, page, reloadKey]);

  // Every filter change starts again at page 1 (set in the handler, not an
  // effect, so it lands in the same render as the filter itself).
  function changeSearch(v: string) {
    setSearch(v);
    setPage(0);
  }
  function changeRole(v: TrackedStaffRole | "") {
    setRole(v);
    setPage(0);
  }
  function changeStatus(v: StatusFilter) {
    setStatus(v);
    setPage(0);
  }
  const reload = () => setReloadKey((k) => k + 1);

  const filtered = Boolean(debouncedSearch || role || status);

  return (
    <div className="flex flex-col gap-4">
      <SectionIntro
        id="team-status-heading"
        title="Team status"
        description="Who is working and who is idle right now, with the orders in each person's hands."
        action={
          <Button variant="outline" onClick={reload} disabled={loading} className="px-3! py-2! text-xs">
            {loading && data ? <Spinner label="Refreshing" /> : <Icon name="refresh" size={14} />}
            Refresh
          </Button>
        }
      />

      {error && !data ? (
        <LoadError title="Couldn't load team status" message={error} onRetry={reload} />
      ) : !data ? (
        <>
          <SkeletonBoard cells={4} columns={BOARD_COLUMNS} />
          <SkeletonRows rows={6} />
        </>
      ) : (
        <>
          <FigureBoard
            label="Team at a glance"
            columns={BOARD_COLUMNS}
            figures={[
              {
                key: "working",
                icon: "hammer",
                label: "Working",
                value: data.counts.working,
                caption: "An order in their hands",
                tone: "success",
                pressed: status === "working",
                onToggle: () => changeStatus(status === "working" ? "" : "working"),
              },
              {
                key: "idle",
                icon: "hourglass",
                label: "Idle",
                value: data.counts.idle,
                caption: "Nothing in hand",
                tone: "default",
                pressed: status === "idle",
                onToggle: () => changeStatus(status === "idle" ? "" : "idle"),
              },
              {
                key: "team",
                icon: "users",
                label: role ? `${ROLE_LABELS[role]}s` : "Team",
                value: data.counts.working + data.counts.idle,
                caption: debouncedSearch ? `Matching “${debouncedSearch}”` : "Active staff tracked",
              },
              {
                key: "share",
                icon: "trending-up",
                label: "Busy share",
                value: `${workingShare(data.counts.working, data.counts.idle)}%`,
                caption: "Of them working now",
              },
            ]}
          />

          <p className="flex gap-2.5 rounded-app border border-border-light bg-card/70 px-4 py-3 text-xs leading-relaxed text-text-muted">
            <Icon name="clock" size={15} className="mt-px text-gold" />
            <span>
              <span className="font-semibold text-text-secondary">Working</span> means an undelivered order is in their hands —
              designers: they booked it {lookBackPhrase(data.windows.designerDays, "day")}; master tailors, production managers and
              workers: they moved it {lookBackPhrase(data.windows.floorHours, "hour")}. Everyone else is{" "}
              <span className="font-semibold text-text-secondary">Idle</span>.
            </span>
          </p>

          <Card regionLabel="Team members">
            <CardHeader
              icon={<Icon name="users" size={17} />}
              title="Team members"
              subtitle={`${data.total.toLocaleString("en-IN")} ${data.total === 1 ? "person" : "people"}${filtered ? " match these filters" : ""}`}
            />
            <div className="grid grid-cols-2 gap-2 border-b border-border-light p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-4">
              <div className="relative col-span-2 sm:col-span-1">
                <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
                <Input
                  aria-label="Search staff by name"
                  placeholder="Search by name"
                  value={search}
                  onChange={(e) => changeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select aria-label="Filter by role" value={role} onChange={(e) => changeRole(e.target.value as TrackedStaffRole | "")} className="sm:w-52">
                <option value="">All roles</option>
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Select aria-label="Filter by status" value={status} onChange={(e) => changeStatus(e.target.value as StatusFilter)} className="sm:w-40">
                <option value="">Everyone</option>
                <option value="working">Working</option>
                <option value="idle">Idle</option>
              </Select>
            </div>

            {error && (
              <p role="alert" className="flex items-center justify-between gap-3 border-b border-error/20 bg-error-bg/40 px-4 py-2 text-sm text-error">
                <span>{error}</span>
                <button type="button" onClick={reload} className="font-semibold underline">
                  Retry
                </button>
              </p>
            )}

            {data.staff.length === 0 ? (
              <EmptyState
                icon="users"
                title="No staff match these filters."
                hint={filtered ? "Try another name, or clear the role or status filter." : "No active designers, tailors, production managers or workers yet."}
              />
            ) : (
              <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
                {/* Phones and tablets: one card per person (two across from md). */}
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:hidden">
                  {data.staff.map((s) => (
                    <li key={s.id} className={`px-4 py-3.5 ${CARD_GRID_CELL}`}>
                      <div className="flex items-center gap-3">
                        <Avatar row={s} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-text-primary">{s.fullName}</p>
                          <p className="text-xs text-text-muted">{ROLE_LABELS[s.role]}</p>
                        </div>
                        <StatusBadge row={s} />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-app-sm bg-app-bg/60 px-3 py-2 text-xs">
                        <Fact label="In hand" value={String(s.openOrders)} />
                        <Fact label="Last work" value={timeAgoLabel(s.lastWorkAt)} title={s.lastWorkAt} />
                        <Fact label="Last seen" value={timeAgoLabel(s.lastSeenAt)} title={s.lastSeenAt} />
                      </dl>
                    </li>
                  ))}
                </ul>

                {/* Desktop: a table. */}
                <table className="hidden w-full text-sm lg:table">
                  <thead className="bg-app-bg/60 text-left text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                    <tr>
                      <th className="px-5 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Orders in hand</th>
                      <th className="px-4 py-2.5">Last work</th>
                      <th className="px-5 py-2.5">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="rows-in divide-y divide-border-light">
                    {data.staff.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-primary-bg/25">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar row={s} />
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary">{s.fullName}</p>
                              <p className="text-xs text-text-muted">{ROLE_LABELS[s.role]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge row={s} />
                        </td>
                        <td className="figure px-4 py-3 text-right text-base text-text-primary">{s.openOrders}</td>
                        <td className="px-4 py-3 text-text-secondary" title={s.lastWorkAt ?? undefined}>
                          {timeAgoLabel(s.lastWorkAt)}
                        </td>
                        <td className="px-5 py-3 text-text-secondary" title={s.lastSeenAt ?? undefined}>
                          {timeAgoLabel(s.lastSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </Card>
        </>
      )}
    </div>
  );
}

/** Initials in a ring: green while Working, plain while Idle. */
function Avatar({ row }: { row: StaffActivityRow }) {
  const working = row.status === "working";
  return (
    <span
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${
        working ? "bg-primary-bg text-primary ring-success" : "bg-app-bg text-text-muted ring-border"
      }`}
    >
      {initialsOf(row.fullName)}
    </span>
  );
}

function StatusBadge({ row }: { row: StaffActivityRow }) {
  return <StatusPill label={row.status === "working" ? "Working" : "Idle"} tone={row.status === "working" ? "green" : "gray"} />;
}

function Fact({ label, value, title }: { label: string; value: string; title?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium text-text-muted">{label}</dt>
      <dd className="truncate font-semibold text-text-secondary" title={title ?? undefined}>
        {value}
      </dd>
    </div>
  );
}
