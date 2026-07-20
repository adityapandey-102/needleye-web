"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, ROLES, type Role } from "../../../lib/domain";
import { usersApi, type StaffUser } from "../api/usersApi";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";

export default function UserManagementClient() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("designer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

async function fetchUsers(): Promise<{ users: StaffUser[] } | { error: string }> {
    try {
      const data = await usersApi.list();
      return { users: data.users };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to load users" };
    }
  }

  /** Re-fetches on demand after a mutation (invite/role-change/deactivate). */
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);
    try {
      await usersApi.invite({ fullName, email, role });
      setFullName("");
      setEmail("");
      setRole("designer");
      setInviteOpen(false);
      await loadUsers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(id: string, nextRole: Role) {
    await usersApi.updateRole(id, nextRole);
    await loadUsers();
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this account? They will immediately lose access.")) return;
    await usersApi.deactivate(id);
    await loadUsers();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-text-primary">User Management</h1>
          <p className="text-sm text-text-muted">Invite staff and manage roles. Owner/Manager only.</p>
        </div>
        <Button onClick={() => setInviteOpen((v) => !v)}>{inviteOpen ? "Cancel" : "+ Invite staff"}</Button>
      </div>

      {inviteOpen && (
        <form
          onSubmit={handleInvite}
          className="mb-6 rounded-app-lg border border-border bg-card p-5 shadow-app"
        >
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
          <FieldError>{inviteError}</FieldError>
          <Button type="submit" disabled={inviting} className="mt-4">
            {inviting ? "Sending invite…" : "Send invite"}
          </Button>
        </form>
      )}

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
                    {u.active && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="text-xs text-error hover:underline"
                      >
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
    </div>
  );
}
