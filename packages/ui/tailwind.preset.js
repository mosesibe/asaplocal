/** Shared Tailwind design tokens for all AsapLocal apps. */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fcf1e7",
          100: "#f8dec5",
          200: "#f0bd91",
          300: "#e6975d",
          400: "#d97b3d",
          500: "#c15f2a", // primary brand terracotta
          600: "#9c4a20",
          700: "#7a3a1b",
          800: "#5c2c16",
          900: "#442112",
        },
        espresso: {
          50: "#f3eae3",
          100: "#e3d0c2",
          200: "#c7a98d",
          300: "#a57f5f",
          400: "#7b5a3f",
          500: "#5a3f2a",
          600: "#402b1c",
          700: "#2e1e13",
          800: "#20140c",
          900: "#160d07",
          950: "#0f0805",
        },
        surface: "hsl(var(--surface))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,18,12,.08), 0 4px 10px rgba(28,18,12,.08)",
        accent: "0 1px 2px rgba(193,95,42,.18), 0 4px 12px rgba(193,95,42,.16)",
      },
    },
  },
};
