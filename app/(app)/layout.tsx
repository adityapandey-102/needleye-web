import { redirect } from "next/navigation";
import type { Profile } from "../../lib/shared/domain";
import { apiFetchServer } from "../../lib/api/server";
import { AppShell } from "../../components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: Profile;
  try {
    const data = await apiFetchServer("/auth/me");
    profile = data.profile;
  } catch {
    redirect("/login");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
