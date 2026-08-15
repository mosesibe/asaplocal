"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@asaplocal/ui";

export function MessageCustomerButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/start-conversation`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't start conversation");
      const { conversationId } = await res.json();
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleClick} disabled={loading} className="gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
        Message customer
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
