import type {
  CreateOrderInput,
  GranularStatus,
  Order,
  OrderStats,
  OrderStatusHistoryEntry,
  RevenueReport,
  UpdateOrderInput,
} from "../../../lib/domain";
import { apiFetch, apiUpload } from "../../../lib/api/client";

export interface OrderListFilters {
  search?: string;
  designerId?: string;
  masterTailorId?: string;
  status?: string;
  /** Dashboard filter a summary card links to (active, production, completed, overdue, urgent, pending_payment, this_month, ...). */
  bucket?: string;
  limit?: number;
  offset?: number;
}

/** The paginated envelope GET /orders returns -- `total` is the full count matching the filters, for the pager. */
export interface OrderListResult {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

/** All HTTP calls the Orders feature makes, in one place -- components never call apiFetch directly. */
export const ordersApi = {
  list(filters: OrderListFilters = {}): Promise<OrderListResult> {
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.designerId) query.set("designerId", filters.designerId);
    if (filters.masterTailorId) query.set("masterTailorId", filters.masterTailorId);
    if (filters.status) query.set("status", filters.status);
    if (filters.bucket) query.set("bucket", filters.bucket);
    if (filters.limit !== undefined) query.set("limit", String(filters.limit));
    if (filters.offset !== undefined) query.set("offset", String(filters.offset));
    return apiFetch(`/orders?${query.toString()}`);
  },

  /** Fetch a single order (row-scoped by the API). Used by self-fetching components that need authoritative, always-fresh order fields. */
  get(orderId: string): Promise<{ order: Order }> {
    return apiFetch(`/orders/${orderId}`);
  },

  create(input: CreateOrderInput): Promise<{ order: Order }> {
    return apiFetch("/orders", { method: "POST", body: JSON.stringify(input) });
  },

  update(orderId: string, input: Partial<UpdateOrderInput>): Promise<{ order: Order }> {
    return apiFetch(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  updateStatus(orderId: string, status: GranularStatus): Promise<{ order: Order }> {
    return apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  history(orderId: string): Promise<{ history: OrderStatusHistoryEntry[] }> {
    return apiFetch(`/orders/${orderId}/history`);
  },

  stats(): Promise<OrderStats> {
    return apiFetch("/orders/stats");
  },

  /** Monthly revenue report over an inclusive [from, to] window -- owner_manager / accountant only (reports:financial). */
  revenue(from: string, to: string): Promise<RevenueReport> {
    const query = new URLSearchParams({ from, to });
    return apiFetch(`/orders/revenue?${query.toString()}`);
  },

  uploadImage(orderId: string, slot: number, file: File): Promise<{ storagePath: string; url: string }> {
    const formData = new FormData();
    formData.append("slot", String(slot));
    formData.append("file", file);
    return apiUpload(`/orders/${orderId}/images`, formData);
  },

  deleteImage(orderId: string, slot: number): Promise<null> {
    return apiFetch(`/orders/${orderId}/images/${slot}`, { method: "DELETE" });
  },
};
