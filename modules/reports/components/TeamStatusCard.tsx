"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, timeAgoLabel, type StaffActivity, type TrackedStaffRole } from "../../../lib/domain";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { reportsApi } from "../api/reportsApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { CountUp } from "../../../components/ui/CountUp";

type StatusFilter = "" | "working" | "idle";

const PAGE_SIZE = 20;
const ROLE_ORDER: TrackedStaffRole[] = ["designer", "master_tailor", "production_manager", "worker"];

/**
 * Who is Working vs Idle right now, for active designers, master tailors,
 * production managers and workers (the owner and accountant are never listed).
 * The rules are the API's (needleye-api reports/domain): designers by the
 * undelivered orders they created in the last 45 days; everyone else by the
 * undelivered orders whose latest stage move was theirs in the last 30 days.
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

  return (
    <Card>
      <CardHeader
        icon={<Icon name="users" size={18} />}
        iconTone="purple"
        title="Team status"
        subtitle="Working vs idle, right now"
        action={
          <Button variant="ghost" onClick={() => setReloadKey((k) => k + 1)} aria-label="Refresh team status" className="px-2.5">
            <Icon name="refresh" size={16} />
          </Button>
        }
      />
      <CardBody className="flex flex-col gap-4">
        {error && !data ? (
          <div className="py-10 text-center">
            <p className="font-semibold text-text-primary">Couldn&apos;t load team status</p>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-app-sm bg-app-bg" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-text-muted">
              <span className="font-semibold text-text-secondary">Working</span> means an undelivered order is in their hands.
              Designers: they created it in the last {data.windows.designerDays} days. Master tailors, production managers and
              workers: they made its latest stage move in the last {data.windows.floorDays} days. Everyone else is{" "}
              <span className="font-semibold text-text-secondary">Idle</span>.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <SummaryTile
                label="Working"
                value={data.counts.working}
                tone="text-success"
                active={status === "working"}
                onClick={() => changeStatus(status === "working" ? "" : "working")}
              />
              <SummaryTile
                label="Idle"
                value={data.counts.idle}
                tone="text-text-secondary"
                active={status === "idle"}
                onClick={() => changeStatus(status === "idle" ? "" : "idle")}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Search staff by name"
                placeholder="Search by name"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select
                aria-label="Filter by role"
                value={role}
                onChange={(e) => changeRole(e.target.value as TrackedStaffRole | "")}
                className="sm:max-w-[13rem]"
              >
                <option value="">All roles</option>
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => changeStatus(e.target.value as StatusFilter)}
                className="sm:max-w-[10rem]"
              >
                <option value="">Everyone</option>
                <option value="working">Working</option>
                <option value="idle">Idle</option>
              </Select>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            {data.staff.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">No staff match these filters.</p>
            ) : (
              <div
                className={`overflow-hidden rounded-app-sm border border-border-light transition-opacity ${loading ? "opacity-60" : ""}`}
                aria-busy={loading}
              >
                <table className="w-full text-sm">
                  <thead className="hidden bg-app-bg/60 text-left text-[11px] font-semibold text-text-muted sm:table-header-group">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Orders in hand</th>
                      <th className="px-4 py-2.5">Last work</th>
                      <th className="px-4 py-2.5">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="rows-in divide-y divide-border-light">
                    {data.staff.map((s) => (
                      <tr key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:table-row sm:p-0">
                        <td className="min-w-0 flex-1 sm:px-4 sm:py-3">
                          <p className="font-semibold text-text-primary">{s.fullName}</p>
                          <p className="text-xs text-text-muted">{ROLE_LABELS[s.role]}</p>
                        </td>
                        <td className="sm:px-4 sm:py-3">
                          <StatusPill label={s.status === "working" ? "Working" : "Idle"} tone={s.status === "working" ? "green" : "gray"} />
                        </td>
                        <td className="w-full text-xs text-text-secondary tabular-nums sm:w-auto sm:px-4 sm:py-3 sm:text-right sm:text-sm">
                          <span className="sm:hidden">Orders in hand: </span>
                          {s.openOrders}
                        </td>
                        <td className="text-xs text-text-secondary sm:px-4 sm:py-3 sm:text-sm" title={s.lastWorkAt ?? undefined}>
                          <span className="sm:hidden">Last work: </span>
                          {timeAgoLabel(s.lastWorkAt)}
                        </td>
                        <td className="text-xs text-text-secondary sm:px-4 sm:py-3 sm:text-sm" title={s.lastSeenAt ?? undefined}>
                          <span className="sm:hidden">· Last seen: </span>
                          {timeAgoLabel(s.lastSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-app border px-4 py-3 text-left transition-colors ${
        active ? "border-primary/40 bg-primary-bg" : "border-border-light bg-card hover:bg-app-bg"
      }`}
    >
      <p className="text-[11px] font-semibold text-text-muted">{label}</p>
      <p className={`figure mt-1 text-[26px] leading-none ${tone}`}>
        <CountUp to={value} />
      </p>
    </button>
  );
}
