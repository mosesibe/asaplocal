"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Input, Select } from "@asaplocal/ui";

export function SearchFilters({
  categories,
  initial,
  onApplied,
}: {
  categories: { slug: string; name: string }[];
  initial: Record<string, string | undefined>;
  onApplied?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [form, setForm] = useState({
    category: initial.category ?? "",
    city: initial.city ?? "",
    minRating: initial.minRating ?? "",
    minPrice: initial.minPrice ?? "",
    maxPrice: initial.maxPrice ?? "",
    radius: initial.radius ?? "25",
  });

  function apply() {
    const next = new URLSearchParams(params.toString());
    Object.entries(form).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`${pathname}?${next.toString()}`);
    onApplied?.();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Category</label>
        <Select className="mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">City</label>
        <Input className="mt-1" placeholder="e.g. Manchester" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Minimum rating</label>
        <Select className="mt-1" value={form.minRating} onChange={(e) => setForm({ ...form, minRating: e.target.value })}>
          <option value="">Any</option>
          {[3, 3.5, 4, 4.5].map((r) => (
            <option key={r} value={r}>
              {r}+ stars
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium">Min £/hr</label>
          <Input type="number" className="mt-1" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Max £/hr</label>
          <Input type="number" className="mt-1" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Distance (miles)</label>
        <input type="range" min={1} max={50} className="mt-1 w-full" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
        <p className="text-xs text-muted-foreground">{form.radius} miles</p>
      </div>
      <Button className="w-full" onClick={apply}>
        Apply filters
      </Button>
    </div>
  );
}
