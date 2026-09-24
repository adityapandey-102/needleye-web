import type { ActivityDay, ActivityDays, StaffActivity, TrackedStaffRole } from "../../../lib/domain";

export interface StaffActivityFilters {
  q?: string;
  role?: TrackedStaffRole;
  status?: "working" | "idle";
  limit: number;
  offset: number;
}
import { apiFetch } from "../../../lib/api/client";

/** Every HTTP call the Reports module makes -- owner_manager only (reports:staff). */
export const reportsApi = {
  /**
   * One page of Working / Idle staff (designers, master tailors, production
   * managers, workers), searched and filtered by the API. Also the Staff
   * Report's person picker (role = designer / master_tailor). Max 50 a page.
   */
  staffActivity(filters: StaffActivityFilters): Promise<StaffActivity> {
    const query = new URLSearchParams({ limit: String(filters.limit), offset: String(filters.offset) });
    if (filters.q) query.set("q", filters.q);
    if (filters.role) query.set("role", filters.role);
    if (filters.status) query.set("status", filters.status);
    return apiFetch(`/reports/staff-activity?${query.toString()}`);
  },

  /** The 7 days the activity feed covers -- no events; each day is loaded on demand. */
  activityDays(): Promise<ActivityDays> {
    return apiFetch("/reports/activity-days");
  },

  /** One page of one day's activity (payment events excluded). */
  activity(day: string, offset = 0, limit = 50): Promise<ActivityDay> {
    const query = new URLSearchParams({ day, offset: String(offset), limit: String(limit) });
    return apiFetch(`/reports/activity?${query.toString()}`);
  },
};
