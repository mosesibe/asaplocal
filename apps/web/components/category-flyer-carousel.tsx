"use client";

import { useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@asaplocal/ui";

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

const TAGLINES: Record<string, string> = {
  cleaning: "Sparkling homes, booked in minutes",
  plumbing: "Leaks, blockages & installs — sorted fast",
  electrical: "Certified pros for wiring & repairs",
  gardening: "Lawns, hedges & garden makeovers",
  handyman: "One call for all the little jobs",
  painting: "Fresh coats, inside and out",
  removals: "Stress-free moves, any distance",
  tutoring: "Local tutors for every subject",
  beauty: "Mobile beauty & wellness, at your door",
  "pet-services": "Trusted care while you're away",
};

// Alternating terracotta and espresso tones so the strip doesn't feel monotonous
// without straying from the established brand palette.
const GRADIENTS = [
  "from-brand-500 to-brand-700",
  "from-espresso-700 to-espresso-900",
  "from-brand-600 to-espresso-800",
];

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export function CategoryFlyerCarousel({ categories, citySlug }: { categories: Category[]; citySlug: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  if (categories.length === 0) return null;

  return (
    <div className="relative">
      <div ref={scrollerRef} className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-6">
        {categories.map((c, i) => {
          const Icon = (c.icon ? ICONS[c.icon] : undefined) ?? Tag;
          const tagline = TAGLINES[c.slug] ?? "Trusted local pros near you";
          return (
            <Link
              key={c.id}
              href={`/${c.slug}-${citySlug}`}
              className={cn(
                "relative flex w-64 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-card sm:w-72",
                GRADIENTS[i % GRADIENTS.length]
              )}
            >
              <Icon size={64} className="absolute -right-3 -top-3 text-white/15" strokeWidth={1.5} />
              <Icon size={28} className="relative" />
              <div className="relative mt-6">
                <p className="text-lg font-bold">{c.name}</p>
                <p className="mt-1 text-sm text-white/85">{tagline}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-300)}
        className="absolute left-2 top-9 hidden items-center justify-center rounded-full border border-border bg-surface p-2 shadow-card md:flex"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(300)}
        className="absolute right-2 top-9 hidden items-center justify-center rounded-full border border-border bg-surface p-2 shadow-card md:flex"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
