"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatCurrency, formatDate, PRICE_CHANGE_LABEL, type PriceAction, type PriceChange } from "../../../lib/domain";
import { ordersApi } from "../api/ordersApi";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Icon } from "../../../components/ui/Icon";
import { useToast } from "../../../components/ui/Toast";
import { PricingDialog } from "./PricingDialog";
import { Portal } from "../../../components/ui/Portal";

/** Dispatched after the price is first set, so the Payment Ledger opens its "record payment" form (next step of the flow). */
export const OPEN_PAYMENT_FORM_EVENT = "needleye:open-payment-form";

/**
 * The order's price (ADR 0008): "Price not set" until priced; then "Correct
 * price" (up or down, with a reason) for the Owner and Accountant -- delivered
 * or not; only a closed booking month in the books stops it (the API says so);
 * and the price history (who, when, from -> to, why). Opened with `askNow` right after
 * an order is created: "Add pricing now?" -> the price -> "Record a payment?".
 */
export function PricingCard({
  orderId,
  total,
  collected,
  canSet,
  canAdjust,
  askNow,
}: {
  orderId: string;
  total: string | null;
  collected: string;
  /** Unused since delivery stopped locking the price -- kept so OrderDetailView's props still fit. */
  delivered?: boolean;
  canSet: boolean;
  canAdjust: boolean;
  /** The page was opened right after creating the order (?pricing=1). */
  askNow: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<PriceAction | null>(null);
  const [step, setStep] = useState<"ask" | "next" | null>(askNow && total === null && canSet ? "ask" : null);
  const [history, setHistory] = useState<PriceChange[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .priceHistory(orderId)
      .then((r) => !cancelled && setHistory(r.history))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [orderId, total]);

  /** Drop ?pricing=1 so a reload doesn't ask again. */
  function finishFlow() {
    setStep(null);
    if (askNow) router.replace(pathname, { scroll: false });
  }

  return (
    <Card>
      <CardHeader icon="💳" iconTone="green" title="Pricing" subtitle="Order total" />
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {total === null ? (
            <StatusPill label="Price not set" tone="amber" />
          ) : (
            <span className="figure text-[22px] text-text-primary">{formatCurrency(total)}</span>
          )}
        </div>

        {total === null && (
          <p className="text-xs text-text-secondary">
            This order can&rsquo;t take payments or be delivered until it&rsquo;s priced.
            {!canSet && " Its designer, the Owner or the Accountant sets the price."}
          </p>
        )}

        {((total === null && canSet) || (total !== null && canAdjust)) && (
          <div className="flex flex-wrap gap-2 print:hidden">
            {total === null ? (
              <Button onClick={() => setDialog("set")} className="px-3 py-1.5 text-xs">
                <Icon name="rupee" size={14} /> Set price
              </Button>
            ) : (
              // One action for any later change, up or down -- there are no discounts any more.
              <Button variant="outline" onClick={() => setDialog("correction")} className="px-3 py-1.5 text-xs">
                <Icon name="edit" size={14} /> Correct price
              </Button>
            )}
          </div>
        )}

        {history && history.length > 0 && (
          <ol className="flex flex-col gap-2 border-t border-border-light pt-3">
            {history.map((h) => (
              <li key={h.id} className="text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-semibold text-text-primary">{PRICE_CHANGE_LABEL[h.kind] ?? "Price corrected"}</span>
                  <span className="figure text-text-secondary">
                    {h.previousTotal !== null && <>{formatCurrency(h.previousTotal)} → </>}
                    {formatCurrency(h.newTotal)}
                  </span>
                </div>
                {h.reason && <div className="mt-0.5 text-text-secondary italic">&ldquo;{h.reason}&rdquo;</div>}
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {h.changedByName ?? "Someone"} · {formatDate(h.createdAt)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>

      {step === "ask" && (
        <FlowPrompt
          title="Add pricing now?"
          body="Set this order's total now, then record any advance and the next payment date. You can also do it later — the order shows “Price not set” until then."
          primary="Add pricing"
          onPrimary={() => {
            setStep(null);
            setDialog("set");
          }}
          secondary="Later"
          onSecondary={finishFlow}
        />
      )}

      {step === "next" && (
        <FlowPrompt
          title="Record a payment?"
          body="Record an advance the customer paid, and when the next payment is expected."
          primary="Record payment"
          onPrimary={() => {
            finishFlow();
            window.dispatchEvent(new Event(OPEN_PAYMENT_FORM_EVENT));
            document.getElementById("payment-ledger")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          secondary="Not now"
          onSecondary={finishFlow}
        />
      )}

      {dialog && (
        <PricingDialog
          orderId={orderId}
          kind={dialog}
          currentTotal={total}
          collected={collected}
          onClose={() => {
            setDialog(null);
            if (askNow && dialog === "set") finishFlow();
          }}
          onSaved={({ change }) => {
            const wasFirst = dialog === "set";
            setDialog(null);
            showToast(`${PRICE_CHANGE_LABEL[change.kind] ?? "Price corrected"}: ${formatCurrency(change.newTotal)}.`, "success");
            router.refresh();
            // After the first price, offer the next step (payments) -- unless it's free work.
            if (wasFirst && change.newTotal !== "0.00") setStep("next");
            else if (wasFirst) finishFlow();
          }}
        />
      )}
    </Card>
  );
}

function FlowPrompt({
  title,
  body,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm print:hidden"
        onKeyDown={(e) => e.key === "Escape" && onSecondary()}
      >
        <div className="animate-scale-in card-accent-top w-full max-w-sm rounded-app-lg border border-border bg-card p-5 shadow-app-lg">
          <h2 className="font-serif text-lg font-bold text-text-primary">{title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{body}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onSecondary}>
              {secondary}
            </Button>
            <Button autoFocus onClick={onPrimary}>
              {primary}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
