"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@asaplocal/ui";

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).message ?? "Something went wrong"); return; }
    setDone(true);
  }

  if (done) return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold">Check your inbox</h1>
      <p className="mt-3 text-muted-foreground">Verify your email, then log in to set up your business profile.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">List your business on AsapLocal</h1>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Sign up as a provider"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already listed? <Link href="/login" className="font-medium text-brand-700 hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
