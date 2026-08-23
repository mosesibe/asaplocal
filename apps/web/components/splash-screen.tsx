import { SplashScript } from "@asaplocal/ui";

/**
 * Launch splash — direction B ("radar sweep") from design/customer-splash,
 * published at claude.ai/code/artifact/8c4ab891-e11f-40fb-8912-5bf1b602fda9.
 * The animation lives in globals.css; SplashScript decides when it runs.
 */

/** Must match --asl-dur in globals.css. */
const DURATION_MS = 2400;

export function SplashScreenScript() {
  return <SplashScript routes={["/"]} durationMs={DURATION_MS} />;
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
