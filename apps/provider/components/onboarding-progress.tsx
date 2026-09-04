import { cn } from "@asaplocal/ui";

const STEPS = ["Business profile", "Services", "Verification"] as const;

/** Shown at the top of the three post-signup wizard screens (see apps/provider/app/onboarding). */
export function OnboardingProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex items-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                done && "bg-primary text-primary-foreground",
                active && "border-2 border-primary text-primary",
                !done && !active && "border border-border text-muted-foreground"
              )}
            >
              {done ? "✓" : step}
            </span>
            <span className={cn("hidden text-sm sm:inline", active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            {step < 3 && <span className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
