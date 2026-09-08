import { diffDays, parseDateOnly, pluralize, startOfDay } from "./date";
import { money, outstanding as outstandingMoney, type MoneyLike } from "./money";
import type { PaymentStatus } from "../constants/productCategories";

/** Remaining payable on an order (2dp string) -- never negative (an overpaid ledger still reads 0 outstanding). */
export function remainingOutstanding(totalAmount: MoneyLike, amountPaid: MoneyLike): string {
  return outstandingMoney(totalAmount, amountPaid);
}

/**
 * Client mirror of the API's derivePaymentStatus -- payment status is derived
 * from the ledger, never chosen by hand. Used for immediate UI feedback (e.g.
 * previewing status while entering an advance at order creation); the API is
 * the real authority. Exact (decimal.js), so it matches the server exactly.
 */
export function derivePaymentStatus(paymentsSum: MoneyLike, totalAmount: MoneyLike): PaymentStatus {
  const paid = money(paymentsSum);
  const total = money(totalAmount);
  if (total.lessThanOrEqualTo(0) || paid.lessThanOrEqualTo(0)) return "unpaid";
  if (paid.greaterThanOrEqualTo(total)) return "fully_paid";
  return "advance_paid";
}

export type PaymentDueStatus = "paid" | "no_date" | "upcoming" | "due_today" | "overdue";

export interface PaymentDueInfo {
  status: PaymentDueStatus;
  /** Short human label: "Fully Paid" / "Overdue" / "Due Today" / "Upcoming" / "No due date". */
  label: string;
  tone: "green" | "amber" | "red" | "gray";
  /** Days until due (upcoming), 0 (due today), or days overdue (positive); null when not applicable. */
  days: number | null;
  daysLabel: string;
  /** Money as a 2dp string. */
  outstanding: string;
}

/**
 * Derives the payment-due state of an order from its balance and next-payment
 * date, relative to today. Pure + date-only (via lib/domain/utils/date), so it's
 * unit-testable and identical on the ledger and any dashboard tile. A fully-paid
 * (or zero-outstanding) order is "paid"; an order with a balance but no scheduled
 * date is "no_date"; otherwise it's overdue / due today / upcoming with a day count.
 */
export function getPaymentDue(input: {
  totalAmount?: MoneyLike;
  amountPaid?: MoneyLike;
  paymentStatus?: string | null;
  nextPaymentDate?: string | null;
}): PaymentDueInfo {
  const outstanding = remainingOutstanding(input.totalAmount, input.amountPaid);

  if (input.paymentStatus === "fully_paid" || !money(outstanding).greaterThan(0)) {
    return { status: "paid", label: "Fully Paid", tone: "green", days: null, daysLabel: "Settled", outstanding: "0.00" };
  }

  const due = parseDateOnly(input.nextPaymentDate);
  if (!due) {
    return { status: "no_date", label: "No due date", tone: "gray", days: null, daysLabel: "Not scheduled", outstanding };
  }

  const remaining = diffDays(due, startOfDay(new Date()));
  if (remaining < 0) {
    const overdue = Math.abs(remaining);
    return {
      status: "overdue",
      label: "Overdue",
      tone: "red",
      days: overdue,
      daysLabel: `${overdue} ${pluralize("day", overdue)} overdue`,
      outstanding,
    };
  }
  if (remaining === 0) {
    return { status: "due_today", label: "Due Today", tone: "amber", days: 0, daysLabel: "Due today", outstanding };
  }
  return {
    status: "upcoming",
    label: "Upcoming",
    tone: "green",
    days: remaining,
    daysLabel: `${remaining} ${pluralize("day", remaining)} left`,
    outstanding,
  };
}
