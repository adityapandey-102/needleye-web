import { requireReportsAccess } from "../../../../modules/reports/requireReportsAccess";
import { ReportPageHeader } from "../../../../modules/reports/components/ReportPageHeader";
import { StaffReportClient } from "../../../../modules/reports/components/StaffReportClient";

/**
 * Owner-only staff report: role -> person (searched and paged) -> that
 * person's month. Moved here from /orders/staff-report, which now redirects.
 */
export default async function StaffReportPage() {
  await requireReportsAccess();
  return (
    <div>
      <ReportPageHeader title="Staff report" description="Each designer's and master tailor's month, one person at a time." />
      <StaffReportClient />
    </div>
  );
}
