"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button, Card } from "@asaplocal/ui";

const DISMISSED_KEY = "installBannerDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
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
    <Card className="mb-4 flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium">Install the AsapLocal app</p>
        <p className="text-sm text-muted-foreground">
          {isIOS ? (
            <>
              Tap <Share size={13} className="inline -mt-0.5" /> then "Add to Home Screen" for the full app experience.
            </>
          ) : (
            "Add it to your home screen for faster access."
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {!isIOS && (
          <Button size="sm" onClick={install} className="gap-1.5">
            <Download size={14} />
            Install
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
