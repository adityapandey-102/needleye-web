"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, type StaffReport } from "../../../lib/domain";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { WeeklyThroughputChart } from "./WeeklyThroughputChart";

type StaffRole = "designer" | "master_tailor";

const ROLE_LABEL: Record<StaffRole, string> = { designer: "Designers", master_tailor: "Master Tailors" };
const ROLE_ICON: Record<StaffRole, IconName> = { designer: "palette", master_tailor: "scissors" };

/** `YYYY-MM` for a Date, in local time. */
function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The last 6 months (current first), as { value: "YYYY-MM", label: "August 2026" }. */
function lastSixMonths(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: ym(d), label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  });
}

/**
 * Weekly staff-performance report with a lazy 3-step drill-down (owner/manager
 * only): pick a role -> pick a person -> view that person's report for a month.
 * A month dropdown (last 6 months) re-fetches ONLY the selected month; both the
 * cohort board (orders booked that month) and the weekly graph update together.
 * No all-staff / all-months aggregation ever runs.
 */
export function StaffReportClient() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const months = useMemo(() => lastSixMonths(), []);
  const [month, setMonth] = useState(months[0]!.value);

  const { members, loading: membersLoading, error: membersError } = useTeamMembers(role ?? "designer");

  const [report, setReport] = useState<StaffReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function pickStaff(id: string) {
    setStaffId(id);
    setMonth(months[0]!.value);
    setReport(null);
  }
  function backToList() {
    setStaffId(null);
    setReport(null);
    setReportError(null);
  }
  function backToRoles() {
    setRole(null);
    backToList();
  }

  useEffect(() => {
    if (!staffId) return;
    let cancelled = false;
    const run = async () => {
      setReportLoading(true);
      setReportError(null);
      try {
        const r = await ordersApi.staffReport(staffId, month);
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled) setReportError(err instanceof Error ? err.message : "Failed to load the report");
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [staffId, month, reloadKey]);

  // ---- Step 1: pick a role ----
  if (!role) {
    return (
      <Card accent>
        <CardHeader icon="bar-chart" iconTone="gold" title="Staff Weekly Report" subtitle="Choose a team to review" />
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["designer", "master_tailor"] as StaffRole[]).map((r, i) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group animate-rise relative flex items-center gap-4 overflow-hidden rounded-app-lg border border-border bg-card p-5 text-left shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-app-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <div aria-hidden className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-primary-bg/60 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-app-lg bg-primary-bg text-primary ring-1 ring-inset ring-primary/10 transition-transform duration-200 group-hover:scale-105">
                <Icon name={ROLE_ICON[r]} size={26} />
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="font-serif text-lg font-bold text-text-primary">{ROLE_LABEL[r]}</div>
                <div className="text-xs text-text-muted">See per-person monthly workload &amp; trends</div>
              </div>
              <Icon name="chevron-right" size={20} className="relative shrink-0 text-primary/40 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </CardBody>
      </Card>
    );
  }

  const crumb = (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
      <button onClick={backToRoles} className="font-medium text-primary hover:underline">
        Staff Report
      </button>
      <Icon name="chevron-right" size={14} className="text-text-muted" />
      {staffId ? (
        <button onClick={backToList} className="font-medium text-primary hover:underline">
          {ROLE_LABEL[role]}
        </button>
      ) : (
        <span className="font-medium text-text-secondary">{ROLE_LABEL[role]}</span>
      )}
      {staffId && report && (
        <>
          <Icon name="chevron-right" size={14} className="text-text-muted" />
          <span className="font-medium text-text-secondary">{report.staff.fullName}</span>
        </>
      )}
    </div>
  );

  // ---- Step 2: pick a person ----
  if (!staffId) {
    return (
      <div>
        {crumb}
        <Card>
          <CardHeader icon="👥" iconTone="blue" title={ROLE_LABEL[role]} subtitle="Pick a person to see their report" />
          <div className="p-2">
            {membersLoading ? (
              <div className="p-4 text-sm text-text-muted">Loading…</div>
            ) : membersError ? (
              <div className="p-4 text-sm text-error">{membersError}</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-sm text-text-muted">No active {ROLE_LABEL[role].toLowerCase()} yet.</div>
            ) : (
              <ul className="divide-y divide-border-light">
                {members.map((m, i) => (
                  <li key={m.id}>
                    <button
                      onClick={() => pickStaff(m.id)}
                      style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                      className="group animate-fade-in flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary-bg/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-bold text-primary ring-1 ring-inset ring-primary/10">
                        {m.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
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
        </Card>
      </div>
    );
  }

  // ---- Step 3: the person's monthly report ----
  const monthLabel = months.find((m) => m.value === month)?.label ?? month;
  const monthPicker = (
    <div className="flex items-center gap-2">
      {reportLoading && <Spinner />}
      <Select className="w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div>
      {crumb}

      {!report && reportLoading ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 py-10 text-sm text-text-muted">
              <Spinner /> Loading report…
            </div>
          </CardBody>
        </Card>
      ) : !report && reportError ? (
        <Card>
          <CardBody className="flex items-center justify-between gap-3 text-sm text-error">
            <span>{reportError}</span>
            <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </CardBody>
        </Card>
      ) : report ? (
        <div className={`flex flex-col gap-4 ${reportLoading ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
          {/* Cohort board -- orders booked in the selected month */}
          <Card>
            <CardHeader
              icon="🧑‍💼"
              iconTone="purple"
              title={report.staff.fullName}
              subtitle={`${ROLE_LABEL[role].slice(0, -1)} · booked in ${monthLabel}`}
              action={monthPicker}
            />
            <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon="package" label="Booked" value={report.summary.booked} tone="primary" index={0} />
              <StatTile icon="hammer" label="Active" value={report.summary.active} tone="amber" index={1} />
              <StatTile icon="needle" label="In Production" value={report.summary.inProduction} tone="blue" index={2} />
              <StatTile icon="check" label="Completed" value={report.summary.completed} tone="success" index={3} />
              <StatTile icon="clock" label="Overdue" value={report.summary.overdue} tone="error" index={4} />
              <StatTile icon="alert" label="Urgent" value={report.summary.urgent} tone="error" index={5} />
              <StatTile icon="card" label="Payments Pending" value={report.summary.paymentPendingCount} tone="error" index={6} />
              <StatTile icon="wallet" label="Pending Amount" value={formatCurrency(report.summary.paymentPendingAmount)} tone="error" index={7} />
            </CardBody>
          </Card>

          {/* Weekly graph for the same month */}
          <Card>
            <CardHeader icon="📈" iconTone="green" title="Weekly throughput" subtitle={`Booked vs completed activity · ${monthLabel}`} />
            <CardBody>
              {reportError ? (
                <div className="flex items-center justify-between gap-3 text-sm text-error">
                  <span>{reportError}</span>
                  <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setReloadKey((k) => k + 1)}>
                    Retry
                  </Button>
                </div>
              ) : (
                <WeeklyThroughputChart weekly={report.weekly} />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

const TONES: Record<string, { chip: string; val: string }> = {
  primary: { chip: "bg-primary-bg text-primary ring-primary/10", val: "text-text-primary" },
  success: { chip: "bg-success-bg text-success ring-success/15", val: "text-success" },
  error: { chip: "bg-error-bg text-error ring-error/15", val: "text-error" },
  amber: { chip: "bg-warning-bg text-warning ring-warning/15", val: "text-text-primary" },
  blue: { chip: "bg-info-bg text-info ring-info/15", val: "text-text-primary" },
};

function StatTile({
  icon,
  label,
  value,
  tone,
  index = 0,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  tone: keyof typeof TONES;
  index?: number;
}) {
  const t = TONES[tone]!;
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="animate-rise flex items-center gap-3 rounded-app-lg border border-border-light bg-card p-3 shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-md"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-app ring-1 ring-inset ${t.chip}`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <div className={`truncate text-xl font-extrabold tabular-nums ${t.val}`}>{value}</div>
        <div className="text-[11px] text-text-muted">{label}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />;
}
