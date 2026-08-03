"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

type Decision = "VERIFIED" | "REJECTED" | "MORE_INFO_REQUESTED";

/** Shared approve/reject/request-more-info control for every verification phase — POSTs { decision, reviewNote } to `endpoint`. */
export function DecisionActions({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    setLoading(decision);
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reviewNote: reviewNote || undefined }) });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        placeholder="Review note (optional)"
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        className="w-full rounded-lg border border-border bg-background p-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide("VERIFIED")} disabled={loading !== null}>{loading === "VERIFIED" ? "…" : "Approve"}</Button>
        <Button size="sm" variant="outline" onClick={() => decide("MORE_INFO_REQUESTED")} disabled={loading !== null}>
          {loading === "MORE_INFO_REQUESTED" ? "…" : "Request more info"}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => decide("REJECTED")} disabled={loading !== null}>{loading === "REJECTED" ? "…" : "Reject"}</Button>
      </div>
    </div>
  );
}
