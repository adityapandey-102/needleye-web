"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { LoginQrCard } from "./LoginQrCard";

export type RevealModal =
  | { kind: "password"; name: string; password: string }
  | { kind: "qr"; name: string; roleLabel: string; token: string; loginUrl: string };

/**
 * Shown exactly once, right after a password/QR is generated -- neither value
 * can be retrieved again afterward (only the hash is stored server-side), so
 * this is the only chance to note it down or hand it to the account holder. A
 * password can be copied; a QR renders as a printable/downloadable login card.
 */
export function CredentialRevealOverlay({ reveal, onClose }: { reveal: RevealModal; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    if (reveal.kind !== "password") return;
    try {
      await navigator.clipboard.writeText(reveal.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) -- the password is still visible to copy manually.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-app-lg border border-border bg-card p-6 text-center shadow-app-md"
        onClick={(e) => e.stopPropagation()}
      >
        {reveal.kind === "password" ? (
          <>
            <h2 className="font-serif text-lg font-bold text-text-primary">Password for {reveal.name}</h2>
            <p className="mt-1 text-xs text-text-muted">Shown once -- copy or note it down now. It cannot be shown again after you close this.</p>
            <div className="mt-4 rounded-app-sm border border-border bg-primary-bg/40 px-4 py-3 font-mono text-base tracking-wide text-text-primary">
              {reveal.password}
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={copyPassword}>
              {copied ? "✓ Copied" : "📋 Copy password"}
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-serif text-lg font-bold text-text-primary">QR login for {reveal.name}</h2>
            <p className="mt-1 text-xs text-text-muted">
              Shown once -- print or save this card now. Scanning it logs {reveal.name} straight in. Regenerating replaces it immediately.
            </p>
            <div className="mt-4">
              <LoginQrCard fullName={reveal.name} roleLabel={reveal.roleLabel} loginUrl={reveal.loginUrl} />
            </div>
            <p className="mt-3 break-all font-mono text-[10px] text-text-muted">{reveal.loginUrl}</p>
          </>
        )}
        <Button className="mt-5 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
