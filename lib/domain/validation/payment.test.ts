import { describe, expect, it } from "vitest";
import { createPaymentSchema, updatePaymentSchema } from "./payment";

describe("createPaymentSchema", () => {
  it("accepts a positive amount and a known method", () => {
    expect(createPaymentSchema.safeParse({ amount: 500, method: "cash" }).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(createPaymentSchema.safeParse({ amount: 0, method: "cash" }).success).toBe(false);
    expect(createPaymentSchema.safeParse({ amount: -50, method: "cash" }).success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    expect(createPaymentSchema.safeParse({ amount: 500, method: "bitcoin" }).success).toBe(false);
  });

  it("normalises a numeric string amount to a 2dp money string", () => {
    const result = createPaymentSchema.safeParse({ amount: "500", method: "upi" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe("500.00");
  });
});

describe("updatePaymentSchema", () => {
  it("accepts a partial update", () => {
    expect(updatePaymentSchema.safeParse({ amount: 100 }).success).toBe(true);
  });
});
