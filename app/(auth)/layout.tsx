export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-app-lg bg-linear-to-br from-primary to-primary-dark text-xl shadow-app-md">
            🪡
          </div>
          <div className="text-center">
            <div className="font-serif text-xl font-bold text-text-primary">Needle Eye</div>
            <div className="text-[11px] tracking-wide text-text-muted uppercase">Luxury ERP</div>
          </div>
        </div>
        <div className="rounded-app-lg border border-border bg-card p-6 shadow-app-md">{children}</div>
      </div>
    </div>
  );
}
