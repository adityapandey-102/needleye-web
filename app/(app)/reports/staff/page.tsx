import { redirect } from "next/navigation";

/**
 * Staff report is now a section of the one Reports page -- this address is kept so
 * old links and bookmarks still land on it. (/reports checks access.)
 */
export default function OldStaffReportPage() {
  redirect("/reports?view=staff");
}
