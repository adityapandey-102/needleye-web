"use client";

import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { useRouter } from "next/navigation";
import {
  addMonthsIso,
  GRANULAR_STATUSES,
  hasCapability,
  isoToday,
  longDateLabel,
  MONTH_OPTIONS,
  revenueYears,
  TIMELINE_FILTERS,
  type OrderListItem,
  type Role,
  type TimelineFilter,
} from "../../../lib/domain";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Field";
import { Select } from "../../../components/ui/Select";
import { Pager } from "../../../components/ui/Pager";
import { Icon } from "../../../components/ui/Icon";
import { KanbanBoard } from "./KanbanBoard";
import { OrdersEmpty, OrdersTable, OrdersTableSkeleton } from "./OrdersTable";

type ViewMode = "table" | "kanban";

/** Table page size. */
const PAGE_SIZE = 20;
/**
 * Kanban: the board shows only orders BOOKED in the last KANBAN_WINDOW_MONTHS
 * months, KANBAN_PAGE_SIZE at a time (newest first), paged with the same Pager
 * as the table. Older orders stay reachable in Table view.
 */
const KANBAN_PAGE_SIZE = 50;
const KANBAN_WINDOW_MONTHS = 2;

/** Human labels for the dashboard buckets a summary card can deep-link into (?bucket=). */
const BUCKET_LABELS: Record<string, string> = {
  active: "Active orders (not yet delivered)",
  production: "In production (Falls / Kutchu → Alteration)",
  completed: "Delivered (all time)",
  ready: "Ready for delivery",
  delivered: "Delivered",
  delivered_this_month: "Delivered this month",
  pending_payment: "Pending payments",
  not_priced: "Price not set",
  overdue: "Overdue (past due date)",
  urgent: "Urgent (due within 3 days)",
  this_month: "Booked this month",
};

/**
 * Every order in the caller's scope, as one card (like the Revenue page's
 * monthly ledger): search and team filters, Table or Kanban, paged by the API.
 */
