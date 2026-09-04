"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

/**
 * Shown on /services and /verification when reached as part of the
 * post-signup wizard (?onboarding=1) — lets the provider move on without
 * hunting for regular page nav, which doesn't exist yet at this point since
 * they haven't finished onboarding.
 */
export function OnboardingContinueBar({
  label,
  hint,
  nextHref,
  markComplete,
}: {
  label: string;
  hint: string;
  nextHref: string;
  /** Marks the wizard itself as finished (called on the last step only). */
  markComplete?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    if (markComplete) {
      await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
    }
    router.push(nextHref);
  }

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <Button onClick={onClick} disabled={loading} className="w-full sm:w-auto">
        {loading ? "…" : label}
      </Button>
    </div>
  );
}
