"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@asaplocal/ui";

export function StaffRowActions({
  userId,
  role,
  status,
  isSelf,
}: {
  userId: string;
  role: string;
  status: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRoleChange(next: string) {
    setLoading(true);
    await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setLoading(false);
    router.refresh();
  }

  async function toggleSuspend() {
    setLoading(true);
    await fetch(`/api/users/${userId}/${status === "SUSPENDED" ? "reactivate" : "suspend"}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (isSelf) return <span className="text-xs text-muted-foreground">(you)</span>;

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onChange={(e) => onRoleChange(e.target.value)} disabled={loading} className="h-9 w-36 text-sm">
        <option value="ADMIN">Admin</option>
        <option value="DISPATCHER">Dispatcher</option>
      </Select>
      <Button size="sm" variant={status === "SUSPENDED" ? "outline" : "destructive"} onClick={toggleSuspend} disabled={loading}>
        {status === "SUSPENDED" ? "Reactivate" : "Suspend"}
      </Button>
    </div>
  );
}