export function OrdersListClient({
  role,
  initialBucket,
}: {
  role: Role;
  initialBucket?: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<ViewMode>("table");
  const [bucket, setBucket] = useState(initialBucket ?? "");

  const [search, setSearch] = useState("");
  // The Kanban's window start: today (the user's calendar) minus 2 months, fixed for this visit.
  const [kanbanFrom] = useState(() => addMonthsIso(isoToday(), -KANBAN_WINDOW_MONTHS));
  // Only TYPING is debounced (one request per pause, not per keystroke);
  // page / filter / view changes fetch immediately.
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [designerId, setDesignerId] = useState("");
  const [masterTailorId, setMasterTailorId] = useState("");
  const [stage, setStage] = useState("");
  const [timeline, setTimeline] = useState<TimelineFilter | "">("");
  const [bookedYear, setBookedYear] = useState("");
  const [bookedMonth, setBookedMonth] = useState("");
  // Booking years on offer, newest first: this year back to 2020 (fixed for this visit).
  const [years] = useState(() => revenueYears(new Date().getFullYear()).reverse());

  const { members: designers } = useTeamMembers("designer");
  const { members: masters } = useTeamMembers("master_tailor");
  const canSeePayment = hasCapability(role, "payments:read");
  const filtered = Boolean(search.trim() || designerId || masterTailorId || stage || timeline || bookedYear);

  // Any filter or view change goes through these so it also resets to the
  // first page -- otherwise a filter that narrows the result set could leave
  // you stranded on a now-empty page. (Resetting here in the event handler,
  // not in an effect, keeps the page/filter update in a single render.)
  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }
  function changeDesigner(value: string) {
    setDesignerId(value);
    setPage(0);
  }
  function changeMaster(value: string) {
    setMasterTailorId(value);
    setPage(0);
  }
  function changeStage(value: string) {
    setStage(value);
    setPage(0);
  }
  function changeTimeline(value: TimelineFilter | "") {
    setTimeline(value);
    setPage(0);
  }
  function changeYear(value: string) {
    setBookedYear(value);
    // A month only means something within a year -- the API refuses one without the other.
    if (!value) setBookedMonth("");
    setPage(0);
  }
  function changeMonth(value: string) {
    setBookedMonth(value);
    setPage(0);
  }
  function clearFilters() {
    setSearch("");
    setDesignerId("");
    setMasterTailorId("");
    setStage("");
    setTimeline("");
    setBookedYear("");
    setBookedMonth("");
    setPage(0);
  }
  function changeView(next: ViewMode) {
    setView(next);
    setPage(0);
  }
  function clearBucket() {
    setBucket("");
    setPage(0);
    // Drop the ?bucket= param so a refresh/back-nav doesn't re-apply it.
    router.replace("/orders");
  }

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      setLoading(true);
      // Table: all orders, 20 a page. Kanban: the last 2 months only, 50 a page
      // -- both paged by the server, so the board never loads more than 50.
      const pagination =
        view === "table"
          ? { limit: PAGE_SIZE, offset: page * PAGE_SIZE }
          : { limit: KANBAN_PAGE_SIZE, offset: page * KANBAN_PAGE_SIZE, createdFrom: kanbanFrom };
      ordersApi
        .list({
          search: debouncedSearch || undefined,
          designerId: designerId || undefined,
          masterTailorId: masterTailorId || undefined,
          status: stage || undefined,
          timeline: timeline || undefined,
          bookedYear: bookedYear ? Number(bookedYear) : undefined,
          bookedMonth: bookedYear && bookedMonth ? Number(bookedMonth) : undefined,
          bucket: bucket || undefined,
          ...pagination,
        })
        .then((data) => {
          if (!cancelled) {
            setOrders(data.orders);
            setTotal(data.total);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, designerId, masterTailorId, stage, timeline, bookedYear, bookedMonth, bucket, view, page, kanbanFrom, reloadKey]);

  const subtitle = loading && orders.length === 0 ? "Loading…" : `${total.toLocaleString("en-IN")} ${total === 1 ? "order" : "orders"} · newest first`;

  return (
    <Card>
      <CardHeader
        icon={<Icon name="list" size={17} />}
        title={view === "kanban" ? "Production board" : "All orders"}
        subtitle={subtitle}
        wideAction
        action={
          <div role="group" aria-label="View" className="flex rounded-app border border-border bg-app-bg/70 p-0.5 sm:inline-flex">
            <ViewButton active={view === "table"} onClick={() => changeView("table")} icon="list" label="Table" />
            <ViewButton active={view === "kanban"} onClick={() => changeView("kanban")} icon="columns" label="Kanban" />
          </div>
        }
      />

      {/* Search, team and order filters, in the card like the Revenue page's range picker:
          stacked on phones, two per row on tablets, two tidy rows of four columns on desktop
          (search + team pickers, then stage / timeline / booking year / month). */}
      <div className="grid gap-3 border-b border-border-light px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
          <Input
            className="w-full pl-9"
            placeholder="Search customer, bill number, or order ID"
            aria-label="Search orders"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Designer" value={designerId} onChange={(e) => changeDesigner(e.target.value)}>
          <option value="">All Designers</option>
          {designers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </Select>
        <Select aria-label="Master tailor" value={masterTailorId} onChange={(e) => changeMaster(e.target.value)}>
          <option value="">All Masters</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </Select>
        <Select aria-label="Stage" value={stage} onChange={(e) => changeStage(e.target.value)}>
          <option value="">All stages</option>
          {GRANULAR_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Timeline" value={timeline} onChange={(e) => changeTimeline(e.target.value as TimelineFilter | "")}>
          <option value="">Any timeline</option>
          {TIMELINE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Booking year" value={bookedYear} onChange={(e) => changeYear(e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        {/* Booked month needs a year first -- disabled (and "All months") until one is picked. */}
        <Select aria-label="Booking month" value={bookedMonth} disabled={!bookedYear} onChange={(e) => changeMonth(e.target.value)}>
          <option value="">All months</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={String(Number(m.value))}>
              {m.label}
            </option>
          ))}
        </Select>
        {filtered && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 justify-self-start text-xs font-medium text-primary hover:underline sm:col-span-2 lg:col-span-4">
            <Icon name="x" size={13} /> Clear
          </button>
        )}
      </div>

      {bucket && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light bg-primary-bg/40 px-5 py-2.5 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="list" size={13} className="text-primary" />
            Showing <span className="font-semibold text-text-primary">{BUCKET_LABELS[bucket] ?? bucket}</span>
          </span>
          <button onClick={clearBucket} className="font-medium text-primary underline-offset-4 hover:underline">
            Show all orders
          </button>
        </div>
      )}

      {error ? (
        <div className="m-5 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
          <span>{error}</span>
          <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : view === "kanban" ? (
        loading ? (
          <div className="flex gap-3 overflow-hidden p-5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-64 w-64 shrink-0 rounded-app-lg" />
            ))}
          </div>
        ) : (
          <div className="p-5">
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <Icon name="calendar" size={14} className="text-primary" />
              <span>
                Orders booked since <strong className="font-semibold text-text-primary">{longDateLabel(kanbanFrom)}</strong>, newest first,{" "}
                {KANBAN_PAGE_SIZE} per page.
              </span>
              <span className="text-text-muted">Older orders are in Table view.</span>
            </p>
            <KanbanBoard orders={orders} role={role} />
          </div>
        )
      ) : loading && orders.length === 0 ? (
        <OrdersTableSkeleton />
      ) : orders.length === 0 ? (
        <OrdersEmpty
          title="No orders match"
          hint="Try another search, or clear the filters."
          action={
            (filtered || bucket) && (
              <button
                onClick={() => {
                  clearFilters();
                  if (bucket) clearBucket();
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <OrdersTable orders={orders} canSeePayment={canSeePayment} dimmed={loading} />
      )}
      {!error && (orders.length > 0 || page > 0) && (
        <Pager page={page} pageSize={view === "table" ? PAGE_SIZE : KANBAN_PAGE_SIZE} total={total} onPageChange={setPage} />
      )}
    </Card>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: "list" | "columns"; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:flex-none ${
        active ? "bg-card text-primary shadow-app" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  );
}
