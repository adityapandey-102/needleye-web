import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "../constants/productCategories";

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(PAYMENT_METHOD_VALUES),
  paidAt: z.string().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
  // When an outstanding balance remains, the date the next payment is expected
  // (reschedules the order's due tracking); null clears it, omitted leaves it.
  nextPaymentDate: z.string().min(1).nullable().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = createPaymentSchema.partial();

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
