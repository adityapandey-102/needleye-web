import Decimal from "decimal.js";

/**
 * Money — the ONE way to handle currency on the frontend. This mirrors
 * needleye-api's `src/common/money/money.ts` (the two domain copies move in
 * lockstep, same as the rest of `lib/domain`).
 *
 * Rules for the whole team (keep it boring and consistent):
 *   1. Money CROSSES EVERY BOUNDARY (API JSON, props, state) as a STRING like
 *      "1500.00" -- never a JS `number`. JSON numbers are IEEE-754 floats, so
 *      a string is exact.
 *   2. NEVER do arithmetic or comparisons on money with `+`, `-`, `>`,
 *      `Number(...)`, or `parseFloat`. Always go through the helpers here,
 *      which use decimal.js.
 *   3. `toMoneyString(...)` produces the canonical 2dp string; `formatCurrency`
 *      (see currency.ts) is the only thing that turns money into display text.
 */

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/** Anything that can represent an amount. `null`/`undefined`/"" are treated as 0. */
export type MoneyLike = string | number | Decimal | null | undefined;

/** The one way to turn any money value into a Decimal for math/comparison. */
export function money(value: MoneyLike): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

/** Canonical string form for transport + state: always exactly 2 decimals. */
export function toMoneyString(value: MoneyLike): string {
  return money(value).toFixed(2);
}

/** Sum any number of money values, returned as a canonical 2dp string. */
export function addMoney(...values: MoneyLike[]): string {
  return values.reduce<Decimal>((sum, v) => sum.plus(money(v)), new Decimal(0)).toFixed(2);
}

/** a - b, as a canonical 2dp string. */
export function subtractMoney(a: MoneyLike, b: MoneyLike): string {
  return money(a).minus(money(b)).toFixed(2);
}

/** max(a - b, 0) -- e.g. an outstanding balance can't go negative. 2dp string. */
export function outstanding(total: MoneyLike, paid: MoneyLike): string {
  const diff = money(total).minus(money(paid));
  return (diff.isNegative() ? new Decimal(0) : diff).toFixed(2);
}

export function moneyGreaterThan(a: MoneyLike, b: MoneyLike): boolean {
  return money(a).greaterThan(money(b));
}

export function moneyGte(a: MoneyLike, b: MoneyLike): boolean {
  return money(a).greaterThanOrEqualTo(money(b));
}

export function isPositiveMoney(value: MoneyLike): boolean {
  return money(value).greaterThan(0);
}

/**
 * Fraction paid (0..1) for a progress bar, computed on decimals. Returns 0 for
 * a zero/absent total so the bar never shows NaN.
 */
export function paidFraction(paid: MoneyLike, total: MoneyLike): number {
  const t = money(total);
  if (t.lessThanOrEqualTo(0)) return 0;
  const frac = money(paid).dividedBy(t).toNumber();
  return Math.max(0, Math.min(1, frac));
}
