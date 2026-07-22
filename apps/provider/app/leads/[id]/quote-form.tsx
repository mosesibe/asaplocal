"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, formatPence } from "@asaplocal/ui";

export function QuoteForm({
  jobRequestId,
  existingQuote,
  aiSuggestion,
}: {
  jobRequestId: string;
  existingQuote: { amountPence: number; message: string | null; status: string } | null;
  aiSuggestion: { message: string; suggestedAmountPence: number | null } | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(existingQuote ? (existingQuote.amountPence / 100).toString() : aiSuggestion?.suggestedAmountPence ? (aiSuggestion.suggestedAmountPence / 100).toString() : "");
  const [message, setMessage] = useState(existingQuote?.message ?? aiSuggestion?.message ?? "");
  const [loading, setLoading] = useState(false);

  if (existingQuote) {
    return (
      <Card className="p-5">
        <p className="text-lg font-bold text-brand-700">{formatPence(existingQuote.amountPence)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{existingQuote.message}</p>
        <p className="mt-2 text-xs uppercase text-muted-foreground">{existingQuote.status}</p>
      </Card>
    );
  }

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobRequestId, amountPence: Math.round(Number(amount) * 100), message }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).message ?? "Failed to send quote");
  }

  return (
    <Card className="space-y-3 p-5">
      {aiSuggestion && <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800">AI-drafted reply pre-filled below — edit before sending.</p>}
      <div>
        <label className="text-sm font-medium">Quote amount (£)</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Message to customer</label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1" />
      </div>
      <Button onClick={submit} disabled={loading || !amount}>{loading ? "Sending…" : "Send quote"}</Button>
    </Card>
  );
}
