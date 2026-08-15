"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "lucide-react";
import { Button, Card } from "@asaplocal/ui";

export function OnTheWayPanel({ bookingId, initialEtaMinutes }: { bookingId: string; initialEtaMinutes: number | null }) {
  const router = useRouter();
  const [etaMinutes, setEtaMinutes] = useState(initialEtaMinutes?.toString() ?? "15");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function sendPosition() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch(`/api/bookings/${bookingId}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => {
        setError("Couldn't read your location — check browser location permissions.");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = Number(etaMinutes);
    if (!Number.isFinite(minutes) || minutes < 1) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/eta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etaMinutes: Math.round(minutes), trackingEnabled }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't notify the customer");

      if (trackingEnabled && "geolocation" in navigator) {
        setSharing(true);
        sendPosition();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(sendPosition, 15_000);
      } else {
        setSharing(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <Navigation size={18} className="text-brand-600" />
        <h2 className="font-semibold">On your way?</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Let the customer know when to expect you. Sharing your location only works while this page stays open — it's not a
        background tracker.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">ETA (minutes)</span>
          <input
            type="number"
            min={1}
            max={180}
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(e.target.value)}
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackingEnabled}
            onChange={(e) => setTrackingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Share my live location with the customer
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Notifying…" : sharing ? "Update ETA" : "Notify customer"}
        </Button>
        {sharing && <p className="text-xs text-muted-foreground">Sharing your location every 15 seconds while this page is open.</p>}
      </form>
    </Card>
  );
}
