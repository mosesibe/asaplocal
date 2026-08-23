"use client";

import * as React from "react";
import type { DefaultTheme } from "./theme-script";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * `defaultTheme` is what a visitor with no stored choice gets. It must match
 * the value given to <ThemeScript>, which sets the class before first paint —
 * this provider only reconciles React state to what is already on <html>.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: DefaultTheme;
}) {
  // "system" can only be resolved in the browser, so assume light for the
  // server render; the effect below corrects it, and ThemeScript has already
  // put the right class on <html> either way.
  const [theme, setTheme] = React.useState<Theme>(defaultTheme === "dark" ? "dark" : "light");

  React.useEffect(() => {
    const stored = localStorage.getItem("theme");
    const hasChoice = stored === "light" || stored === "dark";
    const initial: Theme = hasChoice
      ? (stored as Theme)
      : defaultTheme === "system"
        ? systemTheme()
        : defaultTheme;
    setTheme(initial);

    // Only follow live system-preference changes when the app defers to the
    // system AND the user hasn't made an explicit choice yet. An app that
    // defaults to light must not flip when the OS goes dark at sunset.
    if (hasChoice || defaultTheme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      const next: Theme = e.matches ? "dark" : "light";
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [defaultTheme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
