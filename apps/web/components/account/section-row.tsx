import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@asaplocal/ui";

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

export function SectionRow({
  icon: Icon,
  label,
  description,
  right,
  onClick,
  href,
  as,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  as?: React.ElementType;
}) {
  const Comp = as ?? (href ? "a" : onClick ? "button" : "div");
  const interactive = Boolean(onClick || href);
  return (
    <Comp
      href={href}
      onClick={onClick}
      type={Comp === "button" ? "button" : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left",
        interactive && "transition-colors hover:bg-muted"
      )}
    >
      <Icon size={18} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {right}
      {interactive && !right && <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    </Comp>
  );
}

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
