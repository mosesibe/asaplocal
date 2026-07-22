"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";

const CATEGORIES = ["cleaners", "plumbers", "electricians", "gardeners", "handymen", "movers", "tutors", "pet-sitters"];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", city: "", postcode: "", categorySlug: "cleaners", baseRadiusMiles: 15 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Set up your business profile</h1>
      <p className="mt-1 text-muted-foreground">Takes 2 minutes — you'll get 2 free lead credits to try the marketplace.</p>
      <Card className="mt-6 space-y-4 p-6">
        <Input placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea placeholder="Describe your business (20+ characters)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
        <Select value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="Postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Service radius: {form.baseRadiusMiles} miles</label>
          <input type="range" min={1} max={50} value={form.baseRadiusMiles} onChange={(e) => setForm({ ...form, baseRadiusMiles: Number(e.target.value) })} className="w-full" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create business profile"}</Button>
      </Card>
    </div>
  );
}
