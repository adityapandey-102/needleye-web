import { requireReportsAccess } from "../../../../modules/reports/requireReportsAccess";
import { ReportPageHeader } from "../../../../modules/reports/components/ReportPageHeader";
import { ActivityFeedCard } from "../../../../modules/reports/components/ActivityFeedCard";

/** Owner-only: the last 7 days of activity, each day loaded when opened. */
export default async function DailyActivityPage() {
  await requireReportsAccess();
  return (
    <div>
      <ReportPageHeader title="Daily activity" description="What everyone did on each of the last 7 days." />
      <ActivityFeedCard />
    </div>
  );
}
