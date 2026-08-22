"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, PasswordInput } from "@asaplocal/ui";
import { AuthBrand } from "@/components/auth-brand";

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
      setError("Incorrect email or password");
    } else {
      // The root layout reads the session server-side (for ProviderShell) —
      // a client-side router.push() here can leave Next.js's client router
      // cache serving the pre-login (shell-less) render of that layout. A
      // full navigation guarantees the layout re-renders with the new session.
      window.location.href = params.get("callbackUrl") ?? "/dashboard";
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <AuthBrand />
      {/* The lockup already reads "AsapLocal Business", so the old heading
          would have repeated the brand twice on one screen. */}
      <h1 className="mt-6 text-2xl font-bold">Log in to your account</h1>
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
        <p className="mt-2 text-center text-sm text-muted-foreground">
          New provider? <Link href="/register" className="font-medium text-brand-700 hover:underline">List your business</Link>
        </p>
      </Card>
    </div>
  );
}
