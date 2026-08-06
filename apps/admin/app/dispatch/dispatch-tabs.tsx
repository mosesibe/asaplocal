import Link from "next/link";
import { cn } from "@asaplocal/ui";
import { TABS, type DispatchTab } from "./lib";

export function DispatchTabs({ activeTab, view, q, region }: { activeTab: DispatchTab; view: string; q?: string; region?: string }) {
  function hrefFor(tab: DispatchTab) {
    const params = new URLSearchParams();
    if (tab !== "new") params.set("tab", tab);
    if (view !== "list") params.set("view", view);
    if (q) params.set("q", q);
    if (region) params.set("region", region);
    const qs = params.toString();
    return qs ? `/dispatch?${qs}` : "/dispatch";
  }

  return (
    <nav className="mt-4 flex gap-5 overflow-x-auto border-b border-border text-sm">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={hrefFor(t.id)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-0.5 py-2.5 font-medium transition-colors",
            activeTab === t.id ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
