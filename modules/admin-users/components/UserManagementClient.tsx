"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ROLE_LABELS, ROLES, type Role } from "../../../lib/domain";
import { usersApi, type StaffUser } from "../api/usersApi";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { useToast } from "../../../components/ui/Toast";

/** Roles that self-manage their own password once they've logged in at least once. */
function canRegeneratePassword(user: StaffUser): boolean {
  if (user.role === "designer" || user.role === "master_tailor") return true;
  return !user.lastLoginAt;
}

type RevealModal =
  | { kind: "password"; name: string; password: string }
  | { kind: "qr"; name: string; token: string; loginUrl: string };

export default function UserManagementClient() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("designer");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [reveal, setReveal] = useState<RevealModal | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);

  async function fetchUsers(): Promise<{ users: StaffUser[] } | { error: string }> {
    try {
      const data = await usersApi.list();
      return { users: data.users };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to load users" };
    }
  }

  /** Re-fetches on demand after a mutation (create/role-change/deactivate/password/QR). */
  async function loadUsers() {
    setLoading(true);
    const result = await fetchUsers();
    if ("error" in result) {
      setError(result.error);
    } else {
      setUsers(result.users);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchUsers();
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
      } else {
        setUsers(result.users);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const result = await usersApi.create({ fullName, email, role });
      setReveal({ kind: "password", name: fullName, password: result.password });
      setFullName("");
      setEmail("");
      setRole("designer");
      setCreateOpen(false);
      showToast(`Account created for ${fullName}.`, "success");
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setCreateError(message);
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id: string, nextRole: Role) {
    try {
      await usersApi.updateRole(id, nextRole);
      showToast("Role updated.", "success");
      await loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update role", "error");
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this account? They will immediately lose access, including any QR login.")) return;
    try {
      await usersApi.deactivate(id);
      showToast("Account deactivated.", "success");
      await loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to deactivate account", "error");
    }
  }

  async function handleGeneratePassword(user: StaffUser) {
    if (!confirm(`Generate a new password for ${user.fullName}? Their current password stops working immediately.`)) return;
    setRowActionError(null);
    try {
      const result = await usersApi.generatePassword(user.id);
      setReveal({ kind: "password", name: user.fullName, password: result.password });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate password";
      setRowActionError(message);
      showToast(message, "error");
    }
  }

  async function handleGenerateQr(user: StaffUser) {
    const verb = user.hasQrLogin ? "Regenerate" : "Generate";
    if (user.hasQrLogin && !confirm(`Regenerate ${user.fullName}'s QR code? The current one stops working immediately.`)) return;
    setRowActionError(null);
    try {
      const result = await usersApi.generateQrToken(user.id);
      setReveal({ kind: "qr", name: user.fullName, token: result.token, loginUrl: result.loginUrl });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${verb.toLowerCase()} QR code`;
      setRowActionError(message);
      showToast(message, "error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">User Management</h1>
          <p className="text-sm text-text-muted">Create staff accounts and manage roles. Owner/Manager only.</p>
        </div>
        <Button onClick={() => setCreateOpen((v) => !v)}>{createOpen ? "Cancel" : "+ Create account"}</Button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="mb-6 rounded-app-lg border border-border bg-card p-5 shadow-app">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel required>Full name</FieldLabel>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <FieldLabel required>Email</FieldLabel>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <FieldLabel required>Role</FieldLabel>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-app-sm border border-border bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            A password is generated automatically -- you&apos;ll see it once after creating the account, so make sure you&apos;re ready to note it down.
          </p>
          <FieldError>{createError}</FieldError>
          <Button type="submit" disabled={creating} className="mt-3">
            {creating ? "Creating…" : "Create account"}
          </Button>
        </form>
      )}

      <FieldError>{rowActionError}</FieldError>

      <div className="overflow-hidden rounded-app-lg border border-border bg-card shadow-app">
        {loading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-error">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">No staff accounts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-primary-bg/40 text-left text-xs text-text-muted uppercase">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Credentials</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-light last:border-0">
                  <td className="px-4 py-2.5 text-text-primary">{u.fullName}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      disabled={!u.active}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className="rounded-app-sm border border-border bg-card px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.active ? "bg-success-bg text-success" : "bg-gray-pill-bg text-text-secondary"
                      }`}
                    >
                      {u.active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      {u.active && canRegeneratePassword(u) && (
                        <button onClick={() => handleGeneratePassword(u)} className="text-left text-xs text-primary hover:underline">
                          Generate new password
                        </button>
                      )}
                      {u.active && u.role === "master_tailor" && (
                        <button onClick={() => handleGenerateQr(u)} className="text-left text-xs text-primary hover:underline">
                          {u.hasQrLogin ? "Regenerate QR login" : "Generate QR login"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.active && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-xs text-error hover:underline">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reveal && <RevealOverlay reveal={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

/**
 * Shown exactly once, right after a password/QR is generated -- neither
 * value can be retrieved again afterward (only the hash is stored server-side),
 * so this is the only chance to note it down or hand it to the account holder.
 */
function RevealOverlay({ reveal, onClose }: { reveal: RevealModal; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-app-lg border border-border bg-card p-6 text-center shadow-app-md"
        onClick={(e) => e.stopPropagation()}
      >
        {reveal.kind === "password" ? (
          <>
            <h2 className="font-serif text-lg font-bold text-text-primary">Password for {reveal.name}</h2>
            <p className="mt-1 text-xs text-text-muted">Shown once -- note it down now. It cannot be shown again after you close this.</p>
            <div className="mt-4 rounded-app-sm border border-border bg-primary-bg/40 px-4 py-3 font-mono text-base tracking-wide text-text-primary">
              {reveal.password}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif text-lg font-bold text-text-primary">QR login for {reveal.name}</h2>
            <p className="mt-1 text-xs text-text-muted">
              Shown once -- print or save this now. Scanning it logs {reveal.name} straight in. Regenerating replaces it immediately.
            </p>
            <div className="mt-4 flex justify-center rounded-app-sm border border-border bg-white p-4">
              <QRCodeSVG value={reveal.loginUrl} size={192} />
            </div>
            <p className="mt-3 break-all font-mono text-[10px] text-text-muted">{reveal.loginUrl}</p>
          </>
        )}
        <Button className="mt-5 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
