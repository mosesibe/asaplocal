"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@asaplocal/ui";

export function RespondForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch(`/api/reviews/${reviewId}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response: text }) });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a response…" className="flex-1" />
      <Button size="sm" onClick={submit} disabled={loading || !text} className="sm:shrink-0">{loading ? "…" : "Reply"}</Button>
    </div>
  );
}
