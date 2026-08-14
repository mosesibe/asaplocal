"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this provider"
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-brand-300 hover:bg-muted"
    >
      {copied ? <Check size={20} className="text-emerald-600" /> : <Share2 size={20} className="text-muted-foreground" />}
      {copied && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background">
          Link copied
        </span>
      )}
    </button>
  );
}
