import type { Role } from "../../../lib/domain";
import { apiFetch } from "../../../lib/api/client";

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface InviteUserPayload {
  fullName: string;
  email: string;
  role: Role;
}

/** All HTTP calls the Admin Users module makes against needleye-api, in one place -- components never call apiFetch directly. */
export const usersApi = {
  list(): Promise<{ users: StaffUser[] }> {
    return apiFetch("/users");
  },

  invite(payload: InviteUserPayload): Promise<{ userId?: string }> {
    return apiFetch("/users/invite", { method: "POST", body: JSON.stringify(payload) });
  },

  updateRole(id: string, role: Role): Promise<null> {
    return apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
  },

  deactivate(id: string): Promise<null> {
    return apiFetch(`/users/${id}/deactivate`, { method: "POST" });
  },
};
