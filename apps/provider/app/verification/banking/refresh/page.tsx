"use client";
import { useEffect, useState } from "react";
import { Card } from "@asaplocal/ui";

// Stripe redirects here when an Account Link expires before the provider
// finishes onboarding — per Stripe's documented pattern, immediately request
// a fresh link and redirect straight back in, no user interaction needed.
export default function BankingRefreshPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/verification/banking/start", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) window.location.href = data.url;
        else setError(data.message ?? "Something went wrong");
      })
      .catch(() => setError("Something went wrong"));
  }, []);

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Reconnecting…</h1>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : <p className="mt-2 text-sm text-muted-foreground">Redirecting you back to Stripe.</p>}
      </Card>
    </div>
  );
}
