import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type LatLng, type Point } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

const MILES_TO_METERS = 1609.34;
const INFO_CARD_WIDTH = 240;
const INFO_CARD_FALLBACK_HEIGHT = 150;
const POINTER_SIZE = 8;
const PIN_HEIGHT = 42; // default react-native-maps pin anchors at its bottom tip, and stands roughly this tall above the coordinate point

// Ports apps/provider/app/dashboard/radar-map.tsx's exact style array — the
// Google Maps JSON style format is identical between @vis.gl/react-google-
// maps (web) and react-native-maps' customMapStyle (native), so this is a
// verbatim copy, not a re-derivation.
const MONOCHROME_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

interface ServiceAreaCircleDef {
  lat: number;
  lng: number;
  radiusMiles: number;
}

interface NearbyLead {
  id: string;
  title: string;
  categoryName: string;
  city: string;
  distanceMiles: number;
  budgetMinPence: number | null;
  budgetMaxPence: number | null;
  jitteredLat: number;
  jitteredLng: number;
  alreadyAcquired: boolean;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

function budgetLabel(lead: NearbyLead): string {
  if (lead.budgetMinPence && lead.budgetMaxPence) return `${formatPence(lead.budgetMinPence)}–${formatPence(lead.budgetMaxPence)}`;
  if (lead.budgetMaxPence) return `Up to ${formatPence(lead.budgetMaxPence)}`;
  if (lead.budgetMinPence) return `From ${formatPence(lead.budgetMinPence)}`;
  return 'Not specified';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// A Marker's custom child view is only re-captured (with tracksViewChanges)
// when RN's own JS-side render cycle sees it change — react-native-maps
// snapshots it as a bitmap otherwise, and in practice that snapshot timing
// proved unreliable for a continuously-looping animation even with
// tracksViewChanges + a JS-driven (non-native-driver) Animated value.
// Circle is a native map primitive with its own props (radius, fillColor),
// not a view snapshot, so animating those directly sidesteps the whole
// marker-snapshot mechanism rather than continuing to fight it.
function PulseRing({ center, delayMs }: { center: LatLng; delayMs: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const value = new Animated.Value(0);
    const listenerId = value.addListener(({ value: v }) => setProgress(v));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(value, { toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      value.removeListener(listenerId);
    };
  }, [delayMs]);

  return (
    <Circle
      center={center}
      radius={20 + progress * 350}
      strokeWidth={0}
      fillColor={`rgba(193, 95, 42, ${(0.35 * (1 - progress)).toFixed(2)})`}
    />
  );
}

// Ports apps/provider/app/dashboard/radar-map.tsx as a native map. Info
// windows become a bottom info card (state-driven) rather than a native
// Marker Callout, since Callout's onPress for a tappable body is unreliable
// on Android — a plain Card matches this app's established hand-built-UI
// pattern anyway.
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
  const { colors, scheme } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [leads, setLeads] = useState<NearbyLead[]>([]);
  const [selected, setSelected] = useState<NearbyLead | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [infoCardHeight, setInfoCardHeight] = useState(INFO_CARD_FALLBACK_HEIGHT);
  const [mapWidth, setMapWidth] = useState(0);

  const poll = useCallback(async () => {
    try {
      const res = await api.request<{ leads: NearbyLead[] }>('/api/leads/nearby');
      setLeads(res.leads ?? []);
    } catch {
      // best-effort — a failed poll just leaves the last known pins in place
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, [poll]);

  const circles = serviceAreas.length > 0 ? serviceAreas : [{ ...center, radiusMiles: baseRadiusMiles }];

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedPoint(null);
  }, []);

  // The popup needs to sit above the exact pin the provider tapped, so its
  // on-screen position is looked up from the pin's lat/lng rather than
  // pinned to a fixed spot on the card — and re-looked-up on pan/zoom so it
  // stays anchored to that pin instead of drifting off it.
  const selectLead = useCallback(async (lead: NearbyLead) => {
    setSelected(lead);
    setInfoCardHeight(INFO_CARD_FALLBACK_HEIGHT);
    try {
      const point = await mapRef.current?.pointForCoordinate({ latitude: lead.jitteredLat, longitude: lead.jitteredLng });
      if (point) setSelectedPoint(point);
    } catch {
      // best-effort — falls back to no popup rather than a mispositioned one
    }
  }, []);

  const handleView = (lead: NearbyLead) => {
    clearSelection();
    // An un-acquired lead has no detail route of its own yet (acquiring is
    // what unlocks one) — land on the marketplace list with this lead
    // singled out, mirroring apps/provider/app/dashboard/radar-map.tsx's
    // own `?highlight=` handoff, rather than dropping the user into an
    // unfiltered list with no idea which card was the one they tapped.
    router.push(lead.alreadyAcquired ? `/leads/${lead.id}` : { pathname: '/leads', params: { highlight: lead.id } });
  };

  const infoLeft = selectedPoint ? clamp(selectedPoint.x - INFO_CARD_WIDTH / 2, 8, mapWidth - INFO_CARD_WIDTH - 8) : 0;
  const infoTop = selectedPoint ? selectedPoint.y - infoCardHeight - POINTER_SIZE - PIN_HEIGHT : 0;
  const pointerLeft = selectedPoint ? selectedPoint.x - POINTER_SIZE : 0;
  const pointerTop = selectedPoint ? selectedPoint.y - POINTER_SIZE * 2 - PIN_HEIGHT : 0;

  return (
    <Card style={styles.card}>
      <View style={styles.mapWrap} onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }}
          customMapStyle={scheme === 'dark' ? MONOCHROME_DARK_STYLE : []}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
          onPress={clearSelection}
          onRegionChangeComplete={() => {
            if (selected) selectLead(selected);
          }}
        >
          {circles.map((area, i) => (
            <Circle
              key={i}
              center={{ latitude: area.lat, longitude: area.lng }}
              radius={area.radiusMiles * MILES_TO_METERS}
              strokeColor="#c15f2a80"
              strokeWidth={2}
              fillColor="#c15f2a12"
            />
          ))}

