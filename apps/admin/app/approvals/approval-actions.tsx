"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setLoading(decision);
    await fetch(`/api/approvals/${approvalId}/decide`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2">
      <Button size="sm" onClick={() => decide("APPROVED")} disabled={loading !== null}>{loading === "APPROVED" ? "…" : "Approve"}</Button>
      <Button size="sm" variant="outline" onClick={() => decide("REJECTED")} disabled={loading !== null}>{loading === "REJECTED" ? "…" : "Reject"}</Button>
    </div>
  );
}
