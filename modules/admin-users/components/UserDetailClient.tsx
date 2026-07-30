"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, ROLE_LABELS, ROLES, type Role } from "../../../lib/domain";
import { usersApi, type StaffUser } from "../api/usersApi";
import { Button } from "../../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { useToast } from "../../../components/ui/Toast";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { CredentialRevealOverlay, type RevealModal } from "./CredentialRevealOverlay";

/** Roles that self-manage their own password once they've logged in at least once. */
function canRegeneratePassword(user: StaffUser): boolean {
  if (user.role === "designer" || user.role === "master_tailor") return true;
  return !user.lastLoginAt;
}

export function UserDetailClient({ initialUser, currentUserId }: { initialUser: StaffUser; currentUserId: string }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [user, setUser] = useState<StaffUser>(initialUser);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<RevealModal | null>(null);

  const isSelf = user.id === currentUserId;

  /** Re-pull the account after a mutation so status/QR/role badges stay accurate. */
  async function refresh() {
    try {
      const { user: fresh } = await usersApi.get(user.id);
      setUser(fresh);
    } catch {
      // Non-fatal: the mutation already succeeded; a manual reload will resync.
    }
  }

  async function handleRoleChange(nextRole: Role) {
    setBusy(true);
    try {
      await usersApi.updateRole(user.id, nextRole);
      showToast("Role updated.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update role", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGeneratePassword() {
    const ok = await confirm({
      title: `Generate a new password for ${user.fullName}?`,
      body: "Their current password stops working immediately.",
      confirmLabel: "Generate",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await usersApi.generatePassword(user.id);
      setReveal({ kind: "password", name: user.fullName, password: result.password });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate password", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateQr() {
    if (user.hasQrLogin) {
      const ok = await confirm({
        title: `Regenerate ${user.fullName}'s QR code?`,
        body: "The current one stops working immediately.",
        confirmLabel: "Regenerate",
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const result = await usersApi.generateQrToken(user.id);
      setReveal({
        kind: "qr",
        name: user.fullName,
        roleLabel: ROLE_LABELS[user.role],
        token: result.token,
        loginUrl: result.loginUrl,
      });
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate QR login", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    const ok = await confirm({
      title: "Deactivate this account?",
      body: "They will immediately lose access, including any QR login.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await usersApi.deactivate(user.id);
      showToast("Account deactivated.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to deactivate account", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    setBusy(true);
    try {
      await usersApi.reactivate(user.id);
      showToast("Account reactivated.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reactivate account", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">{user.fullName}</h1>
          <p className="text-sm text-text-muted">{ROLE_LABELS[user.role]} · {user.email}</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">← All Users</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon="👤" iconTone="purple" title="Account Info" subtitle="Identity and activity" />
          <CardBody className="flex flex-col gap-2.5">
            <InfoRow label="Full name" value={user.fullName} />
            <InfoRow label="Email" value={user.email} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Status</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  user.active ? "bg-success-bg text-success" : "bg-gray-pill-bg text-text-secondary"
                }`}
              >
                {user.active ? "Active" : "Deactivated"}
              </span>
            </div>
            <InfoRow label="Created" value={formatDate(user.createdAt)} />
            <InfoRow label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"} />
            <InfoRow label="QR login" value={user.hasQrLogin ? "Enabled" : "Not set"} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon="🛠️" iconTone="amber" title="Account Actions" subtitle="Role, credentials, and access" />
          <CardBody className="flex flex-col gap-4">
            <div>
              <div className="mb-1 text-xs text-text-muted">Role</div>
              <select
                value={user.role}
                disabled={!user.active || busy}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="w-full rounded-app-sm border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {user.active ? (
              <div className="flex flex-col gap-2">
                {canRegeneratePassword(user) && (
                  <Button variant="outline" disabled={busy} onClick={handleGeneratePassword}>
                    🔑 Generate new password
                  </Button>
                )}
                {user.role === "master_tailor" && (
                  <Button variant="outline" disabled={busy} onClick={handleGenerateQr}>
                    {user.hasQrLogin ? "🔄 Regenerate QR login" : "📱 Generate QR login"}
                  </Button>
                )}
                <Button
                  variant="danger"
                  disabled={busy || isSelf}
                  onClick={handleDeactivate}
                  title={isSelf ? "You cannot deactivate your own account" : undefined}
                >
                  🚫 Deactivate account
                </Button>
                {isSelf && <p className="text-[11px] text-text-muted">You cannot deactivate your own account.</p>}
              </div>
            ) : (
              <Button disabled={busy} onClick={handleReactivate}>
                ✅ Reactivate account
              </Button>
            )}
          </CardBody>
        </Card>
      </div>

      {reveal && <CredentialRevealOverlay reveal={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
