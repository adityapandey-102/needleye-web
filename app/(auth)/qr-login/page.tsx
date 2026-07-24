"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "../../../modules/auth/api/authApi";

/** Reached by scanning a Master Tailor's QR code -- ?token= is the raw QR login token. */
function QrLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    authApi
      .qrLogin({ token })
      .then(() => {
        router.replace("/orders");
        router.refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "This QR code is invalid or has been regenerated."));
  }, [token, router]);

  const message = !token ? "This QR code is missing its login token." : error;

  if (message) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-lg font-bold text-text-primary">QR login failed</h1>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <p className="mt-4 text-xs text-text-muted">Ask your Owner/Manager to regenerate your QR code.</p>
      </div>
    );
  }

  return <p className="text-sm text-text-muted">Signing you in…</p>;
}

export default function QrLoginPage() {
  return (
    <Suspense>
      <QrLoginContent />
    </Suspense>
  );
}
