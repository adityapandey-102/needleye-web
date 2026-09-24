import { requireReportsAccess } from "../../../../modules/reports/requireReportsAccess";
import { ReportPageHeader } from "../../../../modules/reports/components/ReportPageHeader";
import { TeamStatusCard } from "../../../../modules/reports/components/TeamStatusCard";

/** Owner-only: who is Working vs Idle (searched and paged by the API). */
export default async function TeamStatusPage() {
  await requireReportsAccess();
  return (
    <div>
      <ReportPageHeader title="Team status" description="Who is working and who is idle right now." />
      <TeamStatusCard />
    </div>
  );
}
