"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function SuspendOwnerButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/users/${userId}/${suspended ? "reactivate" : "suspend"}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant={suspended ? "outline" : "destructive"} onClick={toggle} disabled={loading}>
      {suspended ? "Reactivate business" : "Suspend business"}
    </Button>
  );
}
