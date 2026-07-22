"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@asaplocal/ui";

export function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setLoading(false);
    setName("");
    router.refresh();
  }

  return (
    <Card className="flex gap-2 p-4">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 rounded-lg border border-border bg-background p-2 text-sm" />
      <Button size="sm" onClick={submit} disabled={loading || !name}>Add</Button>
    </Card>
  );
}
