"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/Button";
import { FieldError, FieldLabel, Input } from "../../../components/ui/Field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(searchParams.get("next") || "/orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-lg font-bold text-text-primary">Sign in</h1>
        <p className="text-xs text-text-muted">Staff access is invite-only. Contact your manager if you need an account.</p>
      </div>

      <div>
        <FieldLabel required>Email</FieldLabel>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@needleeye.app"
        />
      </div>

      <div>
        <FieldLabel required>Password</FieldLabel>
        <Input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={loading} className="mt-1 w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <Link href="/reset-password" className="hover:text-primary">
          Forgot password?
        </Link>
        <Link href="/register" className="hover:text-primary">
          First-time setup
        </Link>
      </div>
    </form>
  );
}
