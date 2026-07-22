"use client";
import { StarRating } from "@asaplocal/ui";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  authorName: string;
  createdAt: string;
  providerResponse: string | null;
}

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) return <p className="text-muted-foreground">No reviews yet — be the first to book and review.</p>;
  return (
    <div className="space-y-6">
      {reviews.map((r) => (
        <div key={r.id} className="border-b border-border pb-6 last:border-0">
          <div className="flex items-center justify-between">
            <p className="font-medium">{r.authorName}</p>
            <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
          </div>
          <div className="mt-1"><StarRating rating={r.rating} size={14} /></div>
          {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
          {r.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {r.photos.map((p, i) => <img key={i} src={p} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
            </div>
          )}
          {r.providerResponse && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
              <p className="mb-1 font-medium">Response from the business</p>
              <p className="text-muted-foreground">{r.providerResponse}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
