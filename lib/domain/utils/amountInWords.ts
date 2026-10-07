import { money, type MoneyLike } from "./money";

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0-99 in words ("forty-five"). */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n]!;
  const ten = TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${ten}-${ONES[n % 10]}` : ten;
}

/** 0-999 in words ("three hundred and five"). */
function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return twoDigits(rest);
  return rest ? `${ONES[hundreds]} hundred and ${twoDigits(rest)}` : `${ONES[hundreds]} hundred`;
}

/**
 * A whole number in words on the Indian system -- crore, lakh, thousand --
 * the way the shop reads amounts ("2,50,000" = "two lakh fifty thousand").
 */
function indianWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${indianWords(crore)} crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ");
}

/**
 * A rupee amount in words, for the "please double-check this total" alert
 * (ADR 0008): "₹25,000.50" -> "Twenty-five thousand rupees and fifty paise".
 * Returns "" for anything that isn't a valid non-negative amount.
 */
export function amountInWords(value: MoneyLike | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  // Only real amounts: money() is lenient and would read "abc" as 0.
  if (typeof value === "string" && !/^\s*\d+(\.\d+)?\s*$/.test(value)) return "";
  let amount;
  try {
    amount = money(value);
  } catch {
    return "";
  }
  if (!amount.isFinite() || amount.isNegative()) return "";
  const rupees = amount.floor().toNumber();
  const paise = amount.minus(amount.floor()).times(100).toDecimalPlaces(0).toNumber();
  let words = `${indianWords(rupees)} ${rupees === 1 ? "rupee" : "rupees"}`;
  if (paise) words += ` and ${twoDigits(paise)} paise`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
