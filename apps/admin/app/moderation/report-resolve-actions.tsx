"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function ReportResolveActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function act(decision: "RESOLVED" | "DISMISSED") {
    setLoading(true);
    await fetch(`/api/reports/${reportId}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    setLoading(false);
    router.refresh();
  }
  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" onClick={() => act("RESOLVED")} disabled={loading}>Mark resolved</Button>
      <Button size="sm" variant="outline" onClick={() => act("DISMISSED")} disabled={loading}>Dismiss</Button>
    </div>
  );
}
