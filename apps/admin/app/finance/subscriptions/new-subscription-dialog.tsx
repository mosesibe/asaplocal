"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, Select } from "@asaplocal/ui";

export function NewSubscriptionDialog({ businesses }: { businesses: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [plan, setPlan] = useState("PRO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/finance/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, plan }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Couldn't create subscription");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add new
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant a subscription</DialogTitle>
          </DialogHeader>
          {businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every business already has a subscription.</p>
          ) : (
            <div className="space-y-3">
              <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
                <option value="ENTERPRISE">Enterprise</option>
              </Select>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm" variant="outline">Cancel</Button>
            </DialogClose>
            {businesses.length > 0 && (
              <Button size="sm" onClick={submit} disabled={loading || !businessId}>
                {loading ? "Creating…" : "Create"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
