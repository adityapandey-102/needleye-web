import { describe, expect, it } from "vitest";
import {
  money,
  toMoneyString,
  addMoney,
  subtractMoney,
  outstanding,
  moneyGreaterThan,
  moneyGte,
  isPositiveMoney,
  paidFraction,
} from "./money";

describe("money() coercion", () => {
  it("treats null/undefined/empty as zero", () => {
    expect(money(null).toString()).toBe("0");
    expect(money(undefined).toString()).toBe("0");
    expect(money("").toString()).toBe("0");
  });

  it("falls back to zero on unparseable input rather than throwing", () => {
    expect(money("abc").toString()).toBe("0");
  });
});

describe("toMoneyString", () => {
  it("always renders exactly two decimals", () => {
    expect(toMoneyString("1000")).toBe("1000.00");
    expect(toMoneyString(1000)).toBe("1000.00");
    expect(toMoneyString("1500.5")).toBe("1500.50");
  });

  it("has no IEEE-754 drift (the whole point of decimal money)", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
  });
});

describe("arithmetic (all return 2dp strings)", () => {
  it("adds any number of values", () => {
    expect(addMoney("100.25", "200.25", "0.50")).toBe("301.00");
    expect(addMoney()).toBe("0.00");
  });

  it("subtracts", () => {
    expect(subtractMoney("500.00", "150.25")).toBe("349.75");
  });

  it("outstanding never goes negative", () => {
    expect(outstanding("1000.00", "400.00")).toBe("600.00");
    expect(outstanding("400.00", "1000.00")).toBe("0.00");
  });
});

describe("comparisons", () => {
  it("moneyGreaterThan / moneyGte", () => {
    expect(moneyGreaterThan("1000.01", "1000.00")).toBe(true);
    expect(moneyGreaterThan("1000.00", "1000.00")).toBe(false);
    expect(moneyGte("1000.00", "1000.00")).toBe(true);
    expect(moneyGte("999.99", "1000.00")).toBe(false);
  });

  it("isPositiveMoney", () => {
    expect(isPositiveMoney("0.01")).toBe(true);
    expect(isPositiveMoney("0.00")).toBe(false);
    expect(isPositiveMoney(null)).toBe(false);
  });
});

describe("paidFraction (progress bar)", () => {
  it("is 0 for a zero/absent total (never NaN)", () => {
    expect(paidFraction("0.00", "0.00")).toBe(0);
    expect(paidFraction("100.00", null)).toBe(0);
  });

  it("clamps between 0 and 1", () => {
    expect(paidFraction("250.00", "1000.00")).toBe(0.25);
    expect(paidFraction("2000.00", "1000.00")).toBe(1);
  });
});
