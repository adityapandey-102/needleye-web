import { describe, expect, it } from "vitest";
import { amountInWords } from "./amountInWords";

describe("amountInWords (Indian system, for the double-check alert)", () => {
  it("reads everyday totals", () => {
    expect(amountInWords("25000.00")).toBe("Twenty-five thousand rupees");
    expect(amountInWords("1500")).toBe("One thousand five hundred rupees");
    expect(amountInWords("305")).toBe("Three hundred and five rupees");
    expect(amountInWords("1")).toBe("One rupee");
    expect(amountInWords("0")).toBe("Zero rupees");
  });

  it("uses lakh and crore", () => {
    expect(amountInWords("250000")).toBe("Two lakh fifty thousand rupees");
    expect(amountInWords("1234567")).toBe("Twelve lakh thirty-four thousand five hundred and sixty-seven rupees");
    expect(amountInWords("10000000")).toBe("One crore rupees");
    expect(amountInWords("9999999999.99")).toBe(
      "Nine hundred and ninety-nine crore ninety-nine lakh ninety-nine thousand nine hundred and ninety-nine rupees and ninety-nine paise",
    );
  });

  it("reads paise, and returns nothing for non-amounts", () => {
    expect(amountInWords("25000.50")).toBe("Twenty-five thousand rupees and fifty paise");
    expect(amountInWords("0.05")).toBe("Zero rupees and five paise");
    expect(amountInWords("")).toBe("");
    expect(amountInWords(null)).toBe("");
    expect(amountInWords("abc")).toBe("");
    expect(amountInWords("-5")).toBe("");
  });
});
