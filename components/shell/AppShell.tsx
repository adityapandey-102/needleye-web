"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Profile } from "../../lib/domain";
import { Sidebar } from "./Sidebar";
import { BrandMark } from "./BrandMark";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-65 print:ml-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-card/80 px-4 backdrop-blur-md lg:px-6 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-app p-2 text-text-secondary transition-colors hover:bg-primary-bg active:scale-95 lg:hidden"
            aria-label="Open menu"
          >
            <span className="text-lg">☰</span>
          </button>

          {/* Brand context for mobile/tablet, where the sidebar is hidden. */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark size={32} />
            <span className="font-serif text-[15px] font-bold text-text-primary">Needleye</span>
          </div>
        </header>

        <main className="flex-1 bg-app-bg p-4 lg:p-6 print:bg-white print:p-0">
          {/* key on pathname so each route change replays the entrance animation */}
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
