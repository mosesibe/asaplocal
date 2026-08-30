// Mirrors the actual rendered values from each app's own Tailwind config —
// not packages/ui's shared preset. apps/web/tailwind.config.ts fully
// *overrides* the preset's `brand`/`espresso` color scales (Tailwind deep-
// merges theme.extend, so identical numeric keys replace, not blend) with a
// vivid-orange/navy "rebrand" scale. apps/provider/tailwind.config.ts has no
// such override, so it still renders the preset's terracotta/brown scale.
// A previous pass here missed the override and shipped provider's terracotta
// on both apps — this is the fix. Non-brand tokens (background/surface/
// muted/border) were already correct: apps/web only overrides brand/espresso,
// nothing else, and provider was never touched at all.
export const BRAND_CUSTOMER = {
  50: "#fff0e6",
  100: "#ffe0cc",
  200: "#ffc199",
  300: "#ff9c5c",
  400: "#ff8033",
  500: "#ff5a00", // Action Orange — apps/web/tailwind.config.ts brand-500
  600: "#d0500b", // hsl(21 90% 43%)
  700: "#a83f10", // hsl(21 85% 36%)
  800: "#803011", // hsl(21 80% 29%)
  900: "#5c2510", // hsl(21 75% 22%)
} as const;

// apps/web's "espresso" (navy) scale — used for the services carousel's
// alternating gradient cards and dark-mode hero background; not a button/
// accent color, so kept separate from BRAND.
export const ESPRESSO_CUSTOMER = {
  700: "#0c3d94", // hsl(218 95% 22%)
  800: "#00297a", // hsl(218 100% 19%)
  900: "#002670", // hsl(218 100% 17%) — Primary Navy
  950: "#001a52", // hsl(220 100% 12%) — Navy Dark
} as const;

export const BRAND_PROVIDER = {
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
export type BrandScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export interface Palette {
  background: string;
  foreground: string;
  surface: string;
  muted: string;
  mutedForeground: string;
  border: string;
  brand: BrandScale;
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
  const brand = app === "customer" ? BRAND_CUSTOMER : BRAND_PROVIDER;
  return { ...PALETTES[app][scheme], brand };
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
