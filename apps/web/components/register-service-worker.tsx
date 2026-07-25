"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Service workers must never run against the dev server: Next's dev
      // chunks aren't content-hashed, so a cache-first SW keeps serving
      // stale JS after every restart — causing "Cannot read properties of
      // undefined (reading 'call')" crashes. Self-heal anyone who picked up
      // the SW/cache before this guard existed.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("[sw] registration failed", err));
  }, []);

  return null;
}
