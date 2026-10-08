import { addMoney, subtractMoney } from "./money";
import { PAYMENT_METHODS } from "../constants/productCategories";
import type { LedgerEvent } from "../types";

/**
 * Ledger Activity export (CSV + the printable PDF page): the SAME rows the
 * Ledger Activity table shows for the chosen week/month, plus a totals block.
 * Pure -- unit-tested, and shared by the CSV download and the print page so
 * both always agree.
 */

/** The table's action wording: Recorded / Edited / Removed. */
export function ledgerActionLabel(action: LedgerEvent["action"]): string {
  return action === "created" ? "Recorded" : action === "deleted" ? "Removed" : "Edited";
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/**
 * What an event did to the money collected, as a signed 2dp string: a recorded
 * payment adds its amount, a removal subtracts it, an edit moves it by
 * (after - before).
 */
export function ledgerEffect(event: LedgerEvent): string {
  if (event.action === "updated") return subtractMoney(event.after?.amount ?? "0", event.before?.amount ?? "0");
  const amount = event.snapshot?.amount ?? "0";
  return event.action === "deleted" ? subtractMoney("0", amount) : addMoney(amount);
}

export interface LedgerTotals {
  recordedCount: number;
  recordedAmount: string;
  editedCount: number;
  /** Net change from edits (may be negative). */
  editedNet: string;
  removedCount: number;
  removedAmount: string;
  /** Recorded - removed + edits: the period's net effect on money collected. */
  net: string;
}

export function ledgerTotals(events: LedgerEvent[]): LedgerTotals {
  const t: LedgerTotals = {
    recordedCount: 0,
    recordedAmount: "0.00",
    editedCount: 0,
    editedNet: "0.00",
    removedCount: 0,
    removedAmount: "0.00",
    net: "0.00",
  };
  for (const ev of events) {
    if (ev.action === "created") {
      t.recordedCount++;
      t.recordedAmount = addMoney(t.recordedAmount, ev.snapshot?.amount);
    } else if (ev.action === "deleted") {
      t.removedCount++;
      t.removedAmount = addMoney(t.removedAmount, ev.snapshot?.amount);
    } else {
      t.editedCount++;
      t.editedNet = addMoney(t.editedNet, ledgerEffect(ev));
    }
    t.net = addMoney(t.net, ledgerEffect(ev));
  }
  return t;
}

/** "25 Sept 2026, 4:05 pm" in the SHOP's timezone -- the same wherever the export is rendered (server or browser). */
export function formatLedgerWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso));
}

/**
 * Escapes a CSV cell: quotes it when it holds a comma, quote or newline, and
 * defuses spreadsheet formulas -- a name typed as "=HYPERLINK(...)" would
 * otherwise run when the file is opened in Excel/Sheets (CSV injection), so a
 * text cell starting with = + - @ (or a tab/CR) gets a leading apostrophe.
 * Our own signed money values are passed as numbers-in-strings and exempted.
 */
export function ledgerCsvCell(value: string | number, { isMoney = false }: { isMoney?: boolean } = {}): string {
  let s = String(value);
  if (!isMoney && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The CSV the Ledger Activity "Export CSV" button downloads. */
export function ledgerEventsToCsv(events: LedgerEvent[], options: { from: string; to: string; timeZone: string }): string {
  const header = [
    "When",
    "Who",
    "Action",
    "Order",
    "Amount",
    "Method",
    "Paid on",
    "Previous amount",
    "Previous method",
    "Previous paid on",
    "Effect on collected",
  ];
  const lines: string[] = [header.map((h) => ledgerCsvCell(h)).join(",")];

  for (const ev of events) {
    const now = ev.action === "updated" ? ev.after : ev.snapshot;
    const cells: [string | number, boolean][] = [
      [formatLedgerWhen(ev.at, options.timeZone), false],
      [ev.actorName ?? "", false],
      [ledgerActionLabel(ev.action), false],
      [ev.orderNumber ?? "", false],
      [now?.amount ?? "", true],
      [now ? paymentMethodLabel(now.method) : "", false],
      [now?.paidAt ?? "", false],
      [ev.action === "updated" ? (ev.before?.amount ?? "") : "", true],
      [ev.action === "updated" && ev.before ? paymentMethodLabel(ev.before.method) : "", false],
      [ev.action === "updated" ? (ev.before?.paidAt ?? "") : "", false],
      [ledgerEffect(ev), true],
    ];
    lines.push(cells.map(([v, isMoney]) => ledgerCsvCell(v, { isMoney })).join(","));
  }

  const t = ledgerTotals(events);
  const totalRow = (label: string, count: number, amount: string) =>
    [ledgerCsvCell(label), "", "", ledgerCsvCell(`${count} entries`), "", "", "", "", "", "", ledgerCsvCell(amount, { isMoney: true })].join(",");
  lines.push("");
  lines.push(ledgerCsvCell(`Period ${options.from} to ${options.to}`));
  lines.push(totalRow("Total recorded", t.recordedCount, t.recordedAmount));
  lines.push(totalRow("Total removed", t.removedCount, subtractMoney("0", t.removedAmount)));
  lines.push(totalRow("Net change from edits", t.editedCount, t.editedNet));
  lines.push(totalRow("Net change", events.length, t.net));
  return lines.join("\n");
}
