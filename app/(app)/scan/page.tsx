import { apiFetchServer } from "../../../lib/api/server";
import { Icon } from "../../../components/ui/Icon";

/**
 * Worker landing page. Workers have no dashboard -- they work by scanning an
 * order's QR code, which opens that order (with the "product received / advance
 * stage" popup). This page is just the standing instruction they see after
 * logging in. Any other role can reach it too, but it's the worker's home.
 */
export default async function ScanPage() {
  const { profile } = await apiFetchServer("/auth/me");
  const firstName = profile.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="gradient-primary mb-5 flex h-20 w-20 items-center justify-center rounded-app-xl text-white shadow-primary">
        <Icon name="qr" size={40} />
      </div>
      <h1 className="font-serif text-2xl font-bold text-text-primary">Hi {firstName}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Scan an order&rsquo;s <span className="font-semibold text-text-primary">QR code</span> to open it. When you receive a
        garment for your stage, scanning it lets you confirm and move the order to the next step.
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-app-lg border border-border bg-card px-4 py-3 text-xs text-text-muted shadow-app">
        <Icon name="qr" size={16} className="text-primary" />
        Use your phone camera or the workshop scanner on the order&rsquo;s QR.
      </div>
    </div>
  );
}
