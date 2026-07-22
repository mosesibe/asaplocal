"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select, Textarea } from "@asaplocal/ui";

const REASONS = [
  { value: "OUT_OF_SERVICE_AREA", label: "Out of my service area" },
  { value: "DUPLICATE_LEAD", label: "Duplicate lead" },
  { value: "SPAM_OR_FAKE", label: "Spam / fake request" },
  { value: "UNRESPONSIVE_CUSTOMER", label: "Customer unresponsive" },
  { value: "WRONG_CATEGORY", label: "Wrong category" },
  { value: "OTHER", label: "Other" },
];

export function RefundRequestForm({ leadAccessId }: { leadAccessId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("OUT_OF_SERVICE_AREA");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadAccessId}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadAccessId, reason, details }),
    });
    setLoading(false);
    if (res.ok) { setSent(true); router.refresh(); }
    else alert((await res.json()).message ?? "Failed to submit request");
  }

  if (sent) return <p className="text-sm text-muted-foreground">Refund request submitted — an admin will review it shortly.</p>;

  return (
    <Card className="space-y-3 p-5">
      <Select value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </Select>
      <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Add any details that will help us review this quickly" />
      <Button variant="outline" onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Request refund"}</Button>
    </Card>
  );
}
