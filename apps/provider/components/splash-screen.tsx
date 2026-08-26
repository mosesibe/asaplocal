import { SplashScript } from "@asaplocal/ui";

/**
 * Launch splash — direction B ("earnings") from design/provider-splash,
 * published at claude.ai/code/artifact/bfec3b50-255e-4cec-b0f5-862c3137857c.
 * The animation lives in globals.css; SplashScript decides when it runs.
 */

/** Must match --asl-dur in globals.css. */
const DURATION_MS = 2400;

export function SplashScreenScript() {
  // "/" only redirects (to /dashboard or /onboarding), so the dashboard is the
  // real front door for a signed-in provider on the web.
  return <SplashScript routes={["/", "/dashboard"]} durationMs={DURATION_MS} />;
}

export function SplashScreen() {
  return (
    // aria-hidden: the real page is underneath and is what a screen reader
    // should be reading; this is a decorative curtain over it.
    <div className="asl-splash" aria-hidden="true">
      <div className="asl-splash-inner">
        <div className="asl-glow" />

        <div className="asl-promise">
          <p className="asl-promise-title">Get paid, job by job</p>
          <p className="asl-promise-sub">Commission out, payout in — every job accounted for.</p>
        </div>

        {/* Figures are the design's, and they reconcile: 980 paid out + 260
            available = 1,240 earned, at the platform's real 10% commission. */}
        <div className="asl-panel">
          <p className="asl-panel-label">Earned (after commission)</p>
          <p className="asl-total">£1,240.00</p>
          <p className="asl-total-sub">6 jobs completed this month</p>

          <div className="asl-chart">
            <div className="asl-col"><span className="asl-col-bar" /></div>
            <div className="asl-col"><span className="asl-col-bar" /></div>
            <div className="asl-col"><span className="asl-col-bar" /></div>
            <div className="asl-col"><span className="asl-col-bar" /></div>
            <div className="asl-col"><span className="asl-col-bar" /></div>
            <div className="asl-col"><span className="asl-col-bar" /></div>
          </div>

          <div className="asl-splits">
            <div className="asl-split">
              <p className="asl-split-label">Paid out</p>
              <p className="asl-split-value">£980.00</p>
            </div>
            <div className="asl-split">
              <p className="asl-split-label">Available</p>
              <p className="asl-split-value asl-accent">£260.00</p>
            </div>
            <div className="asl-split">
              <p className="asl-split-label">Commission</p>
              <p className="asl-split-value">10%</p>
            </div>
          </div>
        </div>

        <div className="asl-mark-wrap">
          <div className="asl-mark-rings">
            <div className="asl-mark-ring" />
            <div className="asl-mark-ring asl-delay" />
          </div>
          {/* Plain <img>: next/image would lazily swap the src in, which is
              exactly wrong for something that must be painted immediately. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="asl-mark" src="/logo-mark-dark.png" alt="" width={108} height={108} />
          <p className="asl-lockup">
            <span className="asl-wordmark">
              Asap<span>Local</span>
            </span>
            <span className="asl-qualifier">Business</span>
          </p>
          <p className="asl-tagline">Win more local work</p>
        </div>

        <div className="asl-bar">
          <span className="asl-bar-fill" />
        </div>
      </div>
    </div>
  );
}
