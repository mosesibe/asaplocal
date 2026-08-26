import type { Config } from "tailwindcss";
import preset from "@asaplocal/ui/tailwind.preset.js";

// Provider-app-only rebrand: overrides the shared preset's terracotta/espresso
// scales with the navy/orange palette, scoped here (not in the shared preset)
// so web and admin keep their existing look. Existing `brand-*`/`espresso-*`
// classes throughout the app pick up the new values automatically since the
// token names are unchanged — only their values are.
const config: Config = {
  presets: [preset as unknown as Partial<Config>],
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Action Orange (#FF5A00), ramped around the exact 50/500 stops given.
        brand: {
          50: "hsl(21 100% 95%)", // Orange Soft
          100: "hsl(21 100% 90%)",
          200: "hsl(21 100% 81%)",
          300: "hsl(21 100% 71%)",
          400: "hsl(21 100% 60%)",
          500: "hsl(21 100% 50%)", // Action Orange
          600: "hsl(21 90% 43%)",
          700: "hsl(21 85% 36%)",
          800: "hsl(21 80% 29%)",
          900: "hsl(21 75% 22%)",
        },
        // Primary Navy (#002059) / Navy Dark (#00143D), ramped up to those
        // exact stops at 900/950 — kept as "espresso" so every existing
        // text-espresso-*/bg-espresso-* class repaints without edits.
        espresso: {
          50: "hsl(219 45% 97%)",
          100: "hsl(218 45% 92%)",
          200: "hsl(218 45% 82%)",
          300: "hsl(218 45% 68%)",
          400: "hsl(218 55% 52%)",
          500: "hsl(218 70% 38%)",
          600: "hsl(218 85% 28%)",
          700: "hsl(218 95% 22%)",
          800: "hsl(218 100% 19%)",
          900: "hsl(218 100% 17%)", // Primary Navy
          950: "hsl(220 100% 12%)", // Navy Dark
        },
        // Not in the shared preset at all — this newly defines bg-primary/
        // border-primary/text-primary, which were previously no-op classes
        // in a handful of provider components.
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      boxShadow: {
        // Re-tints the shared "accent" glow (used by the dashboard radar map)
        // from the old terracotta to the new Action Orange.
        accent: "0 1px 2px rgba(255,90,0,.18), 0 4px 12px rgba(255,90,0,.16)",
      },
    },
  },
  plugins: [],
};
export default config;
