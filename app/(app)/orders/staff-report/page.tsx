import Link from "next/link";
import { redirect } from "next/navigation";
import { hasCapability } from "../../../../lib/domain";
import { apiFetchServer } from "../../../../lib/api/server";
import { Button } from "../../../../components/ui/Button";
import { StaffReportClient } from "../../../../modules/orders/components/StaffReportClient";

/**
 * Staff weekly-performance report -- Owner/Manager only (reports:staff). Drills
 * down role -> person -> that person's report (computed on demand, one at a time).
 */
export default async function StaffReportPage() {
  const { profile } = await apiFetchServer("/auth/me");
  if (!hasCapability(profile.role, "reports:staff")) {
    redirect("/orders");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">Staff Weekly Report</h1>
          <p className="text-sm text-text-muted">Per designer &amp; master tailor — this week&rsquo;s workload and 6-month trends.</p>
        </div>
        <Link href="/orders">
          <Button variant="outline">← All Orders</Button>
        </Link>
      </div>
      <StaffReportClient />
    </div>
  );
}
