"use client";
import { useState } from "react";
import { Button } from "@asaplocal/ui";

export function CheckoutButton({ kind, className }: { kind: "SUBSCRIPTION_PRO" | "SUBSCRIPTION_PREMIUM" | "CREDITS_SMALL" | "CREDITS_LARGE"; className?: string }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }
  return <Button className={className} onClick={go} disabled={loading}>{loading ? "Redirecting…" : kind.startsWith("SUBSCRIPTION") ? "Upgrade" : "Buy credits"}</Button>;
}
