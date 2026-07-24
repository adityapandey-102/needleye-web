import type { CreatePaymentInput, Payment, UpdatePaymentInput } from "../../../lib/domain";
import { apiFetch } from "../../../lib/api/client";

/** All HTTP calls the Payments module makes against needleye-api, in one place -- components never call apiFetch directly. */
export const paymentsApi = {
  list(orderId: string): Promise<{ payments: Payment[] }> {
    return apiFetch(`/orders/${orderId}/payments`);
  },

  add(orderId: string, input: CreatePaymentInput): Promise<{ payment: Payment }> {
    return apiFetch(`/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify(input) });
  },

  update(orderId: string, paymentId: string, input: Partial<UpdatePaymentInput>): Promise<{ payment: Payment }> {
    return apiFetch(`/orders/${orderId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  remove(orderId: string, paymentId: string): Promise<null> {
    return apiFetch(`/orders/${orderId}/payments/${paymentId}`, { method: "DELETE" });
  },
};
