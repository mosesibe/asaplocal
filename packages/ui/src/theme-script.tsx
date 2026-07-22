/**
 * Runs synchronously in <head>, before <body> paints, so the correct class
 * is already on <html> by first paint — avoids a flash of the wrong theme.
 * Pairs with ThemeProvider, which reconciles React state after hydration.
 */
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
