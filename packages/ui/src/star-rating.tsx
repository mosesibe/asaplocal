import { Star } from "lucide-react";
import { cn } from "./utils";

export function StarRating({ rating, count, size = 16 }: { rating: number; count?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-none text-muted")}
        />
      ))}
      {typeof count === "number" && <span className="ml-1 text-sm text-muted-foreground">({count})</span>}
    </div>
  );
}
