"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, formatPence } from "@asaplocal/ui";

export function WithdrawButton({ availablePence }: { availablePence: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function withdraw() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts/withdraw", { method: "POST" });
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
    <div>
      <Button onClick={withdraw} disabled={loading || availablePence <= 0}>
        {loading ? "Sending…" : `Withdraw ${formatPence(availablePence)}`}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
