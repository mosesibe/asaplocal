"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function RefundActions({ refundRequestId }: { refundRequestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function act(decision: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch(`/api/refunds/${refundRequestId}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    setLoading(false);
    router.refresh();
  }
  return (
    <div className="mt-3 flex gap-2">
      <Button size="sm" onClick={() => act("APPROVED")} disabled={loading}>Approve refund</Button>
      <Button size="sm" variant="outline" onClick={() => act("REJECTED")} disabled={loading}>Reject</Button>
    </div>
  );
}
