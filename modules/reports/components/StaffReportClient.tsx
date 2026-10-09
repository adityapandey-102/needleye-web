"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, type StaffReport } from "../../../lib/domain";
import { initialsOf } from "../../../lib/domain/utils/reports";
import { ordersApi } from "../../orders/api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Select } from "../../../components/ui/Select";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { WeeklyThroughputChart } from "./WeeklyThroughputChart";
import { StaffPicker } from "./StaffPicker";
import { EmptyState, FigureBoard, LoadError, SectionIntro, SkeletonBoard, Spinner } from "./ReportParts";

type StaffRole = "designer" | "master_tailor";

const ROLES: StaffRole[] = ["designer", "master_tailor"];
const ROLE_LABEL: Record<StaffRole, string> = { designer: "Designers", master_tailor: "Master Tailors" };
const ROLE_ONE: Record<StaffRole, string> = { designer: "Designer", master_tailor: "Master Tailor" };
const ROLE_ICON: Record<StaffRole, IconName> = { designer: "palette", master_tailor: "scissors" };
// Beside the person list (lg+) the board is narrow, so two across until the screen is wide.
const BOARD_COLUMNS = "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 min-[1440px]:grid-cols-4";

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
 * The Staff report, loaded step by step (owner/manager only): pick a team ->
 * pick a person -> that person's month. Nothing loads until a team is chosen;
 * the person list is searched and paged by the API; a person's report loads
 * only for the month shown (the last 6 months, newest first), with the figures
 * and the weekly graph updating together. No all-staff / all-months
 * aggregation ever runs.
 *
 * Layout: from lg the list and the report sit side by side, so the owner can
 * go person to person; on phones and tablets it's one step at a time, with a
 * back button from the report to the list.
 */
