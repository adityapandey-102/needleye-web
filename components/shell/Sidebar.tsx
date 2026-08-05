"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS, type Profile } from "../../lib/domain";
import { visibleNavSections } from "./nav-config";
import { BrandMark } from "./BrandMark";
import { Icon } from "../ui/Icon";
import { authApi } from "../../modules/auth/api/authApi";

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
    await authApi.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`gradient-sidebar fixed top-0 left-0 z-50 flex h-screen w-65 flex-col shadow-app-lg transition-transform duration-300 ease-out lg:translate-x-0 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandMark size={40} className="ring-1 ring-gold/30" />
            <div className="flex flex-col">
              <span className="font-serif text-[16px] leading-tight font-bold text-white">Needleye</span>
              <span className="text-[10px] tracking-[0.16em] text-gold-light/80 uppercase">by Sakina Ahmed</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = item.href ? pathname?.startsWith(item.href) : false;
                if (item.comingSoon || !item.href) {
                  return (
                    <div
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-3 rounded-app px-3 py-2 text-sm text-white/30"
                      title="Coming soon"
                    >
                      <Icon emoji={item.icon} size={17} className="opacity-80" />
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
                    className={`group relative mb-0.5 flex items-center gap-3 rounded-app px-3 py-2 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {/* Gold active indicator */}
                    <span
                      className={`gradient-gold absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity duration-200 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <Icon
                      emoji={item.icon}
                      size={17}
                      className={`transition-transform duration-200 ${isActive ? "text-gold-light" : "group-hover:scale-110"}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <div className="gradient-gold ring-gold-light/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-dark ring-2">
              {initials(profile.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{profile.fullName}</div>
              <div className="truncate text-[11px] text-gold-light/70">{ROLE_LABELS[profile.role]}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full rounded-app border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
