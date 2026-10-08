import { describe, expect, it } from "vitest";
import { belowCollectedMessage, PRICE_CHANGE_LABEL, validatePriceChange } from "./priceChange";

describe("validatePriceChange -- set (the first price)", () => {
  it("accepts a plain rupee total with no reason", () => {
    expect(validatePriceChange("set", "25000", "", null, "0.00")).toBeNull();
    expect(validatePriceChange("set", "0", "", null, "0.00")).toBeNull();
  });

  it("refuses something that isn't a rupee amount", () => {
    expect(validatePriceChange("set", "25,000", "", null, "0.00")).toMatch(/Enter the total/);
    expect(validatePriceChange("set", "12.345", "", null, "0.00")).toMatch(/Enter the total/);
  });
});

describe("validatePriceChange -- correction (any later change)", () => {
  it("allows going up or down with a reason", () => {
    expect(validatePriceChange("correction", "30000", "extra embroidery", "25000.00", "5000.00")).toBeNull();
    expect(validatePriceChange("correction", "20000", "price was typed wrong", "25000.00", "5000.00")).toBeNull();
  });

  it("refuses the same total", () => {
    expect(validatePriceChange("correction", "25000", "same", "25000.00", "0.00")).toMatch(/already/);
  });

  it("refuses going below what's been collected, with the API's wording", () => {
    const problem = validatePriceChange("correction", "4999", "typo", "25000.00", "5000.00");
    expect(problem).toBe(belowCollectedMessage("5000.00"));
    expect(problem).toMatch(/can't go below what's already been collected \(₹5,000\)/);
  });

  it("allows exactly what's been collected", () => {
    expect(validatePriceChange("correction", "5000", "settled at what was paid", "25000.00", "5000.00")).toBeNull();
  });

  it("needs a reason of at least 3 characters", () => {
    expect(validatePriceChange("correction", "30000", "  ab ", "25000.00", "0.00")).toMatch(/Say why/);
  });
});

describe("PRICE_CHANGE_LABEL", () => {
  it("reads older raise / discount rows as corrections", () => {
    expect(PRICE_CHANGE_LABEL.set).toBe("Price set");
    expect(PRICE_CHANGE_LABEL.correction).toBe("Price corrected");
    expect(PRICE_CHANGE_LABEL.raise).toBe("Price corrected");
    expect(PRICE_CHANGE_LABEL.discount).toBe("Price corrected");
  });
});
