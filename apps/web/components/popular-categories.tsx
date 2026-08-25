import Link from "next/link";
import {
  Sparkles,
  Wrench,
  Zap,
  Leaf,
  Hammer,
  Truck,
  BookOpen,
  PawPrint,
  PaintRoller,
  Scissors,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Card, cn } from "@asaplocal/ui";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  wrench: Wrench,
  zap: Zap,
  leaf: Leaf,
  hammer: Hammer,
  truck: Truck,
  "book-open": BookOpen,
  "paw-print": PawPrint,
  "paint-roller": PaintRoller,
  scissors: Scissors,
};

// One accent per icon so the grid reads as distinct services at a glance,
// not an arbitrary per-category assignment.
const ACCENTS: Record<string, string> = {
  sparkles: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  wrench: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  zap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  leaf: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  hammer: "bg-brand-500/15 text-brand-600 dark:text-brand-400",
  truck: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "book-open": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "paw-print": "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  "paint-roller": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  scissors: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// Middle of the "within 10-20 miles" range the customer actually cares about,
// not an exact-city match — see /search's lat/lng/radius handling.
const SEARCH_RADIUS_MILES = 15;

export function PopularCategories({
  categories,
  location,
}: {
  categories: Category[];
  location: { lat: number; lng: number } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {categories.map((c) => {
        const Icon = (c.icon ? ICONS[c.icon] : undefined) ?? Tag;
        const accent = (c.icon && ACCENTS[c.icon]) ?? "bg-muted text-muted-foreground";
        const href = location
          ? `/search?category=${c.slug}&lat=${location.lat}&lng=${location.lng}&radius=${SEARCH_RADIUS_MILES}`
          : `/search?category=${c.slug}`;
        return (
          <Link key={c.id} href={href}>
            <Card className="bg-gradient-to-br from-surface to-muted/60 p-4 text-center transition-shadow hover:border-brand-300 hover:shadow-accent dark:hover:border-brand-700">
              <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full", accent)}>
                <Icon size={22} strokeWidth={2} />
              </div>
              <p className="truncate text-sm font-medium">{c.name}</p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
