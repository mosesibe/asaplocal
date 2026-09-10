import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

/**
 * Alternate bottom-nav concept — dark bar, center item sits in a scalloped
 * notch cut into the bar's top edge (two overlapping circles: one in the
 * page background color punches the "hole", the brand-colored button sits
 * on top of it) instead of just floating above a flat edge.
 *
 * Deliberately a separate component from bottom-nav.tsx, not a variant of
 * it — this is a design-review prototype sitting alongside the current nav,
 * not replacing it. See apps/web/app/design/nav-preview for where both are
 * shown side by side.
 */
export interface NotchedNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

export function BottomNavNotched({
  items,
  center,
  className,
}: {
  items: NotchedNavItem[];
  center: Omit<NotchedNavItem, "label">;
  className?: string;
}) {
  const CenterIcon = center.icon;
  return (
    <nav className={cn("fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 md:hidden", className)}>
      <div className="relative">
        {/* Punches the notch: a circle in the page background color, sized larger than the button on top of it. */}
        <div className="absolute left-1/2 top-0 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />

        <div className="flex h-16 items-stretch justify-around rounded-[28px] bg-espresso-950 px-2 shadow-xl">
          {items.map((item) => (
            <NotchedItem key={item.href} {...item} />
          ))}
        </div>

        <a
          href={center.href}
          aria-label="Home"
          className={cn(
            "absolute left-1/2 top-0 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-colors",
            center.active ? "bg-brand-600" : "bg-brand-500"
          )}
        >
          <CenterIcon size={26} className="text-white" />
        </a>
      </div>
    </nav>
  );
}

function NotchedItem({ icon: Icon, label, href, active }: NotchedNavItem) {
  return (
    <a
      href={href}
      className={cn(
        "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-brand-300" : "text-white/55"
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-medium">{label}</span>
    </a>
  );
}
