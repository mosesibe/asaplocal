"use client";

import { useState } from "react";
import { Button, formatPence } from "@asaplocal/ui";

export function PayBalanceButton({ bookingId, outstandingPence }: { bookingId: string; outstandingPence: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentKind: "BOOKING_BALANCE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message ?? "Couldn't start checkout — please try again.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="lg" className="w-full" onClick={pay} disabled={loading}>
        {loading ? "Redirecting…" : `Pay balance — ${formatPence(outstandingPence)}`}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
