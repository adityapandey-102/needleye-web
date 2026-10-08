"use client";

import { useEffect, useId, useState } from "react";
import { formatCurrency, formatDate, revenueMonthLabel, type LedgerFigures, type LedgerMonthClosings } from "../../../lib/domain";
import { ledgerApi } from "../api/ledgerApi";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { FieldError, FieldLabel } from "../../../components/ui/Field";
import { Textarea } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/Toast";

const REASON_MIN = 3;
const REASON_MAX = 500;

/** The figures a closing record keeps. Cash and payments can't change while closed; the others follow the month's orders. */
const ROWS: { key: keyof LedgerFigures; label: string; frozen: boolean }[] = [
  { key: "total", label: "Total booked", frozen: false },
  { key: "paidSoFar", label: "Paid so far", frozen: false },
  { key: "outstanding", label: "Outstanding", frozen: false },
  { key: "cashCollected", label: "Cash collected", frozen: true },
  { key: "paymentsCount", label: "Payments", frozen: true },
];

function show(key: keyof LedgerFigures, f: LedgerFigures): string {
  const v = f[key];
  return typeof v === "number" ? String(v) : formatCurrency(v);
}

/**
 * One month's books (needleye-api ADR 0008, phase 5), loaded when opened --
 * fresh from the server, so a close confirms the figures as they are now.
 * Open month: what closing locks, and the Close button (Owner/Accountant).
 * Closed month: the closing record beside today's figures, and Reopen with a
 * reason (Owner). Every close and reopen is listed.
 */
export function MonthBooksDialog({
  month,
  canClose,
  canReopen,
  onCancel,
  onChanged,
}: {
  month: string;
  canClose: boolean;
  canReopen: boolean;
  onCancel: () => void;
  /** After a close or reopen -- the parent reloads its months. */
  onChanged: () => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const { showToast } = useToast();
  const [data, setData] = useState<LedgerMonthClosings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const label = revenueMonthLabel(month);

  useEffect(() => {
    let cancelled = false;
    ledgerApi
      .closings(month)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the month's books");
      });
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  const closed = data?.books.status === "closed";
  const record = closed ? (data.history.find((h) => h.action === "closed")?.figures ?? null) : null;

  async function closeMonth() {
    setBusy(true);
    setFormError(null);
    try {
      const closing = await ledgerApi.close(month);
      showToast(`${label} closed — cash collected ${formatCurrency(closing.figures?.cashCollected ?? "0")} is locked.`, "success");
      onChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't close the month");
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    const why = reason.trim();
    if (why.length < REASON_MIN) {
      setFormError(`Say why the month is being reopened (at least ${REASON_MIN} characters).`);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await ledgerApi.reopen(month, why);
      showToast(`${label} reopened.`, "success");
      onChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't reopen the month");
    } finally {
      setBusy(false);
    }
  }

  const canAct = data ? (closed ? canReopen : data.books.ended && canClose) : false;

  return (
    <Modal open onClose={onCancel} labelledBy={titleId} panelClassName="max-w-lg">
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 id={titleId} className="flex items-center gap-2 font-serif text-xl font-semibold text-text-primary">
          {closed && <Icon name="lock" size={18} className="text-primary" />}
          {label} &mdash; {data ? (closed ? "books closed" : "books open") : "books"}
        </h2>

        {error ? (
          <div className="mt-4 flex items-center justify-between rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
            <span>{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline">
              Retry
            </button>
          </div>
        ) : !data ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded-app-sm bg-app-bg/70" />
            ))}
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-secondary">
              {closed
                ? `Closed ${data.books.closedByName ? `by ${data.books.closedByName} ` : ""}on ${formatDate(data.books.closedAt)}. No payment dated in ${label} can be added, edited or removed.`
                : data.books.ended
                  ? `Closing keeps these figures as ${label}'s closing record. After that, no payment dated in ${label} can be added, edited or removed — the Owner can reopen it with a reason.`
                  : `${label} is still running — it can be closed once it ends.`}
            </p>

            <table className="mt-4 w-full text-sm" aria-label={closed ? "Closing record and now" : "Figures now"}>
              <thead>
                <tr className="border-b border-border-light text-left text-xs text-text-muted">
                  <th className="py-1.5 pr-3 font-medium" />
                  {record && <th className="py-1.5 pr-3 text-right font-medium">At closing</th>}
                  <th className="py-1.5 text-right font-medium">Now</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const changed = record !== null && record[r.key] !== data.figuresNow[r.key];
                  return (
                    <tr key={r.key} className="border-b border-border-light last:border-0">
                      <td className="py-1.5 pr-3 text-text-secondary">{r.label}</td>
                      {record && <td className="figure py-1.5 pr-3 text-right text-text-primary">{show(r.key, record)}</td>}
                      <td className={`figure py-1.5 text-right ${changed ? (r.frozen ? "font-semibold text-error" : "text-warning-text") : "text-text-primary"}`}>
                        {show(r.key, data.figuresNow)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {record && (
              <p className="mt-1.5 text-[11px] text-text-muted">
                Total, paid so far and outstanding follow {label}&rsquo;s orders, so they can change after closing (a discount, a later payment). The
                cash collected in {label} can&rsquo;t.
              </p>
            )}

            {data.history.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-text-primary">History</div>
                <ol className="mt-1.5 space-y-1.5 text-xs text-text-secondary">
                  {data.history.map((h) => (
                    <li key={h.id} className="flex gap-2">
                      <Icon name={h.action === "closed" ? "lock" : "refresh"} size={13} className="mt-0.5 shrink-0 text-text-muted" />
                      <div>
                        <span className="font-medium text-text-primary">{h.action === "closed" ? "Closed" : "Reopened"}</span>
                        {h.actorName ? ` by ${h.actorName}` : ""} · {formatDate(h.createdAt)}
                        {h.action === "closed" && h.figures && <> · cash {formatCurrency(h.figures.cashCollected)}</>}
                        {h.reason && <div className="text-text-muted italic">&ldquo;{h.reason}&rdquo;</div>}
                      </div>
                    </li>
                  ))}
                </ol>
                {data.total > data.history.length && <div className="mt-1 text-[11px] text-text-muted">…and {data.total - data.history.length} earlier.</div>}
              </div>
            )}

            {closed && canReopen && (
              <div className="mt-4">
                <FieldLabel htmlFor={reasonId} required>
                  Why reopen {label}?
                </FieldLabel>
                <Textarea
                  id={reasonId}
                  rows={2}
                  maxLength={REASON_MAX}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. A cash payment was entered with the wrong date"
                />
              </div>
            )}
            {closed && !canReopen && <p className="mt-4 text-xs text-text-muted">Only the Owner can reopen a closed month.</p>}
            <FieldError>{formError}</FieldError>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {canAct ? "Cancel" : "Done"}
          </Button>
          {data && canAct && closed && (
            <Button variant="danger" disabled={busy} onClick={() => void reopen()}>
              {busy ? "Reopening…" : `Reopen ${label}`}
            </Button>
          )}
          {data && canAct && !closed && (
            <Button disabled={busy} onClick={() => void closeMonth()}>
              <Icon name="lock" size={16} /> {busy ? "Closing…" : `Close ${label}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
