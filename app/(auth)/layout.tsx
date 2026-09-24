import { BrandMark } from "../../components/shell/BrandMark";

/**
 * Sign-in, register, password and QR pages. Desktop: the dark atelier panel
 * (the same ink as the sidebar) carries the brand lockup and the gold tacking
 * stitch; the form sits on white paper beside it. Phones: brand above the form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app-bg">
      <aside className="relative hidden w-[44%] max-w-155 flex-col justify-between gradient-sidebar px-14 py-12 text-white lg:flex">
        <BrandMark size={52} />
        <div>
          <div className="font-serif text-[64px] leading-none">Needleye</div>
          <div className="mt-3 font-serif text-[22px] text-gold-light italic">by Sakina Ahmed</div>
          <div className="stitch-rule mt-8 w-40" aria-hidden />
        </div>
        <p className="text-sm text-white/50">Couture production, beautifully managed.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="animate-fade-in w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <BrandMark size={56} />
            <div className="text-center">
              <div className="font-serif text-[30px] leading-none text-text-primary">Needleye</div>
              <div className="mt-1.5 font-serif text-[14px] text-gold italic">by Sakina Ahmed</div>
            </div>
          </div>
          <div className="rounded-app-lg border border-border bg-card p-7">{children}</div>
          <p className="mt-6 text-center text-[11px] text-text-muted lg:hidden">Couture production, beautifully managed.</p>
        </div>
      </main>
    </div>
  );
}
