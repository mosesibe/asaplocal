"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@asaplocal/ui";

export default function LoginPage() {
  const router = useRouter();
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
    if (res?.error) setError("Incorrect email or password");
    else router.push(params.get("callbackUrl") ?? "/dashboard");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Log in"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: params.get("callbackUrl") ?? "/dashboard" })}>
          Continue with Google
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          No account? <Link href="/register" className="font-medium text-brand-700 hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
