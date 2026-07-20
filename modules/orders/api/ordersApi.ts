import type { CreateOrderInput, Order, UpdateOrderInput } from "../../../lib/domain";
import { apiFetch, apiUpload } from "../../../lib/api/client";

export interface OrderListFilters {
  search?: string;
  designerId?: string;
  masterTailorId?: string;
  status?: string;
}

/** All HTTP calls the Orders feature makes, in one place -- components never call apiFetch directly. */
export const ordersApi = {
  list(filters: OrderListFilters = {}): Promise<{ orders: Order[] }> {
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.designerId) query.set("designerId", filters.designerId);
    if (filters.masterTailorId) query.set("masterTailorId", filters.masterTailorId);
    if (filters.status) query.set("status", filters.status);
    return apiFetch(`/orders?${query.toString()}`);
  },

  create(input: CreateOrderInput): Promise<{ order: Order }> {
    return apiFetch("/orders", { method: "POST", body: JSON.stringify(input) });
  },

  update(orderId: string, input: Partial<UpdateOrderInput>): Promise<{ order: Order }> {
    return apiFetch(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(input) });
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
