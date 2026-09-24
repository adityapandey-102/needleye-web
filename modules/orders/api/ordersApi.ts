import type {
  CreateOrderInput,
  DeliveryLoad,
  GranularStatus,
  LedgerEventsResult,
  Order,
  OrderStats,
  OrderStatusHistoryEntry,
  RevenueReport,
  StaffReport,
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

  /**
   * Orders due per day in [from, to] (inclusive, at most 200 days), shop-wide,
   * with the capacity thresholds. `excludeOrderId` leaves the order being edited
   * out, so it doesn't count against its own day. Owner / designer / PM only.
   */
  deliveryLoad(from: string, to: string, excludeOrderId?: string): Promise<DeliveryLoad> {
    const query = new URLSearchParams({ from, to });
    if (excludeOrderId) query.set("excludeOrderId", excludeOrderId);
    return apiFetch(`/orders/delivery-load?${query.toString()}`);
  },

  /** Monthly revenue report over an inclusive [from, to] window -- owner_manager / accountant only (reports:financial). */
  revenue(from: string, to: string): Promise<RevenueReport> {
    const query = new URLSearchParams({ from, to });
    return apiFetch(`/orders/revenue?${query.toString()}`);
  },

  /** One staff member's workload report for a month (YYYY-MM, default current) -- owner_manager only (reports:staff). */
  staffReport(staffId: string, month?: string): Promise<StaffReport> {
    const query = new URLSearchParams({ staffId });
    if (month) query.set("month", month);
    return apiFetch(`/orders/staff-report?${query.toString()}`);
  },

  /** Paginated payment-ledger activity feed over an inclusive [from, to] window -- owner_manager / accountant only (reports:financial). */
  ledgerEvents(params: { from: string; to: string; limit: number; offset: number }): Promise<LedgerEventsResult> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      limit: String(params.limit),
      offset: String(params.offset),
    });
    return apiFetch(`/orders/ledger-events?${query.toString()}`);
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
