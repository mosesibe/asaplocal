import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

/**
 * Customer web app's bottom nav — a light bar docked flush to the bottom
 * edge (full width, no side/bottom gaps), whose top edge flows into a
 * smooth wave that disappears *behind* the raised center button, rather
 * than a hard-edged circular notch or a bump that pokes up separately above
 * the button with a visible gap. A CSS shape (border-radius on two pseudo-
 * circles) can't produce a continuous curve like this — it's drawn as one
 * SVG path so the bar's silhouette and the bump are a single unbroken
 * outline, deliberately tall enough that the button overlaps and hides its
 * peak instead of floating above it.
 *
 * A separate component from bottom-nav.tsx, not a variant of it —
 * apps/provider's nav still uses that one unchanged (see its own
 * ProviderBottomNav), so this only ever affects the customer app.
 */
export interface NotchedNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  emphasized?: boolean;
}

interface BottomNavNotchedProps {
  items: NotchedNavItem[];
  className?: string;
  /** Link component to render each item as — pass Next.js's Link for client-side routing. Defaults to a plain anchor. */
  as?: React.ElementType;
}

// Wave geometry, in the SVG's own coordinate space — tuned by eye, not
// derived from anything. barWidth is arbitrary (the SVG stretches to fill
// the real container via preserveAspectRatio="none"); barHeight/radius/
// bumpHeight are the values that actually read as "to scale" since only the
// X axis gets stretched. bumpHeight is deliberately taller than the button
// sitting on it, so the button's own circle covers the peak rather than a
// gap of page background showing between the two.
const BAR_WIDTH = 390;
const BAR_HEIGHT = 64;
const TOP_RADIUS = 20;
const BUMP_HEIGHT = 34;
const BUMP_CENTER = BAR_WIDTH / 2;
const BUMP_HALF_WIDTH = 66;
const BUTTON_SIZE = 56;
// Button's top edge, relative to the container's own top (y=0 = the wave's
// peak) — negative pulls it up above the peak, positive sinks it into the
// bar. Sunk well past the peak so the wave visibly runs *under* the button.
const BUTTON_TOP = BUMP_HEIGHT - BUTTON_SIZE / 2 + 6;

const WAVE_PATH = `
  M ${TOP_RADIUS} 0
  L ${BUMP_CENTER - BUMP_HALF_WIDTH} 0
  C ${BUMP_CENTER - BUMP_HALF_WIDTH + 26} 0 ${BUMP_CENTER - 32} ${-BUMP_HEIGHT} ${BUMP_CENTER} ${-BUMP_HEIGHT}
  C ${BUMP_CENTER + 32} ${-BUMP_HEIGHT} ${BUMP_CENTER + BUMP_HALF_WIDTH - 26} 0 ${BUMP_CENTER + BUMP_HALF_WIDTH} 0
  L ${BAR_WIDTH - TOP_RADIUS} 0
  Q ${BAR_WIDTH} 0 ${BAR_WIDTH} ${TOP_RADIUS}
  L ${BAR_WIDTH} ${BAR_HEIGHT}
  L 0 ${BAR_HEIGHT}
  L 0 ${TOP_RADIUS}
  Q 0 0 ${TOP_RADIUS} 0
  Z
`;

export function BottomNavNotched({ items, className, as = "a" }: BottomNavNotchedProps) {
  const center = items.find((item) => item.emphasized);
  const centerIndex = items.findIndex((item) => item.emphasized);
  const CenterIcon = center?.icon;
  const Comp = as;

  return (
    <nav className={cn("fixed inset-x-0 bottom-0 z-40 md:hidden", className)}>
      <div className="relative" style={{ height: BAR_HEIGHT + BUMP_HEIGHT }}>
        <svg
          viewBox={`0 ${-BUMP_HEIGHT} ${BAR_WIDTH} ${BAR_HEIGHT + BUMP_HEIGHT}`}
          width="100%"
          height={BAR_HEIGHT + BUMP_HEIGHT}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ filter: "drop-shadow(0 -6px 20px rgba(15, 23, 42, 0.12))" }}
        >
          <path d={WAVE_PATH} fill="hsl(var(--surface))" />
        </svg>

        <div
          className="absolute inset-x-0 flex items-stretch justify-around px-2"
          style={{ top: BUMP_HEIGHT, height: BAR_HEIGHT }}
        >
          {items.map((item, i) => (
            <NotchedItem
              key={item.href}
              {...item}
              as={Comp}
              // Extra breathing room for the two items flanking the raised
              // center button, so it doesn't crowd them.
              className={cn(i === centerIndex - 1 && "mr-3", i === centerIndex + 1 && "ml-3")}
            />
          ))}
        </div>

        {center && CenterIcon && (
          <Comp
            href={center.href}
            aria-label={center.label}
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full shadow-lg transition-colors",
              center.active ? "bg-brand-700" : "bg-brand-500"
            )}
            style={{ top: BUTTON_TOP, height: BUTTON_SIZE, width: BUTTON_SIZE }}
          >
            <CenterIcon size={24} className="text-white" />
          </Comp>
        )}
      </div>
      {/* Flush white filler absorbing the home-indicator safe area, so the bar's background reaches the true screen edge instead of stopping at the icon row. */}
      <div className="bg-surface" style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}

function NotchedItem({
  icon: Icon,
  label,
  href,
  active,
  emphasized,
  className,
  as: Comp = "a",
}: NotchedNavItem & { className?: string; as?: React.ElementType }) {
  if (emphasized) {
    // The visible button is rendered separately (see above) so it can sit
    // above the bar and overlap the wave's peak — this just reserves the
    // row's flex-1 width and shows the label, no icon (the real icon is on
    // the floating button). `self-end` sizes this element's own hit-box to
    // just the label text, pinned to the row's bottom edge — the button
    // deliberately overlaps *down* into the row (that's what makes the wave
    // read as running under it), so without self-end this anchor would
    // stretch to the row's full height and its upper portion would sit
    // *under* the button, blocking clicks on the label (confirmed via a
    // real click test: Playwright's click-at-center landed on the button,
    // not the label, until the hit-box was shrunk to just the text itself).
    return (
      <Comp href={href} className={cn("flex min-w-[64px] flex-1 items-end justify-center self-end pb-0.5", className)}>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </Comp>
    );
  }

  return (
    <Comp
      href={href}
      className={cn(
        "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-brand-600" : "text-muted-foreground",
        className
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-medium">{label}</span>
    </Comp>
  );
}
