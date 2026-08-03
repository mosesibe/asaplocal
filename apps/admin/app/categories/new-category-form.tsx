"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@asaplocal/ui";

export function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isRegulatedTrade, setIsRegulatedTrade] = useState(false);
  const [suggestedQualifications, setSuggestedQualifications] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        isRegulatedTrade,
        suggestedQualifications: suggestedQualifications
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setLoading(false);
    setName("");
    setIsRegulatedTrade(false);
    setSuggestedQualifications("");
    router.refresh();
  }

  return (
    <Card className="space-y-2 p-4">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 rounded-lg border border-border bg-background p-2 text-sm" />
        <Button size="sm" onClick={submit} disabled={loading || !name}>Add</Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={isRegulatedTrade} onChange={(e) => setIsRegulatedTrade(e.target.checked)} />
        Regulated trade (prompts providers for qualifications)
      </label>
      {isRegulatedTrade && (
        <input
          value={suggestedQualifications}
          onChange={(e) => setSuggestedQualifications(e.target.value)}
          placeholder="Suggested qualifications, comma-separated (e.g. NICEIC, NAPIT, ECA)"
          className="w-full rounded-lg border border-border bg-background p-2 text-sm"
        />
      )}
    </Card>
  );
}
