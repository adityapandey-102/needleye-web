"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authApi";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";

export function RegisterForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ownerExists, setOwnerExists] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authApi
      .bootstrapStatus()
      .then((data) => setOwnerExists(Boolean(data.ownerExists)))
      .catch(() => setOwnerExists(true))
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.bootstrap({ email, password, fullName });
      await authApi.login({ email, password });

      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-text-muted">Checking setup status…</p>;
  }

  if (ownerExists) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-lg font-bold text-text-primary">Invite-only</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Needle Eye is already set up. Ask your Owner/Manager to invite you from Administration →
          User Management.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-lg font-bold text-text-primary">First-time setup</h1>
        <p className="text-xs text-text-muted">
          No Owner/Manager account exists yet. Create the first one -- every other account will be
          invited from here afterward.
        </p>
      </div>

      <div>
        <FieldLabel required>Full name</FieldLabel>
        <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Aditya Pandey" />
      </div>

      <div>
        <FieldLabel required>Email</FieldLabel>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <FieldLabel required>Password</FieldLabel>
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={loading} className="mt-1 w-full">
        {loading ? "Creating account…" : "Create Owner/Manager account"}
      </Button>
    </form>
  );
}
