"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@asaplocal/ui";

export function UserRowActions({ userId, status, businessId }: { userId: string; status: string; businessId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleSuspend() {
    setLoading(true);
    await fetch(`/api/users/${userId}/${status === "SUSPENDED" ? "reactivate" : "suspend"}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {businessId && (
        <Link href={`/verification/${businessId}`}>
          <Button size="sm" variant="outline">View verification →</Button>
        </Link>
      )}
      <Button size="sm" variant={status === "SUSPENDED" ? "outline" : "destructive"} onClick={toggleSuspend} disabled={loading}>
        {status === "SUSPENDED" ? "Reactivate" : "Suspend"}
      </Button>
    </div>
  );
}
