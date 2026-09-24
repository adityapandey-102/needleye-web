import { redirect } from "next/navigation";

/** The Staff Report moved to /reports/staff -- kept so old links and bookmarks still work. */
export default function OldStaffReportPage() {
  redirect("/reports/staff");
}
