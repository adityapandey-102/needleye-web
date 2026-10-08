"use client";

import { useId, useState } from "react";
import { formatDateOnly } from "../../../lib/domain";
import { ordersApi, type CustomerLookupMatch } from "../api/ordersApi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Icon } from "../../../components/ui/Icon";

/**
 * "Fetch customer details" beside the new-order Phone Number field. It looks
 * up earlier orders with this exact number ONLY when pressed -- never while
 * typing, so no request per keystroke. One or more matches open a dialog to
 * pick which earlier order to copy from; none shows a short note instead.
 */
export function CustomerLookup({
  phone,
  disabled,
  onFill,
}: {
  phone: string;
  disabled?: boolean;
  onFill: (match: CustomerLookupMatch) => void;
}) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The number the last lookup was for -- the "no earlier order" note only
  // applies while the field still holds that number.
  const [noMatchFor, setNoMatchFor] = useState<string | null>(null);
  const [matches, setMatches] = useState<CustomerLookupMatch[] | null>(null);
  const [chosen, setChosen] = useState("");

  const ready = /^\d{10}$/.test(phone);

  async function lookUp() {
    if (!ready) return;
    setLoading(true);
    setError(null);
    setNoMatchFor(null);
    try {
      const result = await ordersApi.customerLookup(phone);
      if (result.matches.length === 0) {
        setNoMatchFor(phone);
      } else {
        setChosen(result.matches[0]!.orderId);
        setMatches(result.matches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't look up this number");
    } finally {
      setLoading(false);
    }
  }

  function fill() {
    const match = matches?.find((m) => m.orderId === chosen);
    if (match) onFill(match);
    setMatches(null);
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled || !ready || loading} onClick={() => void lookUp()} className="shrink-0 px-3! text-xs!">
        <Icon name="search" size={14} /> {loading ? "Looking up…" : "Fetch customer details"}
      </Button>
      {noMatchFor === phone && (
        <p className="basis-full text-xs text-text-muted" role="status">
          No earlier order with this number.
        </p>
      )}
      {error && <p className="basis-full text-xs text-error">{error}</p>}

      <Modal open={matches !== null} onClose={() => setMatches(null)} labelledBy={titleId} panelClassName="max-w-md">
        <div className="p-6">
          <h2 id={titleId} className="font-serif text-xl font-semibold text-text-primary">
            Earlier orders for {phone}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Pick the order to copy the customer&rsquo;s details from.</p>
          <fieldset className="mt-4 flex flex-col gap-2">
            <legend className="sr-only">Earlier orders</legend>
            {matches?.map((m) => {
              const selected = chosen === m.orderId;
              return (
                <label
                  key={m.orderId}
                  className={`flex cursor-pointer items-center gap-3 rounded-app-sm border px-3 py-2.5 text-sm transition-colors ${
                    selected ? "border-primary bg-primary-bg" : "border-border bg-card hover:border-primary-light"
                  }`}
                >
                  <input
                    type="radio"
                    name="customer-lookup"
                    value={m.orderId}
                    checked={selected}
                    onChange={() => setChosen(m.orderId)}
                    className="accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-text-primary">{m.customerName}</span>
                    <span className="block text-xs text-text-muted">
                      {m.orderNumber} · booked {formatDateOnly(m.bookingDate)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setMatches(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={fill} disabled={!chosen}>
              Fetch &amp; fill
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
