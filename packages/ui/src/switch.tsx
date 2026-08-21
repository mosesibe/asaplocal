"use client";

import { cn } from "./utils";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        checked ? "bg-brand-600" : "bg-muted"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          // Anchor the knob explicitly. Without `left`, an absolutely
          // positioned child falls back to its static position — and a
          // button's UA `text-align: center` puts that at the track's
          // midpoint, so every translate started from the centre and the
          // "on" state sat entirely outside the track.
          // Travel = 44px track − 20px knob − 2px inset × 2 = 20px.
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