          <PulseRing center={{ latitude: center.lat, longitude: center.lng }} delayMs={0} />
          <PulseRing center={{ latitude: center.lat, longitude: center.lng }} delayMs={800} />
          <PulseRing center={{ latitude: center.lat, longitude: center.lng }} delayMs={1600} />
          <Marker coordinate={{ latitude: center.lat, longitude: center.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.centerDot} />
          </Marker>

          {leads.map((lead) => (
            <Marker
              key={lead.id}
              coordinate={{ latitude: lead.jitteredLat, longitude: lead.jitteredLng }}
              pinColor="#c15f2a"
              onPress={(e) => {
                // On Android a marker tap also bubbles up to the MapView's
                // own onPress, which clears the selection — so without this
                // the two handlers fired in the same tick and the info card
                // never actually appeared, no matter how reliably the
                // marker's own onPress ran.
                e.stopPropagation();
                selectLead(lead);
              }}
            />
          ))}
        </MapView>

        {selected && selectedPoint && (
          <>
            <Card
              onLayout={(e) => setInfoCardHeight(e.nativeEvent.layout.height)}
              style={[styles.infoCard, { backgroundColor: colors.surface, left: infoLeft, top: infoTop, width: INFO_CARD_WIDTH }]}
            >
              <Pressable onPress={clearSelection} style={styles.infoClose} hitSlop={8}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
              <Text variant="smallMedium" style={styles.infoTitle}>
                {selected.title}
              </Text>
              <Text variant="caption" color="muted">
                {selected.categoryName} · {selected.city} · {selected.distanceMiles.toFixed(1)} mi away
              </Text>
              <Text variant="small" style={styles.infoBudget}>
                Expected cost: {budgetLabel(selected)}
              </Text>
              <Button size="sm" onPress={() => handleView(selected)} style={styles.infoButton}>
                {selected.alreadyAcquired ? 'View details' : 'View & acquire'}
              </Button>
            </Card>
            <View style={[styles.infoPointer, { left: pointerLeft, top: pointerTop, borderTopColor: colors.surface }]} />
          </>
        )}

        <Pressable style={styles.pill} onPress={() => router.push('/leads')}>
          <Text variant="smallMedium" color="inverse">
            {leads.length > 0 ? `${leads.length} lead${leads.length === 1 ? '' : 's'} nearby` : 'Searching for leads…'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  mapWrap: { height: 280, width: '100%' },
  pill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(32,20,12,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  infoCard: {
    position: 'absolute',
    gap: 2,
  },
  infoClose: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  infoTitle: { paddingRight: 20 },
  infoBudget: { marginTop: 2 },
  infoButton: { marginTop: 8 },
  infoPointer: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: POINTER_SIZE,
    borderRightWidth: POINTER_SIZE,
    borderTopWidth: POINTER_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#c15f2a',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
