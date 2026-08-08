"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, PasswordInput } from "@asaplocal/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
    else setError((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  if (!email || !token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Invalid reset link</h1>
        <p className="mt-3 text-muted-foreground">This password reset link is missing required information.</p>
        <Link href="/forgot-password" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="mt-3 text-muted-foreground">Your password has been reset. You can now log in with your new password.</p>
        <Button className="mt-6 w-full" onClick={() => router.push("/login")}>Go to login</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24 sm:px-6">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordInput required placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordInput required placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
        </form>
      </Card>
    </div>
  );
}
