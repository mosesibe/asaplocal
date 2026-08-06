"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select } from "@asaplocal/ui";

export function RecordPayoutForm({ businesses }: { businesses: { id: string; name: string; balancePence: number }[] }) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selected = businesses.find((b) => b.id === businessId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountPence = Math.round(parseFloat(amount) * 100);
    if (!amountPence || amountPence <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/finance/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, amountPence, method, reference: reference || undefined, paidAt }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Couldn't record payout");
      return;
    }
    setAmount("");
    setReference("");
    setSuccess(true);
    router.refresh();
  }

  if (businesses.length === 0) {
    return <p className="text-sm text-muted-foreground">No providers found.</p>;
  }

  return (
    <Card className="max-w-lg p-5">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Provider</label>
          <Select value={businessId} onChange={(e) => { setBusinessId(e.target.value); setSuccess(false); }} className="mt-1">
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          {selected && (
            <p className="mt-1 text-xs text-muted-foreground">
              Outstanding balance: £{(selected.balancePence / 100).toFixed(2)}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Amount (£)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setSuccess(false); }}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Method</label>
            <input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Reference (optional)</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. bank transfer ref"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Payout recorded.</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Recording…" : "Record payout"}
        </Button>
      </form>
    </Card>
  );
}
