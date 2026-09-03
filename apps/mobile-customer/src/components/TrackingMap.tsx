import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

interface LatLng {
  lat: number;
  lng: number;
}

const LONDON_FALLBACK: LatLng = { lat: 51.5072, lng: -0.1276 };

// Ports apps/web/app/bookings/[id]/tracking-map.tsx. Web gets live position/
// ETA pushes over Pusher; this app polls the booking instead (same call the
// rest of it already makes — see bookings/[id].tsx's showTracking effect),
// so this component just renders whatever providerPosition/etaMinutes it's
// handed and re-centers on the provider whenever that prop actually moves.
export function TrackingMap({
  destination,
  providerPosition,
  etaMinutes,
}: {
  destination: LatLng | null;
  providerPosition: LatLng | null;
  etaMinutes: number | null;
}) {
  const { colors, scheme } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const center = providerPosition ?? destination ?? LONDON_FALLBACK;

  useEffect(() => {
    if (!providerPosition) return;
    mapRef.current?.animateCamera({ center: { latitude: providerPosition.lat, longitude: providerPosition.lng } }, { duration: 500 });
    // Deliberately keyed on the primitive lat/lng, not the object — a new
    // poll response is a new object every 10s even when the position it
    // describes hasn't actually moved, which would otherwise re-animate the
    // camera to the same spot on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerPosition?.lat, providerPosition?.lng]);

  return (
    <Card style={styles.card}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text variant="smallMedium">Your provider is on the way</Text>
        {etaMinutes != null && (
          <Text variant="small" color="muted">
            Arriving in about {etaMinutes} min
          </Text>
        )}
      </View>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {destination && (
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.destinationDot} />
            </Marker>
          )}
          {providerPosition && (
            <Marker
              coordinate={{ latitude: providerPosition.lat, longitude: providerPosition.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.providerDot, { backgroundColor: colors.brand[scheme === 'dark' ? 300 : 500] }]} />
            </Marker>
          )}
        </MapView>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  header: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  mapWrap: { height: 220, width: '100%' },
  destinationDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#20140c', borderWidth: 2, borderColor: '#fff' },
  providerDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
});
