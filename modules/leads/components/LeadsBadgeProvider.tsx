"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { titleWithBadge } from "../../../lib/domain";
import { leadsApi } from "../api/leadsApi";

/** How often an open app re-checks the count (the user asked for 10 minutes, not every minute). */
export const LEADS_BADGE_REFRESH_MS = 10 * 60 * 1000;

/** Fire after anything that changes the count (assign, Received, ...) so the badge updates at once. */
export const LEADS_CHANGED_EVENT = "needleye:leads-changed";
export function notifyLeadsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LEADS_CHANGED_EVENT));
}

interface BadgeContext {
  count: number;
  refresh: () => void;
}

const LeadsBadgeContext = createContext<BadgeContext>({ count: 0, refresh: () => undefined });

/** The red count for the Leads section -- 0 (nothing shown) for roles without leads. */
export function useLeadsBadge(): BadgeContext {
  return useContext(LeadsBadgeContext);
}

/**
 * The Leads badge, like an app's unread count. Owner: new leads nobody is
 * assigned to. Designer: leads assigned to them they haven't tapped "Received"
 * on, plus their urgent ones (a repeat enquiry).
 *
 * Refreshed when the app opens or is reloaded, when it comes back to the
 * foreground (the tab/app is reopened), every 10 minutes while open, and right
 * after an action that changes it -- never on a tight timer. One tiny count
 * query each time. Shown on the sidebar's Leads item, on the logo in the phone
 * header, in the browser tab title, and on the installed app's icon where the
 * device supports it (the Badging API).
 */
export function LeadsBadgeProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    leadsApi
      .badge()
      .then((res) => setCount(res.count))
      .catch(() => {
        // A missed refresh just keeps the last count; the next trigger tries again.
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = window.setInterval(refresh, LEADS_BADGE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(LEADS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(LEADS_CHANGED_EVENT, refresh);
    };
  }, [enabled, refresh]);

  // Browser tab title ("(3) Needleye") -- re-applied after each navigation, since a page sets its own title.
  useEffect(() => {
    if (!enabled) return;
    const apply = () => {
      document.title = titleWithBadge(document.title, count);
    };
    apply();
    const t = window.setTimeout(apply, 300);
    return () => window.clearTimeout(t);
  }, [enabled, count, pathname]);

  // The installed app's icon badge (Chrome/Edge on Android & desktop, Safari on iOS 16.4+ home-screen apps).
  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count > 0) void nav.setAppBadge?.(count).catch(() => undefined);
    else void nav.clearAppBadge?.().catch(() => undefined);
  }, [enabled, count]);

  return <LeadsBadgeContext.Provider value={{ count: enabled ? count : 0, refresh }}>{children}</LeadsBadgeContext.Provider>;
}

/** The red count bubble. Hidden at 0. */
export function BadgeBubble({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-4.5 items-center justify-center rounded-full bg-error px-1.5 text-[10.5px] leading-4.5 font-semibold text-white shadow-sm ${className}`}
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
