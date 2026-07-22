"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function ReviewModerationActions({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function act(decision: "PUBLISH" | "HIDE") {
    setLoading(true);
    await fetch(`/api/reviews/${reviewId}/moderate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    setLoading(false);
    router.refresh();
  }
  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" onClick={() => act("PUBLISH")} disabled={loading}>Approve &amp; publish</Button>
      <Button size="sm" variant="destructive" onClick={() => act("HIDE")} disabled={loading}>Hide</Button>
    </div>
  );
}
