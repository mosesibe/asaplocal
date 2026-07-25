"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle } from "@asaplocal/ui";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

interface AddressRecord {
  id: string;
  addressLine: string;
  city: string;
  postcode: string | null;
}

export function AddressesSection({ addresses: initial }: { addresses: AddressRecord[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [newLocation, setNewLocation] = useState<LocationValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ addressLine: "", city: "", postcode: "" });

  async function saveNewAddress() {
    if (!newLocation) return;
    setSaving(true);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLocation),
    });
    setSaving(false);
    if (!res.ok) return;
    const data = await res.json();
    setAddresses((prev) => [data.address, ...prev]);
    setAddOpen(false);
    setNewLocation(null);
    router.refresh();
  }

  function startEdit(addr: AddressRecord) {
    setEditingId(addr.id);
    setEditFields({ addressLine: addr.addressLine, city: addr.city, postcode: addr.postcode ?? "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editFields),
    });
    setSaving(false);
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...editFields } : a)));
    setEditingId(null);
    router.refresh();
  }

  async function removeAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/addresses/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Addresses</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {addresses.map((addr) =>
            editingId === addr.id ? (
              <div key={addr.id} className="space-y-2 px-4 py-3.5">
                <Input value={editFields.addressLine} onChange={(e) => setEditFields({ ...editFields, addressLine: e.target.value })} placeholder="Address line" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editFields.city} onChange={(e) => setEditFields({ ...editFields, city: e.target.value })} placeholder="City" />
                  <Input value={editFields.postcode} onChange={(e) => setEditFields({ ...editFields, postcode: e.target.value })} placeholder="Postcode" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => saveEdit(addr.id)} disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div key={addr.id} className="flex items-center gap-3 px-4 py-3.5">
                <MapPin size={18} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{addr.addressLine}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {addr.city}{addr.postcode ? `, ${addr.postcode}` : ""}
                  </p>
                </div>
                <button type="button" aria-label="Edit address" onClick={() => startEdit(addr)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil size={16} />
                </button>
                <button type="button" aria-label="Delete address" onClick={() => removeAddress(addr.id)} className="shrink-0 text-muted-foreground hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add an address</SheetTitle>
          </SheetHeader>
          <LocationPicker value={newLocation} onChange={setNewLocation} />
          <Button type="button" className="mt-4 w-full" onClick={saveNewAddress} disabled={!newLocation || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save address"}
          </Button>
        </SheetContent>
      </Sheet>
    </section>
  );
}
