"use client";

import * as React from "react";
import type { DefaultTheme } from "./theme-script";

/** What the user picked. "system" defers to the OS, and keeps deferring. */
export type ThemePreference = "system" | "light" | "dark";
/** What is actually painted. "system" has been resolved away. */
export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Kept for the plain two-state controls: flips to the opposite explicit theme. */
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * `defaultTheme` is what a visitor with NO stored preference gets, and must match
 * the value given to <ThemeScript>. Note this is separate from choosing "System"
 * in the UI: an app can default to light while still letting people opt into
 * following their OS.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: DefaultTheme;
}) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(defaultTheme);
  const [theme, setTheme] = React.useState<Theme>(defaultTheme === "dark" ? "dark" : "light");
  // Gate the effect below until storage has been read, so it can never apply the
  // default over a stored preference on the first commit.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("theme");
    setPreferenceState(isPreference(stored) ? stored : defaultTheme);
    // Adopt what ThemeScript already painted instead of recomputing it — this
    // effect must never touch the class, or explicit choices flash on load.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setHydrated(true);
  }, [defaultTheme]);

  React.useEffect(() => {
    if (!hydrated || preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => {
      setTheme(dark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", dark);
    };
    apply(mq.matches);
    const listener = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [hydrated, preference]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    localStorage.setItem("theme", next);
    setPreferenceState(next);
    // "system" is resolved and applied by the effect above, which also subscribes
    // to later OS changes; the explicit choices are applied here and now.
    if (next !== "system") {
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  const value = React.useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
