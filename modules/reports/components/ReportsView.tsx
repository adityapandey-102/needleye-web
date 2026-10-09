"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { parseReportView, REPORT_VIEWS, type ReportView } from "../../../lib/domain/utils/reports";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { SkeletonBoard, SkeletonRows } from "./ReportParts";

/** While a section's code downloads (the first time it's opened). */
function SectionLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-12 w-64 max-w-full animate-pulse rounded-app bg-card" />
      <SkeletonBoard cells={4} columns="grid-cols-2 lg:grid-cols-4" />
      <SkeletonRows rows={5} />
    </div>
  );
}

// Each section is its own chunk and only mounts while its tab is open, so a
// report's code AND its data load when it's opened -- never for a tab the
// owner doesn't look at.
const TeamStatusCard = dynamic(() => import("./TeamStatusCard").then((m) => m.TeamStatusCard), { loading: SectionLoading });
const StaffReportClient = dynamic(() => import("./StaffReportClient").then((m) => m.StaffReportClient), { loading: SectionLoading });
const ActivityFeedCard = dynamic(() => import("./ActivityFeedCard").then((m) => m.ActivityFeedCard), { loading: SectionLoading });

const TABS: Record<ReportView, { label: string; icon: IconName; description: string }> = {
  team: { label: "Team status", icon: "users", description: "Who is working and who is idle" },
  staff: { label: "Staff report", icon: "bar-chart", description: "One person's month, week by week" },
  activity: { label: "Daily activity", icon: "history", description: "What everyone did, day by day" },
};

/**
 * The Reports page's three sections behind one tab bar. The open section lives
 * in the URL (`?view=team|staff|activity`) so a link or the Back button lands
 * on the same report. Switching uses the browser's own history (Next keeps
 * `useSearchParams` in step), so it doesn't round-trip to the server.
 *
 * Keyboard: the tab bar is one Tab stop; arrow keys, Home and End move between
 * tabs, and Enter or Space opens one. Opening is deliberate (not on arrow)
 * because opening a report loads it.
 */
export function ReportsView() {
  const params = useSearchParams();
  const view = parseReportView(params.get("view"));
  const tabRefs = useRef<Record<ReportView, HTMLButtonElement | null>>({ team: null, staff: null, activity: null });

  function open(next: ReportView) {
    if (next === view) return;
    window.history.pushState(null, "", `/reports?view=${next}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = REPORT_VIEWS.findIndex((v) => tabRefs.current[v] === document.activeElement);
    if (current < 0) return;
    const last = REPORT_VIEWS.length - 1;
    const target =
      e.key === "ArrowRight" ? (current === last ? 0 : current + 1)
      : e.key === "ArrowLeft" ? (current === 0 ? last : current - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    tabRefs.current[REPORT_VIEWS[target]!]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Reports"
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-1 rounded-app-lg border border-border bg-app-bg/80 p-1 shadow-app"
      >
        {REPORT_VIEWS.map((v) => {
          const tab = TABS[v];
          const selected = v === view;
          return (
            <button
              key={v}
              ref={(el) => {
                tabRefs.current[v] = el;
              }}
              type="button"
              role="tab"
              id={`reports-tab-${v}`}
              aria-selected={selected}
              aria-controls={`reports-panel-${v}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(v)}
              className={`group relative flex min-w-0 flex-col items-center gap-1.5 rounded-app px-2 py-2.5 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left ${
                selected ? "bg-card text-primary shadow-app-md ring-1 ring-primary/15" : "text-text-secondary hover:bg-card/60 hover:text-text-primary"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-app ring-1 ring-inset transition-colors sm:h-10 sm:w-10 ${
                  selected ? "gradient-primary text-white ring-primary/20" : "bg-card text-primary/70 ring-border-light group-hover:text-primary"
                }`}
              >
                <Icon name={tab.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-tight font-semibold sm:text-sm">{tab.label}</span>
                <span className="hidden truncate text-xs font-normal text-text-muted lg:block">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`reports-panel-${view}`} aria-labelledby={`reports-tab-${view}`}>
        {view === "team" ? <TeamStatusCard /> : view === "staff" ? <StaffReportClient /> : <ActivityFeedCard />}
      </div>
    </div>
  );
}
