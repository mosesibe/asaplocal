"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, Card, Input, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface SupplyRow {
  id: string;
  name: string;
  description: string | null;
  pricePence: number | null;
  unit: string | null;
  imageUrl: string | null;
  inStock: boolean;
}

const EMPTY = { name: "", description: "", price: "", unit: "", imageUrl: "" };

export function SuppliesManager({ supplies }: { supplies: SupplyRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, "supply-image");
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        pricePence: form.price ? Math.round(Number(form.price) * 100) : null,
        unit: form.unit || undefined,
        imageUrl: form.imageUrl || undefined,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Couldn't add that product");
      return;
    }
    setForm(EMPTY);
    setAdding(false);
    router.refresh();
  }

  async function toggleStock(s: SupplyRow) {
    setBusyId(s.id);
    setError(null);
    await fetch(`/api/supplies/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inStock: !s.inStock }),
    }).catch(() => null);
    setBusyId(null);
    router.refresh();
  }

  async function remove(s: SupplyRow) {
    setBusyId(s.id);
    setError(null);
    await fetch(`/api/supplies/${s.id}`, { method: "DELETE" }).catch(() => null);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {adding ? (
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">New product</p>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); }} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <Input placeholder="Product name (e.g. Chrome basin tap)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea rows={3} placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} step="0.01" placeholder="Price £ (optional)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input placeholder="Unit (e.g. each)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <div className="flex items-center gap-3">
              {form.imageUrl && <img src={form.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : form.imageUrl ? "Replace photo" : "Add photo"}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAdding(false); setForm(EMPTY); }} className="flex-1">Cancel</Button>
            <Button onClick={create} disabled={saving || form.name.trim().length < 2} className="flex-1">
              {saving ? "Adding…" : "Add product"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          className="cursor-pointer border-dashed p-5 transition-colors hover:border-brand-400 hover:bg-muted/40"
          onClick={() => setAdding(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAdding(true);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Plus size={20} />
            </span>
            <div>
              <p className="font-semibold">Add a product</p>
              <p className="text-sm text-muted-foreground">List parts and materials customers can buy from you.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {supplies.map((s) => (
          <Card key={s.id} className={`p-4 ${s.inStock ? "" : "opacity-70"}`}>
            <div className="flex gap-3">
              {s.imageUrl ? (
                <img src={s.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Package size={22} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold">{s.name}</p>
                  <Badge variant={s.inStock ? "success" : "outline"}>{s.inStock ? "In stock" : "Out of stock"}</Badge>
                </div>
                {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-1.5 text-sm font-medium">
                  {s.pricePence != null ? `£${(s.pricePence / 100).toFixed(2)}` : "Price on request"}
                  {s.unit ? <span className="font-normal text-muted-foreground"> · {s.unit}</span> : null}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleStock(s)} disabled={busyId === s.id}>
                {s.inStock ? "Mark out of stock" : "Mark in stock"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s)} disabled={busyId === s.id} aria-label={`Remove ${s.name}`}>
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {supplies.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No products listed yet.</p>
      )}
    </div>
  );
}
