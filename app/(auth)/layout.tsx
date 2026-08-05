import { BrandMark } from "../../components/shell/BrandMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-bg px-4 py-10">
      {/* Decorative atelier ambience — soft burgundy + taupe light, purely cosmetic. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(179,154,120,0.45), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 h-112 w-112 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(122,29,52,0.24), transparent 70%)" }}
      />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandMark size={64} className="shadow-app-lg ring-1 ring-gold/25" />
          <div className="text-center">
            <div className="font-serif text-2xl font-bold text-text-primary">Needleye</div>
            <div className="text-[11px] tracking-[0.22em] text-gold uppercase">by Sakina Ahmed</div>
          </div>
        </div>
        <div className="card-accent-top rounded-app-lg border border-border bg-card p-6 shadow-app-lg">{children}</div>
        <p className="mt-6 text-center text-[11px] text-text-muted">Couture production, beautifully managed.</p>
      </div>
    </div>
  );
}
