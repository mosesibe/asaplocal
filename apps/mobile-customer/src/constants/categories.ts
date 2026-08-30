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
  type LucideIcon,
} from 'lucide-react-native';

// Mirrors apps/web/components/popular-categories.tsx's ICONS/ACCENTS maps
// and category-flyer-carousel.tsx's TAGLINES/GRADIENTS — keyed by icon name
// (not category slug) to match the web source exactly, including the
// "Builders" / "Handyman" pair sharing the hammer icon + accent.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  wrench: Wrench,
  zap: Zap,
  leaf: Leaf,
  hammer: Hammer,
  truck: Truck,
  'book-open': BookOpen,
  'paw-print': PawPrint,
  'paint-roller': PaintRoller,
  scissors: Scissors,
};

export const CATEGORY_ACCENTS: Record<string, { bg: string; fg: string }> = {
  sparkles: { bg: 'rgba(14,165,233,0.15)', fg: '#0284c7' }, // sky-500/15, sky-600
  wrench: { bg: 'rgba(59,130,246,0.15)', fg: '#2563eb' }, // blue-500/15, blue-600
  zap: { bg: 'rgba(245,158,11,0.15)', fg: '#d97706' }, // amber-500/15, amber-600
  leaf: { bg: 'rgba(16,185,129,0.15)', fg: '#059669' }, // emerald-500/15, emerald-600
  hammer: { bg: 'rgba(255,90,0,0.15)', fg: '#d0500b' }, // brand-500/15, brand-600
  truck: { bg: 'rgba(249,115,22,0.15)', fg: '#ea580c' }, // orange-500/15, orange-600
  'book-open': { bg: 'rgba(99,102,241,0.15)', fg: '#4f46e5' }, // indigo-500/15, indigo-600
  'paw-print': { bg: 'rgba(20,184,166,0.15)', fg: '#0d9488' }, // teal-500/15, teal-600
  'paint-roller': { bg: 'rgba(168,85,247,0.15)', fg: '#9333ea' }, // purple-500/15, purple-600
  scissors: { bg: 'rgba(236,72,153,0.15)', fg: '#db2777' }, // pink-500/15, pink-600
};

export const CATEGORY_TAGLINES: Record<string, string> = {
  cleaning: 'Sparkling homes, booked in minutes',
  plumbing: 'Leaks, blockages & installs — sorted fast',
  electrical: 'Certified pros for wiring & repairs',
  gardening: 'Lawns, hedges & garden makeovers',
  handyman: 'One call for all the little jobs',
  painting: 'Fresh coats, inside and out',
  removals: 'Stress-free moves, any distance',
  tutoring: 'Local tutors for every subject',
  beauty: 'Mobile beauty & wellness, at your door',
  'pet-services': "Trusted care while you're away",
};
export const CATEGORY_TAGLINE_FALLBACK = 'Trusted local pros near you';

// apps/web/components/category-flyer-carousel.tsx GRADIENTS, cycled by index
// (i % 3) — resolved to hex pairs from BRAND_CUSTOMER / ESPRESSO_CUSTOMER.
export const CAROUSEL_GRADIENTS: [string, string][] = [
  ['#ff5a00', '#a83f10'], // from-brand-500 to-brand-700
  ['#0c3d94', '#002670'], // from-espresso-700 to-espresso-900
  ['#d0500b', '#00297a'], // from-brand-600 to-espresso-800
];
