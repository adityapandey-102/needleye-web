import { money, type MoneyLike } from "./money";

/**
 * The one way to render money as display text. Accepts money in any form
 * (canonical 2dp strings on the wire, or a number), parses it exactly via
 * decimal.js, and formats as whole-rupee INR. Never do your own toLocaleString
 * on money -- go through here.
 */
export function formatCurrency(value: MoneyLike): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(money(value).toNumber());
}
