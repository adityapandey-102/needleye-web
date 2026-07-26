import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats a positive amount as INR with no decimals", () => {
    expect(formatCurrency(500)).toBe("₹500");
  });

  it("treats null/undefined as zero", () => {
    expect(formatCurrency(null)).toBe("₹0");
    expect(formatCurrency(undefined)).toBe("₹0");
  });

  it("uses Indian digit grouping for large amounts", () => {
    expect(formatCurrency(1234567)).toBe("₹12,34,567");
  });
});
