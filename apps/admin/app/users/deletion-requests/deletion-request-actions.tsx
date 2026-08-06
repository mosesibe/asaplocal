"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function DeletionRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(decision: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch(`/api/users/deletion-requests/${requestId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="destructive" onClick={() => act("APPROVED")} disabled={loading}>
        Approve deletion
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("REJECTED")} disabled={loading}>
        Reject
      </Button>
    </div>
  );
}
