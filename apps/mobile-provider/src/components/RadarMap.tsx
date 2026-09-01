import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

const MILES_TO_METERS = 1609.34;

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

function PulsingDot() {
  const scale1 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(0)).current;
  const scale3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const animations = [loop(scale1, 0), loop(scale2, 800), loop(scale3, 1600)];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [scale1, scale2, scale3]);

  const ringStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  });

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, ringStyle(scale1)]} />
      <Animated.View style={[styles.pulseRing, ringStyle(scale2)]} />
      <Animated.View style={[styles.pulseRing, ringStyle(scale3)]} />
      <View style={styles.pulseDot} />
    </View>
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
  const [leads, setLeads] = useState<NearbyLead[]>([]);
  const [selected, setSelected] = useState<NearbyLead | null>(null);

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

  const handleView = (lead: NearbyLead) => {
    setSelected(null);
    // An un-acquired lead has no detail route of its own yet (acquiring is
    // what unlocks one) — land on the marketplace list with this lead
    // singled out, mirroring apps/provider/app/dashboard/radar-map.tsx's
    // own `?highlight=` handoff, rather than dropping the user into an
    // unfiltered list with no idea which card was the one they tapped.
    router.push(lead.alreadyAcquired ? `/leads/${lead.id}` : { pathname: '/leads', params: { highlight: lead.id } });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.mapWrap}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }}
          customMapStyle={scheme === 'dark' ? MONOCHROME_DARK_STYLE : []}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
          onPress={() => setSelected(null)}
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

          {/* tracksViewChanges must stay true here: react-native-maps only
              re-renders a custom marker's child view (vs. reusing a static
              snapshot) while this is true, so with it false the pulse
              animation never actually plays — the marker just freezes as
              whatever frame it first rendered. Lead pins below have no
              animation, so they keep it false for performance. */}
          <Marker coordinate={{ latitude: center.lat, longitude: center.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
            <PulsingDot />
          </Marker>

          {leads.map((lead) => (
            <Marker
              key={lead.id}
              coordinate={{ latitude: lead.jitteredLat, longitude: lead.jitteredLng }}
              pinColor="#c15f2a"
              onPress={() => setSelected(lead)}
            />
          ))}
        </MapView>

        {selected && (
          <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text variant="smallMedium">{selected.title}</Text>
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
    left: 12,
    right: 12,
    bottom: 52,
    gap: 2,
  },
  infoBudget: { marginTop: 2 },
  infoButton: { marginTop: 8 },
  pulseWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c15f2a',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c15f2a',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
