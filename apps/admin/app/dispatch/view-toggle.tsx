import Link from "next/link";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@asaplocal/ui";
import type { DispatchTab } from "./lib";

export function ViewToggle({ view, tab, q, region }: { view: string; tab: DispatchTab; q?: string; region?: string }) {
  function hrefFor(v: "list" | "board") {
    const params = new URLSearchParams();
    if (tab !== "new") params.set("tab", tab);
    if (v !== "list") params.set("view", v);
    if (q) params.set("q", q);
    if (region) params.set("region", region);
    const qs = params.toString();
    return qs ? `/dispatch?${qs}` : "/dispatch";
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      <Link
        href={hrefFor("list")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          view !== "board" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <List size={14} /> List
      </Link>
      <Link
        href={hrefFor("board")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          view === "board" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid size={14} /> Board
      </Link>
    </div>
  );
}
