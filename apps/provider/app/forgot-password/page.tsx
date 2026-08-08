"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@asaplocal/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
    else setError((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="mt-3 text-muted-foreground">
          If an account exists for {email}, we've sent a link to reset your password. The link expires in 1 hour.
        </p>
        <Link href="/login" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-1 text-muted-foreground">Enter your email and we'll send you a link to reset it.</p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">Back to log in</Link>
        </p>
      </Card>
    </div>
  );
}
