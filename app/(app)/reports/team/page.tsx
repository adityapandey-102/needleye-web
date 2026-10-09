import { redirect } from "next/navigation";

/**
 * Team status is now a section of the one Reports page -- this address is kept so
 * old links and bookmarks still land on it. (/reports checks access.)
 */
export default function OldTeamReportPage() {
  redirect("/reports?view=team");
}
