"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, PasswordInput } from "@asaplocal/ui";

export default function LoginPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password, or this account isn't staff.");
    } else {
      // The root layout reads the session server-side (for AdminShell) — a
      // client-side router.push() here can leave Next.js's client router
      // cache serving the pre-login (shell-less) render of that layout. A
      // full navigation guarantees the layout re-renders with the new session.
      window.location.href = params.get("callbackUrl") ?? "/";
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24 sm:px-6">
      <h1 className="text-2xl font-bold">AsapLocal Staff</h1>
      <p className="mt-1 text-sm text-muted-foreground">Admin &amp; dispatcher sign-in.</p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Log in"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
        </p>
      </Card>
    </div>
  );
}
