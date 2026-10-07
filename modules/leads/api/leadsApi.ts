import { apiFetch } from "../../../lib/api/client";
import type {
  DesignerChoice,
  DesignerStatsPage,
  Lead,
  LeadComment,
  LeadDetail,
  LeadListResult,
  LeadSource,
  LeadStatus,
  LeadSummary,
} from "../../../lib/domain";

export interface LeadFilters {
  status?: LeadStatus | "open";
  urgent?: boolean;
  q?: string;
  assignedTo?: string;
  limit: number;
  offset: number;
}

/** Every signed-in HTTP call the Leads module makes (owner: all leads; designer: their own). */
export const leadsApi = {
  list(filters: LeadFilters): Promise<LeadListResult> {
    const query = new URLSearchParams({ limit: String(filters.limit), offset: String(filters.offset) });
    if (filters.status) query.set("status", filters.status);
    if (filters.urgent) query.set("urgent", "true");
    if (filters.q) query.set("q", filters.q);
    if (filters.assignedTo) query.set("assignedTo", filters.assignedTo);
    return apiFetch(`/leads?${query.toString()}`);
  },

  summary(): Promise<LeadSummary> {
    return apiFetch("/leads/summary");
  },

  /** Owner: the Designers table -- name search (debounced by the caller) and a page; never the whole team. */
  designers(params: { q?: string; limit: number; offset: number }): Promise<DesignerStatsPage> {
    const query = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.q) query.set("q", params.q);
    return apiFetch(`/leads/designers?${query.toString()}`);
  },

  /** A designer type-ahead: up to `limit` active designers whose name contains `q`. */
  async searchDesigners(q: string, limit = 8): Promise<DesignerChoice[]> {
    const query = new URLSearchParams({ role: "designer", limit: String(limit) });
    if (q) query.set("q", q);
    const res = (await apiFetch(`/team-members?${query.toString()}`)) as { members: DesignerChoice[] };
    return res.members;
  },

  /** The red badge count -- see LeadsBadgeProvider for when it's refreshed. */
  badge(): Promise<{ count: number }> {
    return apiFetch("/leads/badge");
  },

  detail(id: string): Promise<LeadDetail> {
    return apiFetch(`/leads/${id}`);
  },

  create(body: { customerName: string; phone: string; requirement: string; source: Exclude<LeadSource, "public_form">; assignTo: string | null }): Promise<{ lead: Lead }> {
    return apiFetch("/leads", { method: "POST", body: JSON.stringify(body) });
  },

  assign(id: string, designerId: string, version: number): Promise<{ lead: Lead }> {
    return apiFetch(`/leads/${id}/assign`, { method: "PATCH", body: JSON.stringify({ designerId, version }) });
  },

  changeStatus(id: string, body: { status: LeadStatus; followUpOn?: string | null; lostReason?: string | null; version: number }): Promise<{ lead: Lead }> {
    return apiFetch(`/leads/${id}/status`, { method: "PATCH", body: JSON.stringify(body) });
  },

  addComment(id: string, body: string): Promise<{ comment: LeadComment }> {
    return apiFetch(`/leads/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  },
};
