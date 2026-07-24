import type { Role } from "../../../lib/domain";
import { apiFetch } from "../../../lib/api/client";

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  hasQrLogin: boolean;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  role: Role;
}

/** All HTTP calls the Admin Users module makes against needleye-api, in one place -- components never call apiFetch directly. */
export const usersApi = {
  list(): Promise<{ users: StaffUser[] }> {
    return apiFetch("/users");
  },

  /** Creates the account directly with a generated password -- no invite email. The password is returned once. */
  create(payload: CreateUserPayload): Promise<{ userId: string; password: string }> {
    return apiFetch("/users", { method: "POST", body: JSON.stringify(payload) });
  },

  /** Regenerates the account's password. Returned once -- the caller must communicate it to the account holder directly. */
  generatePassword(id: string): Promise<{ password: string }> {
    return apiFetch(`/users/${id}/generate-password`, { method: "POST" });
  },

  /** Master Tailor only. Regenerating invalidates any previously-issued QR immediately. Returned once. */
  generateQrToken(id: string): Promise<{ token: string; loginUrl: string }> {
    return apiFetch(`/users/${id}/qr-token`, { method: "POST" });
  },

  updateRole(id: string, role: Role): Promise<null> {
    return apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
  },

  deactivate(id: string): Promise<null> {
    return apiFetch(`/users/${id}/deactivate`, { method: "POST" });
  },
};
