import { redirect } from "next/navigation";
import { apiFetchServer } from "../../../../lib/api/server";
import UserManagementClient from "../../../../modules/admin-users/components/UserManagementClient";

export default async function UserManagementPage() {
  const { profile } = await apiFetchServer("/auth/me");

  if (profile.role !== "owner_manager") {
    redirect("/orders");
  }

  return <UserManagementClient />;
}
