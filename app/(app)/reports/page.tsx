import { requireReportsAccess } from "../../../modules/reports/requireReportsAccess";
import { ReportsView } from "../../../modules/reports/components/ReportsView";

/**
 * Owner-only (reports:staff) Reports: one page, three sections -- Team status,
 * Staff report, Daily activity -- behind a tab bar, the open one in the URL
 * (`?view=team|staff|activity`, Team status by default). Only the open
 * section is mounted, so each report loads (code and data) when it's opened,
 * and nothing loads for a tab that is never opened.
 */
export default async function ReportsPage() {
  await requireReportsAccess();

  return (
    <div>
      <div className="mb-5">
        <h1 className="page-title">Reports</h1>
        <p className="text-sm text-text-muted">Your team at a glance. Each report loads when you open it.</p>
      </div>
      <ReportsView />
    </div>
  );
}
