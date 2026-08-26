import type { Config } from "tailwindcss";
import preset from "@asaplocal/ui/tailwind.preset.js";

// Trial rebrand — same navy/orange palette piloted on the provider app,
// applied here to see how it reads for the customer app. Scoped to this
// app's own config (not the shared preset), so it's a one-commit, one-file
// experiment to keep or revert. See apps/provider/tailwind.config.ts (as of
// its rebrand commit) for the same block, from which this is copied.
const config: Config = {
  presets: [preset as unknown as Partial<Config>],
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
      },
      boxShadow: {
        accent: "0 1px 2px rgba(255,90,0,.18), 0 4px 12px rgba(255,90,0,.16)",
      },
    },
  },
  plugins: [],
};
export default config;
