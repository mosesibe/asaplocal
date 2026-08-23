export type DefaultTheme = "light" | "dark" | "system";

/**
 * What to use when the visitor has never chosen a theme. "system" follows
 * prefers-color-scheme; "light"/"dark" ignore it until the user toggles, at
 * which point their stored choice wins for good.
 */
function fallbackExpression(defaultTheme: DefaultTheme) {
  if (defaultTheme === "dark") return "true";
  if (defaultTheme === "light") return "false";
  return 'window.matchMedia("(prefers-color-scheme: dark)").matches';
}

/**
 * Runs synchronously in <head>, before <body> paints, so the correct class
 * is already on <html> by first paint — avoids a flash of the wrong theme.
 * Pairs with ThemeProvider, which reconciles React state after hydration.
 * Pass the SAME defaultTheme to both or they will disagree on first load.
 */
export function ThemeScript({ defaultTheme = "system" }: { defaultTheme?: DefaultTheme } = {}) {
  const script = `
(function() {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored === "dark" || (stored !== "light" && ${fallbackExpression(defaultTheme)});
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />;
}
