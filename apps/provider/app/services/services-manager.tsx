"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@asaplocal/ui";

interface ServiceRow {
  id: string;
  title: string;
  categoryName: string;
  isActive: boolean;
  durationMins: number | null;
  aiSuggestedDurationMins: number | null;
  priceType: string;
  priceMinPence: number | null;
  priceMaxPence: number | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatPrice(s: ServiceRow) {
  if (s.priceType === "QUOTE_ONLY") return "Quote on request";
  const min = s.priceMinPence != null ? `£${(s.priceMinPence / 100).toFixed(0)}` : "—";
  const max = s.priceMaxPence != null ? ` – £${(s.priceMaxPence / 100).toFixed(0)}` : "";
  return `${min}${max}${s.priceType === "HOURLY" ? " / hr" : ""}`;
}

export function ServicesManager({
  services,
  categories,
  selectedCategoryIds,
}: {
  services: ServiceRow[];
  categories: Category[];
  selectedCategoryIds: string[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function call(url: string, init: RequestInit, id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(url, init).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  function togglePause(s: ServiceRow) {
    return call(
      `/api/services/${s.id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !s.isActive }) },
      s.id
    );
  }

  function remove(s: ServiceRow) {
    return call(`/api/services/${s.id}`, { method: "DELETE" }, s.id);
  }

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{activeCount}</strong> active
        </span>
        {services.length - activeCount > 0 && <span>· {services.length - activeCount} paused</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add-services card sits before the list */}
      <Card
        className="cursor-pointer border-dashed p-5 transition-colors hover:border-brand-400 hover:bg-muted/40"
        onClick={() => setPicking(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPicking(true);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Plus size={20} />
          </span>
          <div>
            <p className="font-semibold">Add more services</p>
            <p className="text-sm text-muted-foreground">Pick extra categories to appear for in the lead marketplace.</p>
          </div>
        </div>
      </Card>

      {picking && (
        <CategoryPicker
          categories={categories}
          alreadySelected={selectedCategoryIds}
          onClose={() => setPicking(false)}
          onDone={() => {
            setPicking(false);
            router.refresh();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <Card key={s.id} className={`p-5 ${s.isActive ? "" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.categoryName}</p>
              </div>
              <Badge variant={s.isActive ? "success" : "outline"}>{s.isActive ? "Active" : "Paused"}</Badge>
            </div>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">{formatPrice(s)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Your duration</dt>
                <dd className="font-medium">{s.durationMins ? formatDuration(s.durationMins) : "Not set"}</dd>
              </div>
              {s.aiSuggestedDurationMins != null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles size={13} className="text-brand-600" /> AI suggests
                  </dt>
                  <dd className="font-medium text-brand-700">{formatDuration(s.aiSuggestedDurationMins)}</dd>
                </div>
              )}
            </dl>

            {editing === s.id ? (
              <ServiceEditor service={s} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={s.isActive ? "outline" : "default"}
                  onClick={() => togglePause(s)}
                  disabled={busyId === s.id}
                  aria-label={s.isActive ? `Pause ${s.title}` : `Resume ${s.title}`}
                >
                  {s.isActive ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(s.id)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(s)}
                  disabled={busyId === s.id}
                  aria-label={`Remove ${s.title}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <p className="text-sm text-muted-foreground">No services yet — add some above to start receiving leads.</p>
      )}
    </div>
  );
}

function ServiceEditor({ service, onClose, onSaved }: { service: ServiceRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: service.title,
    priceType: service.priceType,
    priceMinPence: service.priceMinPence != null ? String(service.priceMinPence / 100) : "",
    priceMaxPence: service.priceMaxPence != null ? String(service.priceMaxPence / 100) : "",
    durationMins: service.durationMins != null ? String(service.durationMins) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        priceType: form.priceType,
        priceMinPence: form.priceMinPence ? Math.round(Number(form.priceMinPence) * 100) : null,
        priceMaxPence: form.priceMaxPence ? Math.round(Number(form.priceMaxPence) * 100) : null,
        durationMins: form.durationMins ? Number(form.durationMins) : null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Couldn't save");
      return;
    }
    onSaved();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Service name" />
      <Select value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
        <option value="QUOTE_ONLY">Quote on request</option>
        <option value="FIXED">Fixed price</option>
        <option value="HOURLY">Hourly rate</option>
      </Select>
      {form.priceType !== "QUOTE_ONLY" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} placeholder="From £" value={form.priceMinPence} onChange={(e) => setForm({ ...form, priceMinPence: e.target.value })} />
          <Input type="number" min={0} placeholder="To £ (optional)" value={form.priceMaxPence} onChange={(e) => setForm({ ...form, priceMaxPence: e.target.value })} />
        </div>
      )}
      <div>
        <Input
          type="number"
          min={5}
          max={1440}
          placeholder="Typical duration (minutes)"
          value={form.durationMins}
          onChange={(e) => setForm({ ...form, durationMins: e.target.value })}
        />
        {service.aiSuggestedDurationMins != null && (
          <button
            type="button"
            onClick={() => setForm({ ...form, durationMins: String(service.aiSuggestedDurationMins) })}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <Sparkles size={12} /> Use AI suggestion ({formatDuration(service.aiSuggestedDurationMins)})
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}

function CategoryPicker({
  categories,
  alreadySelected,
  onClose,
  onDone,
}: {
  categories: Category[];
  alreadySelected: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taken = new Set(alreadySelected);
  const parents = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }

  function toggle(slug: string) {
    setSlugs((prev) => {
      const selecting = !prev.includes(slug);
      const category = categories.find((c) => c.slug === slug);
      if (category && !category.parentId) {
        const childSlugs = (childrenByParent.get(category.id) ?? []).filter((c) => !taken.has(c.id)).map((c) => c.slug);
        const without = prev.filter((s) => s !== slug && !childSlugs.includes(s));
        return selecting ? [...without, slug, ...childSlugs] : without;
      }
      return selecting ? [...prev, slug] : prev.filter((s) => s !== slug);
    });
  }

  async function save() {
    if (slugs.length === 0) return onClose();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlugs: slugs }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Couldn't add those services");
      return;
    }
    onDone();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Add services</p>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border p-3">
        {parents.map((parent) => {
          const children = (childrenByParent.get(parent.id) ?? []).filter((c) => !taken.has(c.id));
          const parentTaken = taken.has(parent.id);
          if (parentTaken && children.length === 0) return null;
          return (
            <div key={parent.id}>
              {!parentTaken && (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={slugs.includes(parent.slug)} onChange={() => toggle(parent.slug)} />
                  {parent.name}
                </label>
              )}
              {parentTaken && <p className="text-sm font-medium text-muted-foreground">{parent.name} <span className="text-xs">(added)</span></p>}
              <div className="ml-6 mt-1 space-y-1">
                {children.map((child) => (
                  <label key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={slugs.includes(child.slug)} onChange={() => toggle(child.slug)} />
                    {child.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={save} disabled={saving || slugs.length === 0} className="flex-1">
          {saving ? "Adding…" : `Add ${slugs.length || ""}`.trim()}
        </Button>
      </div>
    </Card>
  );
}
