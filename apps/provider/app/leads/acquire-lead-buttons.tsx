"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function AcquireLeadButtons({ leadId, pricePence, hasAllowance, hasCredits }: { leadId: string; pricePence: number; hasAllowance: boolean; hasCredits: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function acquireFree() {
    setLoading("free");
    const res = await fetch(`/api/leads/${leadId}/acquire`, { method: "POST" });
    setLoading(null);
    if (res.ok) router.push(`/leads/${leadId}`);
    else alert((await res.json()).message ?? "Couldn't acquire lead");
  }

  async function purchase() {
    setLoading("card");
    const res = await fetch(`/api/leads/${leadId}/purchase`, { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {(hasAllowance || hasCredits) && (
        <Button size="sm" onClick={acquireFree} disabled={loading !== null}>
          {loading === "free" ? "Claiming…" : hasAllowance ? "Use plan allowance" : "Use 1 credit"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={purchase} disabled={loading !== null}>
        {loading === "card" ? "Redirecting…" : `Buy for £${(pricePence / 100).toFixed(2)}`}
      </Button>
    </div>
  );
}
