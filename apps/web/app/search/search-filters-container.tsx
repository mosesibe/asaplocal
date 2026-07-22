"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, Card, Sheet, SheetContent, SheetHeader, SheetTitle } from "@asaplocal/ui";
import { SearchFilters } from "./search-filters";

export function SearchFiltersContainer({
  categories,
  initial,
}: {
  categories: { slug: string; name: string }[];
  initial: Record<string, string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(initial).filter((v) => v && v !== "25").length;

  return (
    <>
      <Button variant="outline" className="w-full justify-center gap-2 md:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      <Card className="hidden h-fit p-4 md:block">
        <SearchFilters categories={categories} initial={initial} />
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <SearchFilters categories={categories} initial={initial} onApplied={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
