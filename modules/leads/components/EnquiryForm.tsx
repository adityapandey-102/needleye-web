"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publicEnquiryApi, type EnquiryFields } from "../api/publicEnquiryApi";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";
import { Textarea } from "../../../components/ui/Select";
import { Icon } from "../../../components/ui/Icon";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * The customers' enquiry form (no login). Three fields; everything else is
 * defence the customer never sees: a hidden trap field bots fill in, the
 * signed open-time token the API checks, and -- only once switched on in the
 * API -- Cloudflare Turnstile. Whatever happens, the customer gets a calm,
 * professional answer; text is only ever shown as text.
 */
export function EnquiryForm() {
  const [fields, setFields] = useState<EnquiryFields>({ name: "", phone: "", requirement: "" });
  const [website, setWebsite] = useState(""); // the honeypot -- people never see it
  const [formToken, setFormToken] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EnquiryFields, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const loadForm = useCallback(() => {
    publicEnquiryApi
      .formConfig()
      .then((cfg) => {
        setFormToken(cfg.formToken);
        setSiteKey(cfg.turnstileSiteKey);
        setLoadError(null);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "The form couldn't load."));
  }, []);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  // Cloudflare Turnstile -- only when the API says it's on.
  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;
    const mount = () => {
      if (!window.turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: (t) => setTurnstileToken(t),
        "expired-callback": () => setTurnstileToken(null),
      });
    };
    if (window.turnstile) return mount();
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = mount;
    document.head.appendChild(script);
  }, [siteKey]);

  function set<K extends keyof EnquiryFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function checkLocally(): boolean {
    const next: typeof errors = {};
    if (fields.name.trim().length < 2) next.name = "Please enter your name";
    if (fields.phone.replace(/\D/g, "").length < 10) next.phone = "Please enter your 10-digit mobile number";
    if (fields.requirement.trim().length === 0) next.requirement = "Tell us a little about what you'd like";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!formToken || !checkLocally()) return;
    if (siteKey && !turnstileToken) {
      setNotice("Please complete the quick check below.");
      return;
    }
    setSending(true);
    const result = await publicEnquiryApi.submit({ ...fields, formToken, website, turnstileToken: turnstileToken ?? undefined });
    setSending(false);
    switch (result.kind) {
      case "received":
      case "already_received":
        setDone(result.message);
        return;
      case "invalid":
        setErrors(result.fieldErrors);
        return;
      case "expired":
        loadForm(); // a fresh token -- the customer just presses Send again
        setNotice("The page had been open a long time, so we refreshed it. Please press Send again.");
        return;
      default:
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
        setTurnstileToken(null);
        setNotice(result.message);
    }
  }

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
          <Icon name="check-circle" size={28} />
        </div>
        <h2 className="mt-4 font-serif text-[28px] font-semibold text-text-primary">Thank you!</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-[28px] leading-tight font-semibold text-text-primary">Tell us about your outfit</h2>
        <p className="mt-1.5 text-sm text-text-muted">Our team will call you back, usually within a day.</p>
      </div>

      {loadError && (
        <p className="rounded-app-sm border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error">
          {loadError}{" "}
          <button type="button" className="font-medium underline" onClick={loadForm}>
            Try again
          </button>
        </p>
      )}

      <div>
        <FieldLabel htmlFor="enq-name" required>
          Your name
        </FieldLabel>
        <Input id="enq-name" name="name" autoComplete="name" maxLength={80} value={fields.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="enq-phone" required>
          Mobile number
        </FieldLabel>
        <Input
          id="enq-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          placeholder="98765 43210"
          value={fields.phone}
          onChange={(e) => set("phone", e.target.value)}
          aria-invalid={!!errors.phone}
        />
        <FieldError>{errors.phone}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="enq-req" required>
          What would you like?
        </FieldLabel>
        <Textarea
          id="enq-req"
          name="requirement"
          rows={4}
          maxLength={1000}
          placeholder="e.g. A bridal lehenga for a wedding in March, budget around ₹60,000"
          value={fields.requirement}
          onChange={(e) => set("requirement", e.target.value)}
          aria-invalid={!!errors.requirement}
        />
        <div className="mt-1 flex justify-between">
          <FieldError>{errors.requirement}</FieldError>
          <span className="ml-auto text-[11px] text-text-muted tabular-nums">{fields.requirement.length}/1000</span>
        </div>
      </div>

      {/* Honeypot: off-screen, unreachable by keyboard, ignored by screen readers. A person leaves it empty. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="enq-website">Leave this field empty</label>
        <input id="enq-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {siteKey && <div ref={widgetRef} className="min-h-16.25" />}

      {notice && (
        <p className="rounded-app-sm border border-warning/30 bg-warning-bg/50 px-3 py-2 text-sm text-warning-text" role="alert">
          {notice}
        </p>
      )}

      <Button type="submit" disabled={sending || !formToken} className="w-full justify-center">
        <Icon name="send" size={16} /> {sending ? "Sending..." : "Send enquiry"}
      </Button>
      <p className="text-center text-[11px] text-text-muted">We use your number only to contact you about this enquiry.</p>
    </form>
  );
}
