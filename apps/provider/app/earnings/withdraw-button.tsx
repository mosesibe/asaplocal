"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, formatPence } from "@asaplocal/ui";

export function WithdrawButton({ availablePence }: { availablePence: number }) {
  const router = useRouter();
  const availablePounds = (availablePence / 100).toFixed(2);
  const [amount, setAmount] = useState(availablePounds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const pounds = Number(amount);
  const amountPence = Math.round(pounds * 100);
  const valid = Number.isFinite(pounds) && pounds > 0 && amountPence <= availablePence;

  async function withdraw() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Couldn't send your payout");
      setDone(`${formatPence(data.transferredPence)} sent to your bank.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="text-sm text-emerald-600">{done}</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">£</span>
        <Input
          type="number"
          min="0.01"
          max={availablePounds}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28"
        />
        <Button onClick={withdraw} disabled={loading || !valid}>
          {loading ? "Sending…" : "Withdraw"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {formatPence(availablePence)} available.{" "}
        {amountPence < availablePence && (
          <button type="button" className="underline" onClick={() => setAmount(availablePounds)}>
            Withdraw it all
          </button>
        )}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
