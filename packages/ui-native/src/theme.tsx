import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getPalette, Radius, Spacing, FontFamily, type AppName, type ColorScheme, type Palette } from "./tokens";

export interface Theme {
  colors: Palette;
  scheme: ColorScheme;
  radius: typeof Radius;
  spacing: typeof Spacing;
  font: typeof FontFamily;
}

const ThemeContext = createContext<Theme | null>(null);

export function UiNativeThemeProvider({ app, children }: { app: AppName; children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === "dark" ? "dark" : "light";

  const value = useMemo<Theme>(
    () => ({ colors: getPalette(app, scheme), scheme, radius: Radius, spacing: Spacing, font: FontFamily }),
    [app, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within a UiNativeThemeProvider");
  return ctx;
}
