import { redirect } from "next/navigation";

/** The Staff Report moved to the Reports page -- kept so old links and bookmarks still work. */
export default function OldStaffReportPage() {
  redirect("/reports?view=staff");
}
