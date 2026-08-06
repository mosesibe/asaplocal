"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function ToggleActiveButton({ staffId, isActive }: { staffId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/staff/${staffId}/toggle-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant={isActive ? "outline" : "default"} onClick={toggle} disabled={loading}>
      {loading ? "…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
