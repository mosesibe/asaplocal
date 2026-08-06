"use client";
import { useState } from "react";
import { cn } from "@asaplocal/ui";

export function PayoutsTabs({ summary, record }: { summary: React.ReactNode; record: React.ReactNode }) {
  const [tab, setTab] = useState<"summary" | "record">("summary");
  return (
    <div>
      <div className="mt-6 inline-flex rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "summary" ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Provider summary
        </button>
        <button
          type="button"
          onClick={() => setTab("record")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "record" ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Provider payout
        </button>
      </div>
      <div className="mt-4">
        <div className={tab === "summary" ? "" : "hidden"}>{summary}</div>
        <div className={tab === "record" ? "" : "hidden"}>{record}</div>
      </div>
    </div>
  );
}
