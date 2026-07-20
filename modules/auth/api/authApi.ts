import { apiFetch } from "../../../lib/api/client";

export interface BootstrapPayload {
  email: string;
  password: string;
  fullName: string;
}

/** All HTTP calls the Auth module makes against needleye-api, in one place -- components never call apiFetch directly. */
export const authApi = {
  bootstrapStatus(): Promise<{ ownerExists: boolean }> {
    return apiFetch("/auth/bootstrap-status");
  },

  bootstrap(payload: BootstrapPayload): Promise<{ ok: true }> {
    return apiFetch("/auth/bootstrap", { method: "POST", body: JSON.stringify(payload) });
  },
};
