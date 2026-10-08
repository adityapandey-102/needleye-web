"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Image from "next/image";
import type { BrandPhoto } from "../../../lib/brand/gallery";
import { BRAND, CONTACT } from "../content/needleEye";
import { EnquiryForm } from "./EnquiryForm";

/**
 * The enquiry form, as a focused popup (a native <dialog>; styles:
 * .enquiry-dialog in globals.css). It opens the moment the page does, and
 * again from every "Book a consultation" link (any a[href="#enquiry"]):
 * showModal keeps focus inside, Esc closes, the page behind is inert. "See
 * our work" and "More about us" close it and glide to that part of the page.
 * The form itself needs JavaScript (it fetches its token), so there's no
 * inline copy -- one form on the page, always.
 */
export function EnquiryDialog({ photo }: { photo?: BrandPhoto }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const openPopup = useCallback(() => {
    const dlg = ref.current;
    if (!dlg || dlg.open || typeof dlg.showModal !== "function") return;
    dlg.showModal();
  }, []);

  /** Close the popup and, optionally, glide to a section of the page. */
  const closeTo = useCallback((sectionId?: string) => {
    ref.current?.close();
    if (sectionId) requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    // Every "Book a consultation" link on the page opens the popup.
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('a[href="#enquiry"]')) {
        e.preventDefault();
        openPopup();
      }
    };
    document.addEventListener("click", onClick);
    openPopup(); // the moment the page opens
    return () => document.removeEventListener("click", onClick);
  }, [openPopup]);

  return (
    <dialog
      ref={ref}
      id="enquiry"
      aria-labelledby={titleId}
      className="enquiry-dialog"
      onClick={(e) => {
        // A click on the backdrop (the dialog itself, outside the panel) closes it.
        if (e.target === ref.current) closeTo();
      }}
    >
      <div className="enquiry-panel">
        {photo && (
          <div className="enquiry-photo relative min-h-136">
            <Image src={photo.src} alt={photo.alt} fill sizes="440px" priority className="object-cover object-top" />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-[rgba(13,9,8,0.92)] via-[rgba(13,9,8,0.15)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <span aria-hidden className="lux-monogram block h-9 w-16" />
              <p className="mt-3 font-serif text-[24px] leading-tight text-white">{BRAND.tagline}</p>
              <p className="mt-1 font-serif text-[14px] text-(--lux-gold-light) italic">
                {BRAND.name} {BRAND.byline} · {BRAND.city}
              </p>
            </div>
          </div>
        )}
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={() => closeTo()}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/60 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <p className="lux-eyebrow mb-4 text-(--lux-gold)">Private consultation</p>
          <EnquiryForm tone="lux" titleId={titleId} />
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgba(232,213,166,0.16)] pt-5 text-[13px]">
            <span className="text-white/55">Not ready yet?</span>
            <button type="button" onClick={() => closeTo("gallery")} className="font-semibold text-(--lux-gold-light) underline-offset-4 hover:underline">
              See our work
            </button>
            <button type="button" onClick={() => closeTo("atelier")} className="font-semibold text-(--lux-gold-light) underline-offset-4 hover:underline">
              More about us
            </button>
            <a href={CONTACT.phoneHref} className="ml-auto text-white/55 underline-offset-4 hover:text-(--lux-gold-light) hover:underline">
              or call {CONTACT.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
