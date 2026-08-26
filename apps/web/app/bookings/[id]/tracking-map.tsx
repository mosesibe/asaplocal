"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import Pusher from "pusher-js";
import { Card } from "@asaplocal/ui";

interface LatLng {
  lat: number;
  lng: number;
}

function LiveMarkers({ providerPosition, destination }: { providerPosition: LatLng | null; destination: LatLng | null }) {
  const map = useMap();
  const providerMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    if (destination && !destinationMarkerRef.current) {
      destinationMarkerRef.current = new google.maps.Marker({
        map,
        position: destination,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#20140c", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    }
    return () => {
      destinationMarkerRef.current?.setMap(null);
      destinationMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, destination?.lat, destination?.lng]);

  useEffect(() => {
    if (!map || !providerPosition) return;
    if (!providerMarkerRef.current) {
      providerMarkerRef.current = new google.maps.Marker({
        map,
        position: providerPosition,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#FF5A00", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
    } else {
      providerMarkerRef.current.setPosition(providerPosition);
    }
    map.panTo(providerPosition);
  }, [map, providerPosition]);

  useEffect(
    () => () => {
      providerMarkerRef.current?.setMap(null);
      destinationMarkerRef.current?.setMap(null);
    },
    []
  );

  return null;
}

export function TrackingMap({
  bookingId,
  destination,
  initialProviderPosition,
  initialEtaMinutes,
}: {
  bookingId: string;
  destination: LatLng | null;
  initialProviderPosition: LatLng | null;
  initialEtaMinutes: number | null;
}) {
  const [providerPosition, setProviderPosition] = useState<LatLng | null>(initialProviderPosition);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(initialEtaMinutes);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      authEndpoint: "/api/pusher/auth",
    });
    const channel = pusher.subscribe(`private-booking-${bookingId}`);
    channel.bind("location-update", (data: { lat: number; lng: number }) => setProviderPosition({ lat: data.lat, lng: data.lng }));
    channel.bind("eta-update", (data: { etaMinutes: number }) => setEtaMinutes(data.etaMinutes));
    return () => {
      pusher.unsubscribe(`private-booking-${bookingId}`);
      pusher.disconnect();
    };
  }, [bookingId]);

  const center = providerPosition ?? destination ?? { lat: 51.5072, lng: -0.1276 };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">Your provider is on the way</p>
        {etaMinutes != null && <p className="text-sm text-muted-foreground">Arriving in about {etaMinutes} min</p>}
      </div>
      <div className="h-64 w-full">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map defaultCenter={center} defaultZoom={13} gestureHandling="greedy" disableDefaultUI>
              <LiveMarkers providerPosition={providerPosition} destination={destination} />
            </Map>
          </APIProvider>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">Map unavailable</div>
        )}
      </div>
    </Card>
  );
}
