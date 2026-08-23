"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "./utils";

const DISMISSED_KEY = "installBannerDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Renders nothing unless the app is genuinely installable and the visitor has
 * not dismissed it — so the caller owns spacing via `className` rather than
 * wrapping this in a padded div that would leave a gap when it returns null.
 *
 * Chrome only fires `beforeinstallprompt` when the origin serves a web app
 * manifest with the required icons; iOS never fires it at all, hence the
 * separate Add-to-Home-Screen instructions.
 */
export function InstallAppBanner({ appName = "AsapLocal", className }: { appName?: string; className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  // Start hidden and reveal after the checks below, so the banner can never
  // flash on a device that already has the app installed.
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed || (!deferredPrompt && !isIOS)) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className={className}>
      <Card className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Install the {appName} app</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isIOS ? (
              <>
                Tap <Share size={13} className="inline -mt-0.5" /> then &quot;Add to Home Screen&quot; for the full app experience.
              </>
            ) : (
              "Add it to your home screen for faster access."
            )}
          </p>
          {!isIOS && (
            <Button size="sm" onClick={install} className="mt-3 gap-1.5">
              <Download size={14} />
              Install
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className={cn(
            "-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          )}
        >
          <X size={16} />
        </button>
      </Card>
    </div>
  );
}
