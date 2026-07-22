"use client";
import { useState } from "react";
import { Button, Card, StarRating, Textarea } from "@asaplocal/ui";

export function LeaveReviewForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, rating, comment, photos: [] }) });
    setLoading(false);
    if (res.ok) setSubmitted(true);
  }

  if (submitted) return <p className="text-muted-foreground">Thanks — your review has been submitted.</p>;

  return (
    <Card className="space-y-4 p-6">
      <div>
        <p className="mb-2 text-sm font-medium">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className="p-1" onClick={() => setRating(n)} aria-label={`Rate ${n}`}>
              <StarRating rating={n <= rating ? 5 : 0} size={26} />
            </button>
          ))}
        </div>
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="How did it go?" />
      <Button onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit review"}</Button>
    </Card>
  );
}
