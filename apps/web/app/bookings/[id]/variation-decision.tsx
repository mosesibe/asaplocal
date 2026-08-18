"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, formatPence } from "@asaplocal/ui";

export function VariationDecision({
  bookingId,
  variationId,
  amountPence,
}: {
  bookingId: string;
  variationId: string;
  amountPence: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setLoading(accept ? "accept" : "reject");
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/variations/${variationId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't save your decision");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide(true)} disabled={loading !== null}>
          {loading === "accept" ? "Approving…" : `Approve +${formatPence(amountPence)}`}
        </Button>
        <Button size="sm" variant="outline" onClick={() => decide(false)} disabled={loading !== null}>
          {loading === "reject" ? "Declining…" : "Decline"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Declining keeps the job at its original price — you won't be charged for this.
      </p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
