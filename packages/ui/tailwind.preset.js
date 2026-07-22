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
          50: "#eefcf5",
          100: "#d6f7e4",
          200: "#aeedc9",
          300: "#79dda9",
          400: "#43c585",
          500: "#1fa96b", // primary brand green
          600: "#158757",
          700: "#136c48",
          800: "#13563b",
          900: "#114732",
        },
        surface: "hsl(var(--surface))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
      },
    },
  },
};