export function StaffReportClient() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const months = useMemo(() => lastSixMonths(), []);
  const [month, setMonth] = useState(months[0]!.value);

  const [report, setReport] = useState<StaffReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function pickRole(r: StaffRole) {
    if (r === role) return;
    setRole(r);
    backToList();
  }
  function pickStaff(id: string) {
    if (id === staffId) return;
    setStaffId(id);
    setMonth(months[0]!.value);
    setReport(null);
    setReportError(null);
  }
  function backToList() {
    setStaffId(null);
    setReport(null);
    setReportError(null);
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

  const intro = (
    <SectionIntro
      id="staff-report-heading"
      title="Staff report"
      description="One designer's or master tailor's month: orders booked, completed, overdue and pending payment."
    />
  );

  // ---- Step 1: pick a team (nothing has loaded yet) ----
  if (!role) {
    return (
      <div className="flex flex-col gap-4">
        {intro}
        <Card accent>
          <CardHeader icon="bar-chart" iconTone="gold" title="Choose a team" subtitle="Then pick a person to see their month" />
          <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => pickRole(r)}
                className="group lift flex items-center gap-4 rounded-app-lg border border-border bg-card p-5 text-left hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-app-lg bg-primary-bg text-primary ring-1 ring-primary/10 ring-inset">
                  <Icon name={ROLE_ICON[r]} size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-lg text-text-primary">{ROLE_LABEL[r]}</span>
                  <span className="block text-xs text-text-muted">Each person&apos;s month: workload, completions and trends</span>
                </span>
                <Icon name="chevron-right" size={20} className="text-primary/40 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </CardBody>
        </Card>
      </div>
    );
  }

  const monthLabel = months.find((m) => m.value === month)?.label ?? month;

  return (
    <div className="flex flex-col gap-4">
      {intro}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        {/* The team's people -- on phones/tablets only until someone is picked. */}
        <Card className={`overflow-hidden ${staffId ? "hidden lg:block" : ""}`} regionLabel={`${ROLE_LABEL[role]} list`}>
          <div role="group" aria-label="Team" className="m-3 mb-0 grid grid-cols-2 rounded-app border border-border bg-app-bg/70 p-0.5">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === role}
                onClick={() => pickRole(r)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  r === role ? "bg-card text-primary shadow-app" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon name={ROLE_ICON[r]} size={14} />
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <StaffPicker key={role} role={role} roleLabel={ROLE_LABEL[role]} selectedId={staffId} onPick={pickStaff} />
        </Card>

        {/* The picked person's month. */}
        <div className={`min-w-0 ${staffId ? "" : "hidden lg:block"}`}>
          {!staffId ? (
            <div className="rounded-app-lg border border-dashed border-border bg-card/60">
              <EmptyState
                icon="bar-chart"
                title={`Pick a ${ROLE_ONE[role].toLowerCase()} to see their month`}
                hint="Orders booked, in production, completed and overdue, payments still owed, and a week-by-week graph."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={backToList}
                className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline lg:hidden"
              >
                <Icon name="chevron-right" size={15} className="rotate-180" />
                All {ROLE_LABEL[role].toLowerCase()}
              </button>

              {!report && reportError ? (
                <LoadError title="Couldn't load this report" message={reportError} onRetry={() => setReloadKey((k) => k + 1)} />
              ) : !report ? (
                <>
                  <div className="h-18 animate-pulse rounded-app-lg bg-card" aria-hidden />
                  <SkeletonBoard cells={8} columns={BOARD_COLUMNS} />
                  <div className="h-64 animate-pulse rounded-app-lg bg-card" aria-label="Loading" />
                </>
              ) : (
                <div className={`flex flex-col gap-4 transition-opacity ${reportLoading ? "opacity-60" : ""}`} aria-busy={reportLoading}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                      <span
                        aria-hidden
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-bg text-sm font-bold text-primary ring-1 ring-primary/10 ring-inset"
                      >
                        {initialsOf(report.staff.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-serif text-lg leading-snug text-text-primary">{report.staff.fullName}</h3>
                        <p className="text-xs text-text-muted">
                          {ROLE_ONE[report.staff.role] ?? ROLE_ONE[role]} · orders booked in {monthLabel}
                        </p>
                      </div>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        {reportLoading && <Spinner label="Loading the month" />}
                        <Select aria-label="Month" className="sm:w-48" value={month} onChange={(e) => setMonth(e.target.value)}>
                          {months.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </Card>

                  {reportError && (
                    <p role="alert" className="flex items-center justify-between gap-3 rounded-app border border-error/25 bg-error-bg/40 px-4 py-2 text-sm text-error">
                      <span>{reportError}</span>
                      <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">
                        Retry
                      </button>
                    </p>
                  )}

                  <FigureBoard
                    label={`${report.staff.fullName}, ${monthLabel}`}
                    columns={BOARD_COLUMNS}
                    figures={[
                      { key: "booked", icon: "package", label: "Booked", value: report.summary.booked },
                      { key: "active", icon: "hammer", label: "Active", value: report.summary.active },
                      { key: "production", icon: "needle", label: "In production", value: report.summary.inProduction },
                      { key: "completed", icon: "check-circle", label: "Completed", value: report.summary.completed, tone: "success" },
                      { key: "overdue", icon: "alert", label: "Overdue", value: report.summary.overdue, tone: report.summary.overdue > 0 ? "error" : "default" },
                      { key: "urgent", icon: "flame", label: "Urgent", value: report.summary.urgent, tone: report.summary.urgent > 0 ? "warning" : "default" },
                      {
                        key: "pending",
                        icon: "card",
                        label: "Payments pending",
                        value: report.summary.paymentPendingCount,
                        tone: report.summary.paymentPendingCount > 0 ? "error" : "default",
                      },
                      {
                        key: "amount",
                        icon: "wallet",
                        label: "Pending amount",
                        value: formatCurrency(report.summary.paymentPendingAmount),
                        tone: Number(report.summary.paymentPendingAmount) > 0 ? "error" : "default",
                      },
                    ]}
                  />

                  <Card>
                    <CardHeader icon={<Icon name="trending-up" size={17} />} title="Weekly throughput" subtitle={`Booked vs completed, week by week · ${monthLabel}`} />
                    <CardBody>
                      <WeeklyThroughputChart weekly={report.weekly} />
                    </CardBody>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
