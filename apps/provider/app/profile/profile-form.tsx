"use client";
import { useState } from "react";
import { Button, Card, Input, Textarea } from "@asaplocal/ui";

export function ProfileForm({ business }: { business: { description: string; logoUrl: string; coverImageUrl: string; phone: string; website: string; baseRadiusMiles: number } }) {
  const [form, setForm] = useState(business);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/business", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setSaved(true);
  }

  return (
    <Card className="max-w-xl space-y-4 p-6">
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Logo URL</label>
          <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Cover image URL</label>
          <Input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} className="mt-1" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Upload images via the S3 presigned-upload endpoint, then paste the resulting URL here (handled automatically by the image picker in production).</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Phone</label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Service radius: {form.baseRadiusMiles} miles</label>
        <input type="range" min={1} max={50} value={form.baseRadiusMiles} onChange={(e) => setForm({ ...form, baseRadiusMiles: Number(e.target.value) })} className="w-full" />
      </div>
      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
      <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
    </Card>
  );
}
