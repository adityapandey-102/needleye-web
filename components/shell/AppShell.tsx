"use client";

import { useState } from "react";
import type { Profile } from "../../lib/domain";
import { Sidebar } from "./Sidebar";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px] print:ml-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-app p-2 text-text-secondary hover:bg-primary-bg lg:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
        </header>

        <main className="flex-1 bg-app-bg p-4 lg:p-6 print:bg-white print:p-0">{children}</main>
      </div>
    </div>
  );
}
