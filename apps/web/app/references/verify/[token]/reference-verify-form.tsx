"use client";
import { useState } from "react";
import { Button, Textarea } from "@asaplocal/ui";

export function ReferenceVerifyForm({ token, alreadyVerified }: { token: string; alreadyVerified: boolean }) {
  const [testimonial, setTestimonial] = useState("");
  const [done, setDone] = useState(alreadyVerified);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/references/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testimonial: testimonial || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="mt-4 text-sm text-emerald-700">Thanks — your confirmation has been recorded.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      <Textarea placeholder="Optional: a short note about your experience" rows={3} value={testimonial} onChange={(e) => setTestimonial(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Confirm reference"}</Button>
    </div>
  );
}
