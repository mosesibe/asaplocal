"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { Card, useTheme, formatPence } from "@asaplocal/ui";
import type { NearbyLead } from "@asaplocal/core";

const MONOCHROME_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

interface ServiceAreaCircleDef {
  lat: number;
  lng: number;
  radiusMiles: number;
}

const MILES_TO_METERS = 1609.34;

function budgetLabel(lead: NearbyLead): string {
  if (lead.budgetMinPence && lead.budgetMaxPence) return `${formatPence(lead.budgetMinPence)}–${formatPence(lead.budgetMaxPence)}`;
  if (lead.budgetMaxPence) return `Up to ${formatPence(lead.budgetMaxPence)}`;
  if (lead.budgetMinPence) return `From ${formatPence(lead.budgetMinPence)}`;
  return "Not specified";
}

/**
 * Anchored to real map coordinates via OverlayView — a CSS overlay pinned to
 * the card's center would stay put on screen while panning, making it look
 * like the business's own location was drifting. This one moves with the map
 * projection like any other marker, so it stays over the true position.
 *
 * Built inside a factory rather than declared at module scope: `extends
 * google.maps.OverlayView` is evaluated when the class definition runs, and
 * this module is also evaluated on the server (client components are still
 * SSR'd), where `google` doesn't exist. A top-level class here throws
 * ReferenceError and 500s the whole page — and `next build` won't catch it,
 * since /dashboard is rendered on demand rather than prerendered.
 */
function createPulseOverlay(position: google.maps.LatLngLiteral) {
  class PulseOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private readonly latLng: google.maps.LatLng;

    constructor(pos: google.maps.LatLngLiteral) {
      super();
      this.latLng = new google.maps.LatLng(pos);
    }

    onAdd() {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.transform = "translate(-50%, -50%)";
      el.className = "pointer-events-none relative flex h-16 w-16 items-center justify-center";
      for (const delay of ["0s", "0.8s", "1.6s"]) {
        const ring = document.createElement("span");
        ring.className = "absolute h-16 w-16 animate-ping rounded-full bg-brand-500/30";
        ring.style.animationDuration = "2.5s";
        ring.style.animationDelay = delay;
        el.appendChild(ring);
      }
      const dot = document.createElement("span");
      dot.className = "relative h-3 w-3 rounded-full bg-brand-500 shadow-accent";
      el.appendChild(dot);
      this.div = el;
      this.getPanes()?.overlayMouseTarget.appendChild(el);
    }

    draw() {
      if (!this.div) return;
      const point = this.getProjection()?.fromLatLngToDivPixel(this.latLng);
      if (point) {
        this.div.style.left = `${point.x}px`;
        this.div.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  return new PulseOverlay(position);
}

function ProviderLocationMarker({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const overlay = createPulseOverlay(position);
    overlay.setMap(map);
    return () => overlay.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position.lat, position.lng]);

  return null;
}

function CoverageCircles({ areas }: { areas: ServiceAreaCircleDef[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circles = areas.map(
      (area) =>
        new google.maps.Circle({
          map,
          center: { lat: area.lat, lng: area.lng },
          radius: area.radiusMiles * MILES_TO_METERS,
          strokeColor: "#c15f2a",
          strokeOpacity: 0.5,
          strokeWeight: 2,
          fillColor: "#c15f2a",
          fillOpacity: 0.07,
          clickable: false,
        })
    );
    return () => circles.forEach((c) => c.setMap(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(areas)]);
  return null;
}

function textEl(tag: string, className: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function leadInfoContent(lead: NearbyLead, onView: () => void): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "min-w-[220px] max-w-[260px] py-1";
  el.appendChild(textEl("p", "text-sm font-semibold text-espresso-900", lead.title));
  el.appendChild(
    textEl("p", "mt-0.5 text-xs text-espresso-500", `${lead.categoryName} · ${lead.city} · ${lead.distanceMiles.toFixed(1)} mi away`)
  );
  el.appendChild(textEl("p", "mt-1.5 text-sm font-medium text-espresso-900", `Expected cost: ${budgetLabel(lead)}`));
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = lead.alreadyAcquired ? "View details" : "View & acquire";
  button.className = "mt-2.5 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700";
  button.addEventListener("click", onView);
  el.appendChild(button);
  return el;
}

function LeadMarkers({ leads, onView }: { leads: NearbyLead[]; onView: (lead: NearbyLead) => void }) {
  const map = useMap();
  const markersRef = useRef<globalThis.Map<string, google.maps.Marker>>(new globalThis.Map());
  const leadsRef = useRef<globalThis.Map<string, NearbyLead>>(new globalThis.Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!infoWindowRef.current) infoWindowRef.current = new google.maps.InfoWindow();

    const currentIds = new Set(leads.map((l) => l.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
        leadsRef.current.delete(id);
      }
    }
    for (const lead of leads) {
      leadsRef.current.set(lead.id, lead);
      if (markersRef.current.has(lead.id)) continue;
      const marker = new google.maps.Marker({
        map,
        position: { lat: lead.jitteredLat, lng: lead.jitteredLng },
        title: lead.categoryName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#c15f2a",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        animation: google.maps.Animation.DROP,
      });
      marker.addListener("click", () => {
        const current = leadsRef.current.get(lead.id);
        if (!current || !infoWindowRef.current) return;
        infoWindowRef.current.setContent(leadInfoContent(current, () => onView(current)));
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.set(lead.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, leads]);

  useEffect(
    () => () => {
      infoWindowRef.current?.close();
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
    },
    []
  );

  return null;
}

export function RadarMap({
  center,
  baseRadiusMiles,
  serviceAreas,
}: {
  center: { lat: number; lng: number };
  baseRadiusMiles: number;
  serviceAreas: ServiceAreaCircleDef[];
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [leads, setLeads] = useState<NearbyLead[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/leads/nearby");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setLeads(data.leads ?? []);
      } catch {
        // best-effort — a failed poll just leaves the last known pins in place
      }
    }
    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const circles = serviceAreas.length > 0 ? serviceAreas : [{ ...center, radiusMiles: baseRadiusMiles }];

  return (
    <Card className="relative overflow-hidden p-0">
      <div className="relative h-80 w-full sm:h-96">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={11}
              gestureHandling="greedy"
              zoomControl
              disableDefaultUI
              keyboardShortcuts={false}
              styles={theme === "dark" ? MONOCHROME_DARK_STYLE : []}
            >
              <CoverageCircles areas={circles} />
              <ProviderLocationMarker position={center} />
              <LeadMarkers
                leads={leads}
                onView={(lead) => router.push(lead.alreadyAcquired ? `/leads/${lead.id}` : `/leads?highlight=${lead.id}#lead-${lead.id}`)}
              />
            </Map>
          </APIProvider>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">Map unavailable</div>
        )}

        <button
          type="button"
          onClick={() => router.push("/leads")}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-espresso-900/90 px-4 py-2 text-sm font-medium text-white shadow-card backdrop-blur-sm dark:bg-espresso-50/90 dark:text-espresso-900"
        >
          {leads.length > 0 ? `${leads.length} lead${leads.length === 1 ? "" : "s"} nearby` : "Searching for leads…"}
        </button>
      </div>
    </Card>
  );
}
