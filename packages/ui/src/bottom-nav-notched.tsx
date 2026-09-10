import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

/**
 * Alternate bottom-nav concept — dark bar, center item sits in a scalloped
 * notch cut into the bar's top edge (two overlapping circles: one in the
 * page background color punches the "hole", the brand-colored button sits
 * on top) instead of just floating above a flat edge.
 *
 * Stacking is deliberate and order-sensitive: in a stacking context, *all*
 * static content paints before *all* positioned content, regardless of DOM
 * order between them — so the notch circle (absolute) would always paint
 * over the bar (static) either way, but the reverse isn't true for a
 * negative-margin "popped up" button that's just a static flex child: it'd
 * paint *under* the notch circle, not over it. The raised button is kept as
 * its own absolutely-positioned element, last in DOM among the three
 * layers, so it's guaranteed to paint above both the notch and the bar. Its
 * label is a separate, normal in-flow flex item instead (a transparent
 * icon-sized spacer plus the visible text) purely so it vertically aligns
 * with its siblings' labels — same href, so tapping either half works.
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
  emphasized?: boolean;
}

export function BottomNavNotched({ items, className }: { items: NotchedNavItem[]; className?: string }) {
  const center = items.find((item) => item.emphasized);
  const centerIndex = items.findIndex((item) => item.emphasized);
  const CenterIcon = center?.icon;

  return (
    <nav className={cn("fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 md:hidden", className)}>
      <div className="relative">
        {/* Punches the notch: a circle in the page background color, sized larger than the button rendered on top of it below. */}
        <div className="absolute left-1/2 top-0 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />

        <div className="flex h-16 items-stretch justify-around rounded-[28px] bg-espresso-950 px-2 shadow-xl">
          {items.map((item, i) => (
            <NotchedItem
              key={item.href}
              {...item}
              // Extra breathing room for the two items flanking the raised
              // center button, so it doesn't crowd them.
              className={cn(i === centerIndex - 1 && "mr-3", i === centerIndex + 1 && "ml-3")}
            />
          ))}
        </div>

        {center && CenterIcon && (
          <a
            href={center.href}
            aria-label={center.label}
            className={cn(
              "absolute left-1/2 top-0 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-colors",
              center.active ? "bg-brand-700" : "bg-brand-500"
            )}
          >
            <CenterIcon size={26} className="text-white" />
          </a>
        )}
      </div>
    </nav>
  );
}

function NotchedItem({ icon: Icon, label, href, active, emphasized, className }: NotchedNavItem & { className?: string }) {
  if (emphasized) {
    // The visible button is rendered separately (see above) so it can paint
    // above the notch circle — this reserves the row's flex-1 width and
    // aligns the label with its siblings', with an invisible spacer holding
    // the icon's vertical rhythm.
    return (
      <a href={href} className={cn("flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5", className)}>
        <span className="h-[26px] w-[26px]" aria-hidden />
        <span className="text-[11px] font-medium text-white/70">{label}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-brand-300" : "text-white/55",
        className
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-medium">{label}</span>
    </a>
  );
}
