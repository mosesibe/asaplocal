"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@asaplocal/ui";

export default function NewProviderPage() {
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    setLoading(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Something went wrong");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="text-2xl font-bold">Invite sent</h1>
        <p className="mt-3 text-muted-foreground">
          We've emailed {form.email} a link to set their password. Once they do, they can log in and finish setting up their business.
        </p>
        <Link href="/users/providers" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
          Back to providers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold">New provider</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Creates a provider account and emails them a link to set their own password before continuing.
      </p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First name</label>
              <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Last name</label>
              <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Phone (optional)</label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Link href="/users/providers" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Cancel</Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Sending…" : "Send invite"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
