/**
 * Decides whether a launch splash runs, before the page paints.
 *
 * Deliberately a synchronous <head> script rather than a client component with
 * state: the decision has to be made before first paint, or the visitor sees
 * the page for a frame and then has it covered, which reads as a glitch rather
 * than a splash. Same shape as ThemeScript.
 *
 * It stamps `data-splash` on <html>; each app's own CSS keys off that and owns
 * the animation. The one contract between them is that the app's outermost
 * animated element uses a keyframes rule named `<animationName>` — removal
 * waits for THAT animation to end.
 */
export function SplashScript({
  routes,
  durationMs,
  animationName = "asl-handoff",
}: {
  /** Paths the splash may run on outside an installed app, e.g. ["/", "/dashboard"]. */
  routes: string[];
  /** Only a backstop for the animation never running — removal is event-driven. */
  durationMs: number;
  animationName?: string;
}) {
  const script = `
(function() {
  try {
    var root = document.documentElement;
    // Someone who asked for less motion should not be handed an animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Once per tab: this is a launch moment, not something to sit through on
    // every navigation or reload.
    if (sessionStorage.getItem("splashShown") === "1") return;

    var standalone =
      window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    // In the installed app a splash is expected wherever you land. On the web
    // it would just delay someone who followed a link straight to a page, so
    // restrict it to the front door.
    if (!standalone && ${JSON.stringify(routes)}.indexOf(location.pathname) === -1) return;

    sessionStorage.setItem("splashShown", "1");
    root.setAttribute("data-splash", "");

    var done = function() {
      if (!root.hasAttribute("data-splash")) return;
      root.removeAttribute("data-splash");
      window.removeEventListener("pointerdown", done);
      window.removeEventListener("keydown", done);
      document.removeEventListener("animationend", onEnd);
    };
    // Wait for the animation itself rather than a matching setTimeout. This
    // runs while <head> is parsing, but the animation does not start until the
    // element is first styled — on a slow load that gap is hundreds of
    // milliseconds, and a fixed timer cuts the hand-off fade off mid-way.
    // Animation events bubble, so document-level works before the element
    // exists.
    var onEnd = function(e) { if (e.animationName === ${JSON.stringify(animationName)}) done(); };
    document.addEventListener("animationend", onEnd);
    setTimeout(done, ${Math.round(durationMs)} + 4000);
    // Skippable — a tap or any key gets you straight to the app.
    window.addEventListener("pointerdown", done);
    window.addEventListener("keydown", done);
  } catch (e) {}
})();
`;
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />;
}
