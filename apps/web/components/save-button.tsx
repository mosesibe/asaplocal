"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@asaplocal/ui";

export function SaveButton({
  businessId,
  initialSaved,
  isLoggedIn,
  loginUrl,
}: {
  businessId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  loginUrl: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await fetch(`/api/favourites/${businessId}`, { method: next ? "POST" : "DELETE" }).catch(() => null);
      if (!res || !res.ok) setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved providers" : "Save this provider"}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-brand-300 hover:bg-muted disabled:opacity-60",
        saved && "border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40"
      )}
    >
      <Heart size={20} className={cn(saved ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
    </button>
  );
}
