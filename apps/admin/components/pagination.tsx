import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@asaplocal/ui";

export function Pagination({
  page,
  totalPages,
  totalCount,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {totalCount.toLocaleString()} total
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-border",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"
          )}
        >
          <ChevronLeft size={16} />
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-border",
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"
          )}
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
