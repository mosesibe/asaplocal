"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button, Card, Textarea, cn } from "@asaplocal/ui";

export function LeaveReviewForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, rating, comment, photos: [] }) });
      // A failed submit used to do nothing at all — the button simply re-enabled
      // and the customer had no idea their review hadn't been saved.
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't submit your review — please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <p className="text-muted-foreground">Thanks — your review has been submitted.</p>;

  return (
    <Card className="space-y-4 p-6">
      <div>
        <p className="mb-2 text-sm font-medium">Your rating</p>
        {/* One Star per button — StarRating is a 5-star *display* component, so
            rendering it inside this map drew 5×5 = 25 stars. */}
        <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            >
              <Star
                size={26}
                className={cn("transition-colors", n <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground")}
              />
            </button>
          ))}
        </div>
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="How did it go?" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit review"}</Button>
    </Card>
  );
}
