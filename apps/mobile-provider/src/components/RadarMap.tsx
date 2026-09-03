import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Point, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

const MILES_TO_METERS = 1609.34;
const INITIAL_LAT_DELTA = 0.25;
const INITIAL_LNG_DELTA = 0.25;
const INFO_CARD_WIDTH = 240;
const INFO_CARD_FALLBACK_HEIGHT = 150;
const POINTER_SIZE = 8;
const PIN_HEIGHT = 42; // default react-native-maps pin anchors at its bottom tip, and stands roughly this tall above the coordinate point
const EDGE_BUFFER = 16;
const PULSE_RING_SIZE = 64; // matches web's dashboard radar-map.tsx pulse overlay: h-16 w-16 rings, animate-ping to 2x
const PULSE_DOT_SIZE = 12;

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

function useRingAnim(delayMs: number) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delayMs, scale, opacity]);

  return { opacity, transform: [{ scale }] };
}

// A world-space Circle's radius is in real metres, so it visually shrinks
// as the map zooms out — invisible at the dashboard's default zoom unless
// the provider zoomed in a long way. Web's own pulse is a fixed-CSS-pixel
// DOM overlay glued to the location's on-screen point, unaffected by zoom
// at all — this ports that: a plain (non-map) Animated.View positioned via
// pointForCoordinate, so it's always exactly this visible regardless of
// zoom, and — being outside react-native-maps' Marker system entirely —
// fully native-driver animated with none of the Marker/tracksViewChanges
// snapshot unreliability that broke the previous two attempts.
function PulseOverlay({ point }: { point: Point }) {
  const ring1 = useRingAnim(0);
  const ring2 = useRingAnim(333);
  const ring3 = useRingAnim(666);

  return (
    <View pointerEvents="none" style={[styles.pulseOverlay, { left: point.x - PULSE_RING_SIZE / 2, top: point.y - PULSE_RING_SIZE / 2 }]}>
      <Animated.View style={[styles.pulseRing, ring1]} />
      <Animated.View style={[styles.pulseRing, ring2]} />
      <Animated.View style={[styles.pulseRing, ring3]} />
      <View style={styles.pulseDot} />
    </View>
  );
}

