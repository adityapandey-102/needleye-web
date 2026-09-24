import { describe, expect, it } from "vitest";
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from "./order";

const validOrder = {
  customerName: "Priya Sharma",
  phone: "9876543210",
  billNumber: "BILL-2024-001",
  dueDate: "2026-12-01",
  designerId: "11111111-1111-1111-1111-111111111111",
  masterTailorId: "22222222-2222-2222-2222-222222222222",
  productCategory: "saree",
  orderDetails: "Silk saree with custom blouse",
  productionStatus: "design_pending",
};

describe("createOrderSchema", () => {
  it("accepts a fully valid order", () => {
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rejects a phone number that isn't exactly 10 digits", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID designerId", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, designerId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown productCategory", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, productCategory: "not-a-category" });
    expect(result.success).toBe(false);
  });

  it("accepts the new catalogue categories (incl. prefixed mens/kids values)", () => {
    for (const productCategory of ["anarkali", "mens_shirt", "kids_girls_custom", "petticoat"]) {
      expect(createOrderSchema.safeParse({ ...validOrder, productCategory }).success).toBe(true);
    }
  });

  it("requires customerName, dueDate, and orderDetails", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, customerName: "" });
    expect(result.success).toBe(false);
  });

  it("defaults handWork/machineWork/purchaseRequired/totalAmount when omitted", () => {
    const result = createOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.handWork).toBe(false);
      expect(result.data.machineWork).toBe(false);
      expect(result.data.purchaseRequired).toBe(false);
      expect(result.data.totalAmount).toBe("0.00");
    }
  });

  it("accepts a nextPaymentDate, or null/omitted (payment-due tracking)", () => {
    expect(createOrderSchema.safeParse({ ...validOrder, nextPaymentDate: "2026-08-15" }).success).toBe(true);
    expect(createOrderSchema.safeParse({ ...validOrder, nextPaymentDate: null }).success).toBe(true);
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rejects an empty-string nextPaymentDate (use null to clear it)", () => {
    expect(createOrderSchema.safeParse({ ...validOrder, nextPaymentDate: "" }).success).toBe(false);
  });
});

describe("updateOrderSchema", () => {
  it("accepts a partial update with a single field", () => {
    expect(updateOrderSchema.safeParse({ customerName: "New Name" }).success).toBe(true);
  });

  it("still rejects an invalid value for a field that is present", () => {
    expect(updateOrderSchema.safeParse({ phone: "not-10-digits" }).success).toBe(false);
  });
});

describe("updateOrderStatusSchema", () => {
  it("accepts a known granular status", () => {
    expect(updateOrderStatusSchema.safeParse({ productionStatus: "cutting" }).success).toBe(true);
  });

  it("rejects an unknown status value", () => {
    expect(updateOrderStatusSchema.safeParse({ productionStatus: "not_a_status" }).success).toBe(false);
  });
});
