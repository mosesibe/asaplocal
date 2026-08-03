"use client";
import { useState } from "react";
import { Button } from "@asaplocal/ui";

export function StartBankingButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/verification/banking/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={start} disabled={loading}>{loading ? "Starting…" : label}</Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
