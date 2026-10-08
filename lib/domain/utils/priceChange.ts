import type { PriceAction, PriceChangeKind } from "../types";
import { formatCurrency } from "./currency";
import { moneyGreaterThan, toMoneyString } from "./money";

/** Mirrors needleye-api's PRICE_REASON_MIN / PRICE_REASON_MAX. */
export const PRICE_REASON_MIN = 3;
export const PRICE_REASON_MAX = 500;

/**
 * How a price-history row reads. Older rows recorded as "raise" / "discount"
 * (before discounts were dropped) read as corrections, like every later change.
 */
export const PRICE_CHANGE_LABEL: Record<PriceChangeKind, string> = {
  set: "Price set",
  correction: "Price corrected",
  raise: "Price corrected",
  discount: "Price corrected",
};

/** The message for a total below what's been collected -- same words as the API's ORDER_TOTAL_BELOW_PAID. */
export function belowCollectedMessage(collected: string): string {
  return `The price can't go below what's already been collected (${formatCurrency(collected)}). To lower it further, correct or remove a payment first.`;
}

/**
 * Client mirror of the API's price rules -- instant feedback only; the API
 * decides (it also refuses while the order's booking month is closed, which
 * the client can't see). Returns the problem to show, or null when it's fine.
 */
export function validatePriceChange(
  action: PriceAction,
  amount: string,
  reason: string,
  current: string | null,
  collected: string,
): string | null {
  const value = amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return "Enter the total in rupees, e.g. 25000 or 25000.50.";
  if (moneyGreaterThan(value, "9999999999.99")) return "That total is too large.";
  if (action === "correction" && current !== null && toMoneyString(value) === toMoneyString(current)) {
    return `The total is already ${formatCurrency(current)}.`;
  }
  if (moneyGreaterThan(collected, value)) return belowCollectedMessage(collected);
  if (action === "correction") {
    const why = reason.trim();
    if (why.length < PRICE_REASON_MIN) return "Say why the price is being corrected.";
    if (why.length > PRICE_REASON_MAX) return `Keep the reason under ${PRICE_REASON_MAX} characters.`;
  }
  return null;
}
