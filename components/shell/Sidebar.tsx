"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@needleye/shared";
import { ROLE_LABELS } from "@needleye/shared";
import { visibleNavSections } from "./nav-config";
import { createClient } from "../../lib/supabase/client";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = visibleNavSections(profile.role);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-sidebar transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-app bg-linear-to-br from-primary to-primary-dark text-lg">
              🪡
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-[15px] leading-tight font-bold text-white">Needle Eye</span>
              <span className="text-[10px] text-white/45">Luxury ERP</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-white/35 uppercase">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = item.href ? pathname?.startsWith(item.href) : false;
                if (item.comingSoon || !item.href) {
                  return (
                    <div
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-app px-3 py-2 text-sm text-white/30"
                      title="Coming soon"
                    >
                      <span className="w-4 text-center">{item.icon}</span>
                      {item.label}
                      <span className="ml-auto text-[9px] tracking-wide uppercase">Soon</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 rounded-app px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-white/10 font-medium text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="w-4 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials(profile.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{profile.fullName}</div>
              <div className="truncate text-[11px] text-white/45">{ROLE_LABELS[profile.role]}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full rounded-app border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
