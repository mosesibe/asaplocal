// Mirrors the actual rendered values from packages/ui (web) — not the
// aspirational ones. Two real divergences from the web source worth calling
// out so nobody "fixes" them into sync by accident:
//
// 1. apps/web's globals.css defines a --primary/#FF5A00 "Action Orange" from
//    a trial rebrand, but its actual <Button> (packages/ui/src/button.tsx)
//    still renders the older brand-600 terracotta — the rebrand only reached
//    background/surface/muted, not the shared Button component. Buttons on
//    both apps render identically today, so BRAND below (terracotta) is what
//    native should match for buttons/links, not the CSS variable.
// 2. apps/provider was never rebranded — its light-mode surface tokens stay
//    plain neutral gray, while apps/web's got a warm orange-tinted neutral.
//    Dark mode is identical between both apps (provider's original dark
//    palette is what the customer rebrand's dark mode was matched to).
export const BRAND = {
  50: "#fcf1e7",
  100: "#f8dec5",
  200: "#f0bd91",
  300: "#e6975d",
  400: "#d97b3d",
  500: "#c15f2a",
  600: "#9c4a20",
  700: "#7a3a1b",
  800: "#5c2c16",
  900: "#442112",
} as const;

export type AppName = "customer" | "provider";
export type ColorScheme = "light" | "dark";

export interface Palette {
  background: string;
  foreground: string;
  surface: string;
  muted: string;
  mutedForeground: string;
  border: string;
  brand: typeof BRAND;
}

const DARK_SHARED = {
  background: "hsl(222, 47%, 7%)",
  foreground: "hsl(210, 20%, 98%)",
  surface: "hsl(222, 40%, 10%)",
  muted: "hsl(217, 33%, 17%)",
  mutedForeground: "hsl(215, 20%, 65%)",
  border: "hsl(217, 33%, 20%)",
};

const PALETTES: Record<AppName, Record<ColorScheme, Omit<Palette, "brand">>> = {
  customer: {
    light: {
      background: "hsl(216, 45%, 98%)", // #F7F9FC
      foreground: "hsl(221, 39%, 11%)", // #111827
      surface: "hsl(0, 0%, 100%)",
      muted: "hsl(21, 100%, 95%)", // orange-soft
      mutedForeground: "hsl(215, 16%, 47%)",
      border: "hsl(214, 32%, 91%)",
    },
    dark: DARK_SHARED,
  },
  provider: {
    light: {
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 47%, 11%)",
      surface: "hsl(0, 0%, 100%)",
      muted: "hsl(220, 14%, 96%)",
      mutedForeground: "hsl(215, 16%, 47%)", // packages/ui doesn't define a separate provider muted-foreground; reuses the customer value (same underlying --muted-foreground default in shadcn-style setups)
      border: "hsl(220, 13%, 91%)",
    },
    dark: DARK_SHARED,
  },
};

export function getPalette(app: AppName, scheme: ColorScheme): Palette {
  return { ...PALETTES[app][scheme], brand: BRAND };
}

// packages/ui: borderRadius.xl = 0.875rem, "2xl" = 1.25rem (root font-size 16px)
export const Radius = {
  sm: 8,
  md: 10,
  lg: 14, // xl
  xl: 20, // 2xl
  full: 999,
} as const;

// Matches apps/*/src/constants/theme.ts's existing scale (kept identical so
// screens don't need every spacing value rewritten, just the color/text ones).
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const FontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

// RN has no box-shadow; these approximate packages/ui's shadow-card /
// shadow-accent via the iOS shadow* props (Android needs `elevation`, added
// per-component since it doesn't have a colored-shadow equivalent).
export const Shadow = {
  card: {
    shadowColor: "#1c120c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  accent: {
    shadowColor: "#c15f2a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
} as const;
