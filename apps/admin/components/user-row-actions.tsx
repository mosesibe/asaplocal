"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@asaplocal/ui";

export function UserRowActions({ userId, status, businessId }: { userId: string; status: string; businessId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function callAction(action: "suspend" | "reactivate" | "deactivate") {
    setLoading(true);
    await fetch(`/api/users/${userId}/${action}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  const isInactive = status === "SUSPENDED" || status === "DEACTIVATED";

  return (
    <div className="flex gap-2">
      {businessId && (
        <Link href={`/operations/verification/${businessId}`}>
          <Button size="sm" variant="outline">View verification →</Button>
        </Link>
      )}
      {isInactive ? (
        <Button size="sm" variant="outline" onClick={() => callAction("reactivate")} disabled={loading}>
          Reactivate
        </Button>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={() => callAction("suspend")} disabled={loading}>
            Suspend
          </Button>
          <Button size="sm" variant="destructive" onClick={() => callAction("deactivate")} disabled={loading}>
            Deactivate
          </Button>
        </>
      )}
    </div>
  );
}
