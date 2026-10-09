import { redirect } from "next/navigation";

/**
 * Daily activity is now a section of the one Reports page -- this address is kept so
 * old links and bookmarks still land on it. (/reports checks access.)
 */
export default function OldActivityReportPage() {
  redirect("/reports?view=activity");
}
