"use client";

import { useEffect, useState } from "react";

/**
 * While a visitor browses the work, a "Book a consultation" button floats at
 * the bottom of the screen: the deep red with a gold ring running round it and
 * a soft shine (.lux-chase in globals.css). It appears once the hero is
 * scrolled past and opens the enquiry popup (it's an a[href="#enquiry"]).
 */
export function FloatingConsult() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const update = () => setShown(window.scrollY > window.innerHeight * 0.6);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-500 ease-out sm:right-6 sm:bottom-6 sm:left-auto sm:translate-x-0 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      aria-hidden={!shown}
    >
      <a href="#enquiry" className="lux-chase" tabIndex={shown ? 0 : -1}>
        <span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-(--lux-gold-light)" aria-hidden>
            <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
          </svg>
          Book a consultation
        </span>
      </a>
    </div>
  );
}
