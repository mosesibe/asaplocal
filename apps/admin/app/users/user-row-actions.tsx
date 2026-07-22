"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function UserRowActions({ userId, status, businessId, verificationStatus }: { userId: string; status: string; businessId?: string; verificationStatus?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleSuspend() {
    setLoading(true);
    await fetch(`/api/users/${userId}/${status === "SUSPENDED" ? "reactivate" : "suspend"}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function verify() {
    setLoading(true);
    await fetch(`/api/businesses/${businessId}/verify`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {businessId && verificationStatus !== "VERIFIED" && (
        <Button size="sm" variant="outline" onClick={verify} disabled={loading}>Verify</Button>
      )}
      <Button size="sm" variant={status === "SUSPENDED" ? "outline" : "destructive"} onClick={toggleSuspend} disabled={loading}>
        {status === "SUSPENDED" ? "Reactivate" : "Suspend"}
      </Button>
    </div>
  );
}
