/**
 * Launch splash — direction B ("radar sweep") from design/customer-splash,
 * published at claude.ai/code/artifact/8c4ab891-e11f-40fb-8912-5bf1b602fda9.
 * The animation itself lives in globals.css; this decides when it runs.
 *
 * Deliberately NOT a client component with state. The decision has to be made
 * before first paint or the visitor sees the page for a frame and then has it
 * covered, which reads as a glitch rather than a splash. So it works the same
 * way ThemeScript does: a synchronous <head> script stamps an attribute on
 * <html>, and CSS keys off that. React never re-renders it.
 */

const DURATION_MS = 2400; // must match --asl-dur in globals.css

const SPLASH_INIT_SCRIPT = `
(function() {
  try {
    var root = document.documentElement;
    // Someone who asked for less motion should not be handed a 2.4s animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Once per tab: it is a launch moment, not something to sit through on
    // every navigation or reload.
    if (sessionStorage.getItem("splashShown") === "1") return;

    var standalone =
      window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    // In the installed app a splash is expected wherever you land. On the web
    // it would just delay someone who followed a search result or a shared
    // link straight to a listing, so restrict it to the front door.
    if (!standalone && location.pathname !== "/") return;

    sessionStorage.setItem("splashShown", "1");
    root.setAttribute("data-splash", "");

    var done = function() {
      if (!root.hasAttribute("data-splash")) return;
      root.removeAttribute("data-splash");
      window.removeEventListener("pointerdown", done);
      window.removeEventListener("keydown", done);
      document.removeEventListener("animationend", onEnd);
    };
    // Wait for the animation itself to finish rather than for a matching
    // setTimeout. This script runs while <head> is parsing, but the animation
    // does not start until the element is first styled — on a slow load that
    // gap is hundreds of milliseconds, and a fixed timer would cut the
    // hand-off fade off mid-way. Animation events bubble, so document-level
    // is enough even though the element does not exist yet.
    var onEnd = function(e) { if (e.animationName === "asl-handoff") done(); };
    document.addEventListener("animationend", onEnd);
    // Only a backstop, for when the animation never runs at all.
    setTimeout(done, ${DURATION_MS} + 4000);
    // Skippable — a tap or any key gets you straight to the page.
    window.addEventListener("pointerdown", done);
    window.addEventListener("keydown", done);
  } catch (e) {}
})();
`;

export function SplashScreenScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SPLASH_INIT_SCRIPT }} />;
}

export function SplashScreen() {
  return (
    // aria-hidden: the real page is underneath and is what a screen reader
    // should be reading; this is a decorative curtain over it.
    <div className="asl-splash" aria-hidden="true">
      <div className="asl-splash-inner">
        <div className="asl-lead">
          <p className="asl-lead-title">Vetted pros, right where you are</p>
          <p className="asl-lead-sub">Compare, message and book — near you.</p>
        </div>

        <div className="asl-slot asl-slot-radar">
          <div className="asl-radar">
            <div className="asl-ring asl-ring-3" />
            <div className="asl-ring asl-ring-2" />
            <div className="asl-ring asl-ring-1" />
            <div className="asl-sweep" />
            <div className="asl-pin asl-pin-1" />
            <div className="asl-pin asl-pin-2" />
            <div className="asl-pin asl-pin-3" />
            <div className="asl-pin asl-pin-4" />
          </div>
        </div>

        <div className="asl-slot">
          <div className="asl-mark-wrap">
            {/* Plain <img>: next/image would lazily swap the src in, which is
                exactly wrong for something that must be painted immediately. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="asl-mark" src="/logo-mark.svg" alt="" width={108} height={108} />
            <p className="asl-wordmark">
              Asap<span>Local</span>
            </p>
            <p className="asl-tagline">Find trusted local service providers</p>
          </div>
        </div>

        <div className="asl-bar">
          <span className="asl-bar-fill" />
        </div>
      </div>
    </div>
  );
}
