"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

type Action = { action: "change_plan"; plan: "PRO" | "PREMIUM" } | { action: "cancel" } | { action: "resume" };

export function PlanAction({
  body,
  label,
  variant = "default",
  confirm,
  className,
}: {
  body: Action;
  label: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Couldn't update your plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button variant={variant} size="sm" onClick={run} disabled={loading} className="w-full">
        {loading ? "Updating…" : label}
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
