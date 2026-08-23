/**
 * What a visitor gets when they have never chosen: "system" follows
 * prefers-color-scheme, "light"/"dark" ignore it. Once they DO choose — including
 * choosing "System" explicitly — that stored preference wins from then on.
 */
export type DefaultTheme = "light" | "dark" | "system";

const SYSTEM_DARK = 'window.matchMedia("(prefers-color-scheme: dark)").matches';

/**
 * Runs synchronously in <head>, before <body> paints, so the correct class
 * is already on <html> by first paint — avoids a flash of the wrong theme.
 * Pairs with ThemeProvider, which adopts whatever this decided rather than
 * repainting. Pass the SAME defaultTheme to both or they will disagree.
 */
export function ThemeScript({ defaultTheme = "system" }: { defaultTheme?: DefaultTheme } = {}) {
  // defaultTheme is a closed union, so this interpolation cannot inject anything.
  const script = `
(function() {
  try {
    var pref = localStorage.getItem("theme");
    if (pref !== "light" && pref !== "dark" && pref !== "system") pref = ${JSON.stringify(defaultTheme)};
    var dark = pref === "dark" || (pref === "system" && ${SYSTEM_DARK});
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />;
}
