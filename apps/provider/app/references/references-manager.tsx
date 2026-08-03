"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input } from "@asaplocal/ui";

interface Reference {
  id: string;
  refereeName: string;
  refereeEmail: string;
  status: string;
  testimonial: string | null;
}

export function ReferencesManager({ references }: { references: Reference[] }) {
  const router = useRouter();
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refereeName, refereeEmail }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      setRefereeName("");
      setRefereeEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {references.length > 0 && (
        <Card className="space-y-2 p-4">
          {references.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.refereeName} — {r.refereeEmail}</p>
                <Badge variant={r.status === "VERIFIED" ? "success" : "warning"}>{r.status}</Badge>
              </div>
              {r.testimonial && <p className="mt-1 text-sm text-muted-foreground">"{r.testimonial}"</p>}
            </div>
          ))}
        </Card>
      )}

      {references.length < 3 && (
        <Card className="space-y-3 p-6">
          <p className="font-medium">Request a reference</p>
          <form onSubmit={submit} className="space-y-3">
            <Input required placeholder="Referee's name" value={refereeName} onChange={(e) => setRefereeName(e.target.value)} />
            <Input required type="email" placeholder="Referee's email" value={refereeEmail} onChange={(e) => setRefereeEmail(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Sending…" : "Send request"}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
