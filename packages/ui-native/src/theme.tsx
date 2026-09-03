import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getPalette, Radius, Spacing, FontFamily, type AppName, type ColorScheme, type Palette } from "./tokens";

export interface Theme {
  app: AppName;
  colors: Palette;
  scheme: ColorScheme;
  radius: typeof Radius;
  spacing: typeof Spacing;
  font: typeof FontFamily;
}

const ThemeContext = createContext<Theme | null>(null);

export interface UiNativeThemeProviderProps {
  app: AppName;
  children: ReactNode;
  /**
   * Overrides the system color scheme — e.g. a user-chosen "Light"/"Dark"
   * preference persisted outside this package (AsyncStorage, per-app).
   * Omit or pass "system" to keep following the OS setting; this keeps the
   * override storage app-specific instead of adding a hard dependency
   * (AsyncStorage) to this shared package.
   */
  schemeOverride?: ColorScheme | "system";
}

export function UiNativeThemeProvider({ app, children, schemeOverride }: UiNativeThemeProviderProps) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    schemeOverride && schemeOverride !== "system" ? schemeOverride : systemScheme === "dark" ? "dark" : "light";

  const value = useMemo<Theme>(
    () => ({ app, colors: getPalette(app, scheme), scheme, radius: Radius, spacing: Spacing, font: FontFamily }),
    [app, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within a UiNativeThemeProvider");
  return ctx;
}
