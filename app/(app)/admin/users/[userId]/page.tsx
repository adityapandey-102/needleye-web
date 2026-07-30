import { notFound, redirect } from "next/navigation";
import { apiFetchServer, ApiError } from "../../../../../lib/api/server";
import { UserDetailClient } from "../../../../../modules/admin-users/components/UserDetailClient";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const [{ profile }, userResult] = await Promise.all([
    apiFetchServer("/auth/me"),
    apiFetchServer(`/users/${userId}`).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
  ]);

  if (profile.role !== "owner_manager") {
    redirect("/orders");
  }

  return <UserDetailClient initialUser={userResult.user} currentUserId={profile.id} />;
}
