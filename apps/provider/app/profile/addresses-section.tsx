"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { Button, Card, Input } from "@asaplocal/ui";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

interface AddressRow {
  id: string;
  label: string | null;
  addressLine: string;
  city: string;
  postcode: string | null;
}

export function AddressesSection({
  addresses,
  primary,
  isSoleTrader,
}: {
  addresses: AddressRow[];
  primary: { addressLine: string | null; city: string; postcode: string | null };
  isSoleTrader: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!location) {
      setError("Choose an address");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label || undefined,
        addressLine: location.addressLine,
        city: location.city,
        postcode: location.postcode,
        lat: location.lat,
        lng: location.lng,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Couldn't save that address");
      return;
    }
    setLabel("");
    setLocation(null);
    setAdding(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/addresses/${id}`, { method: "DELETE" }).catch(() => null);
    setBusyId(null);
    router.refresh();
  }

  return (
    <Card className="max-w-xl space-y-4 p-6">
      <div>
        <h2 className="font-semibold">{isSoleTrader ? "Trading address" : "Addresses"}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isSoleTrader
            ? "Where you're based. This is what we match leads against."
            : "Your main address is used for lead matching. Add branches or sites you also trade from."}
        </p>
      </div>

      <div className="rounded-xl border border-border p-3">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <div className="min-w-0 text-sm">
            <p className="font-medium">
              {primary.addressLine ? `${primary.addressLine}, ` : ""}
              {primary.city}
              {primary.postcode ? `, ${primary.postcode}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">Main address</p>
          </div>
        </div>
      </div>

      {addresses.map((a) => (
        <div key={a.id} className="flex items-start gap-2 rounded-xl border border-border p-3">
          <MapPin size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              {a.addressLine}, {a.city}
              {a.postcode ? `, ${a.postcode}` : ""}
            </p>
            {a.label && <p className="text-xs text-muted-foreground">{a.label}</p>}
          </div>
          <button
            type="button"
            onClick={() => remove(a.id)}
            disabled={busyId === a.id}
            aria-label={`Remove ${a.addressLine}`}
            className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {!isSoleTrader && (
        adding ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Add an address</p>
              <button type="button" onClick={() => { setAdding(false); setError(null); }} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <Input placeholder="Label (e.g. Leeds branch)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <LocationPicker value={location} onChange={setLocation} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={add} disabled={saving} className="w-full">{saving ? "Saving…" : "Save address"}</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)} className="w-full">
            <Plus size={15} /> Add another address
          </Button>
        )
      )}

      {isSoleTrader && (
        <p className="text-xs text-muted-foreground">
          Registered as a sole trader, so you have a single trading address. Change your business type in onboarding if you
          operate from more than one site.
        </p>
      )}
    </Card>
  );
}
