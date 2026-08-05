"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { Card, useTheme } from "@asaplocal/ui";

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

interface NearbyLeadPin {
  id: string;
  jitteredLat: number;
  jitteredLng: number;
  categoryName: string;
}

const MILES_TO_METERS = 1609.34;

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

function LeadMarkers({ leads, onSelect }: { leads: NearbyLeadPin[]; onSelect: () => void }) {
  const map = useMap();
  const markersRef = useRef<globalThis.Map<string, google.maps.Marker>>(new globalThis.Map());

  useEffect(() => {
    if (!map) return;
    const currentIds = new Set(leads.map((l) => l.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }
    for (const lead of leads) {
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
      marker.addListener("click", onSelect);
      markersRef.current.set(lead.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, leads]);

  useEffect(
    () => () => {
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
  const [leads, setLeads] = useState<NearbyLeadPin[]>([]);
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
              gestureHandling="none"
              zoomControl={false}
              disableDefaultUI
              styles={theme === "dark" ? MONOCHROME_DARK_STYLE : []}
            >
              <CoverageCircles areas={circles} />
              <LeadMarkers leads={leads} onSelect={() => router.push("/leads")} />
            </Map>
          </APIProvider>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">Map unavailable</div>
        )}

        {/* Pulsing "actively searching" rings, centered on the business */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="absolute h-16 w-16 animate-ping rounded-full bg-brand-500/30" style={{ animationDuration: "2.5s" }} />
          <span className="absolute h-16 w-16 animate-ping rounded-full bg-brand-500/30" style={{ animationDuration: "2.5s", animationDelay: "0.8s" }} />
          <span className="absolute h-16 w-16 animate-ping rounded-full bg-brand-500/30" style={{ animationDuration: "2.5s", animationDelay: "1.6s" }} />
          <span className="relative h-3 w-3 rounded-full bg-brand-500 shadow-accent" />
        </div>

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