// Ports web's google.maps.Animation.DROP for newly-appeared leads — react-
// native-maps has no built-in equivalent, and (per PulseOverlay above) a
// Marker-snapshot animation can't be trusted to render reliably, so this is
// the same screen-space-overlay technique: a plain View that falls in with
// a spring/bounce and un-mounts once settled, drawn on top of the always-
// present (and always correctly positioned, even mid-pan) real Marker
// underneath.
function DropInPin({ point }: { point: Point }) {
  const translateY = useRef(new Animated.Value(-260)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 4.5, tension: 55, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 3.5, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }, [translateY, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dropPinWrap, { left: point.x - 9, top: point.y - 9, transform: [{ translateY }, { scale }] }]}
    >
      <View style={styles.dropPinDot} />
    </Animated.View>
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
  const [centerPoint, setCenterPoint] = useState<Point | null>(null);
  const [infoCardHeight, setInfoCardHeight] = useState(INFO_CARD_FALLBACK_HEIGHT);
  const [mapWidth, setMapWidth] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);
  const [region, setRegion] = useState<Region>({
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: INITIAL_LAT_DELTA,
    longitudeDelta: INITIAL_LNG_DELTA,
  });
  const [droppingLeads, setDroppingLeads] = useState<Record<string, Point>>({});
  const seenLeadIds = useRef<Set<string>>(new Set());

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

  // Drop-in animation for newly-appeared leads only — everything visible on
  // first load counts as "new" (seenLeadIds starts empty), later poll ticks
  // only animate genuinely new pins rather than replaying the drop for
  // leads already sitting on the map.
  useEffect(() => {
    const newLeads = leads.filter((l) => !seenLeadIds.current.has(l.id));
    if (newLeads.length === 0) return;
    newLeads.forEach((l) => seenLeadIds.current.add(l.id));

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        newLeads.map(async (lead) => {
          const point = await mapRef.current?.pointForCoordinate({ latitude: lead.jitteredLat, longitude: lead.jitteredLng }).catch(() => null);
          return point ? { id: lead.id, point } : null;
        })
      );
      if (cancelled) return;
      const valid = results.filter((r): r is { id: string; point: Point } => r !== null);
      if (valid.length === 0) return;
      setDroppingLeads((prev) => {
        const next = { ...prev };
        valid.forEach(({ id, point }) => {
          next[id] = point;
        });
        return next;
      });
      valid.forEach(({ id }) => {
        setTimeout(() => {
          setDroppingLeads((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 900);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [leads]);

  const updatePoints = useCallback(async () => {
    const centerPt = await mapRef.current?.pointForCoordinate({ latitude: center.lat, longitude: center.lng }).catch(() => null);
    if (centerPt) setCenterPoint(centerPt);
  }, [center.lat, center.lng]);

  const circles = serviceAreas.length > 0 ? serviceAreas : [{ ...center, radiusMiles: baseRadiusMiles }];

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedPoint(null);
  }, []);

  // The popup needs to sit fully above the tapped pin — but if the pin is
  // too close to the top of the map, there's no room and it gets clipped
  // by the card's own overflow:hidden. Rather than let that happen, pan the
  // map so the pin ends up lower on screen first, then position the popup
  // once that settles (onRegionChangeComplete re-syncs selectedPoint).
  const selectLead = useCallback(
    async (lead: NearbyLead) => {
      setSelected(lead);
      setInfoCardHeight(INFO_CARD_FALLBACK_HEIGHT);
      const point = await mapRef.current?.pointForCoordinate({ latitude: lead.jitteredLat, longitude: lead.jitteredLng }).catch(() => null);
      if (!point) return;
      const requiredHeadroom = INFO_CARD_FALLBACK_HEIGHT + POINTER_SIZE + PIN_HEIGHT + EDGE_BUFFER;
      const deficit = requiredHeadroom - point.y;
      if (deficit > 0 && mapHeight > 0) {
        const offsetLat = (deficit / mapHeight) * region.latitudeDelta;
        mapRef.current?.animateToRegion(
          {
            latitude: lead.jitteredLat + offsetLat,
            longitude: lead.jitteredLng,
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          },
          300
        );
        // selectedPoint stays null until the pan settles and
        // onRegionChangeComplete re-syncs it, so the popup doesn't flash
        // into view mispositioned first.
      } else {
        setSelectedPoint(point);
      }
    },
    [mapHeight, region]
  );

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
      <View
        style={styles.mapWrap}
        onLayout={(e) => {
          setMapWidth(e.nativeEvent.layout.width);
          setMapHeight(e.nativeEvent.layout.height);
        }}
      >
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: INITIAL_LAT_DELTA, longitudeDelta: INITIAL_LNG_DELTA }}
          customMapStyle={scheme === 'dark' ? MONOCHROME_DARK_STYLE : []}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
          onPress={clearSelection}
          onMapReady={updatePoints}
          onRegionChangeComplete={(r) => {
            setRegion(r);
            updatePoints();
            if (selected) {
              mapRef.current
                ?.pointForCoordinate({ latitude: selected.jitteredLat, longitude: selected.jitteredLng })
                .then((p) => setSelectedPoint(p))
                .catch(() => {});
            }
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

        {centerPoint && <PulseOverlay point={centerPoint} />}

        {Object.entries(droppingLeads).map(([id, point]) => (
          <DropInPin key={id} point={point} />
        ))}

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
  mapWrap: { height: 380, width: '100%' },
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
  pulseOverlay: {
    position: 'absolute',
    width: PULSE_RING_SIZE,
    height: PULSE_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: PULSE_RING_SIZE,
    height: PULSE_RING_SIZE,
    borderRadius: PULSE_RING_SIZE / 2,
    backgroundColor: 'rgba(193, 95, 42, 0.3)',
  },
  pulseDot: {
    width: PULSE_DOT_SIZE,
    height: PULSE_DOT_SIZE,
    borderRadius: PULSE_DOT_SIZE / 2,
    backgroundColor: '#c15f2a',
  },
  dropPinWrap: { position: 'absolute', width: 18, height: 18 },
  dropPinDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#c15f2a', borderWidth: 2, borderColor: '#fff' },
});
