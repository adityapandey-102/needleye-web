"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { hasCapability, type Profile } from "../../lib/domain";
import { Sidebar } from "./Sidebar";
import { BrandMark } from "./BrandMark";
import { Icon } from "../ui/Icon";
import { BadgeBubble, LeadsBadgeProvider, useLeadsBadge } from "../../modules/leads/components/LeadsBadgeProvider";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <LeadsBadgeProvider enabled={hasCapability(profile.role, "leads:read")}>
      <Shell profile={profile}>{children}</Shell>
    </LeadsBadgeProvider>
  );
}

function Shell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { count: leadsBadge } = useLeadsBadge();

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col xl:ml-65 print:ml-0">
        {/* Phones and tablets only: the menu button and the brand. On desktop the
            sidebar carries both, so an empty bar would just take space. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md xl:hidden print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-app p-2 text-text-secondary transition-colors hover:bg-app-bg"
            aria-label={leadsBadge > 0 ? `Open menu (${leadsBadge} new ${leadsBadge === 1 ? "lead" : "leads"})` : "Open menu"}
          >
            <Icon name="menu" size={20} />
          </button>

          {/* Brand context for mobile/tablet, where the sidebar is hidden. With the
              menu closed, the Leads count sits on the logo -- like an app icon's badge. */}
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex">
              <BrandMark size={32} />
              <BadgeBubble count={leadsBadge} className="absolute -top-1.5 -right-2 ring-2 ring-card" />
            </span>
            <span className="font-serif text-[18px] text-text-primary">Needleye</span>
          </div>
        </header>

        <main className="flex-1 bg-app-bg px-4 py-5 sm:px-6 lg:px-10 lg:py-9 print:bg-white print:p-0">
          {/* key on pathname so each route change replays the entrance animation */}
          <div key={pathname} className="animate-fade-in mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
