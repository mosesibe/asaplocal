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

// Lifted into @asaplocal/ui — the provider app needs the same control.
export { Switch } from "@asaplocal/ui";
