import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Navigation, MapPin, Search } from 'lucide-react-native';
import { Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

export interface LocationValue {
  addressLine: string;
  city: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

interface Prediction {
  placeId: string;
  description: string;
}
interface SavedAddress {
  id: string;
  addressLine: string;
  city: string;
  postcode: string | null;
  lat: string;
  lng: string;
}

type Mode = 'search' | 'current' | 'saved';

// Ports apps/web/components/location-picker.tsx: three input modes (current
// location / saved address / search-and-autocomplete), all funneling into
// the same LocationValue. The geo/* routes take no auth at all (IP-rate-
// limited only), so this works identically signed in or not.
export function LocationPicker({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const { colors, radius, spacing } = useAppTheme();
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(!!value.addressLine);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'saved') return;
    setSavedLoading(true);
    api
      .request<{ addresses: SavedAddress[] }>('/api/addresses')
      .then((res) => setSavedAddresses(res.addresses))
      .catch(() => {})
      .finally(() => setSavedLoading(false));
  }, [mode]);

  const runAutocomplete = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.request<{ predictions: Prediction[] }>(`/api/geo/autocomplete?input=${encodeURIComponent(text)}`);
        setPredictions(res.predictions);
      } catch {
        setError('Address lookup is unavailable right now — enter your address below.');
        setResolved(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  async function choosePrediction(p: Prediction) {
    setSearching(true);
    setError(null);
    try {
      const place = await api.request<{ addressLine: string; city: string; postcode?: string; lat: number; lng: number }>(
        `/api/geo/place/${p.placeId}`
      );
      onChange({ addressLine: place.addressLine, city: place.city, postcode: place.postcode, lat: place.lat, lng: place.lng });
      setResolved(true);
      setPredictions([]);
      setQuery(place.addressLine);
    } catch {
      setError("Couldn't resolve that address.");
    } finally {
      setSearching(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location access was denied — please add your address instead.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const place = await api.request<{ addressLine: string; city: string; postcode?: string; lat: number; lng: number }>('/api/geo/reverse', {
        method: 'POST',
        body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
      });
      onChange({ addressLine: place.addressLine, city: place.city, postcode: place.postcode, lat: place.lat, lng: place.lng });
      setResolved(true);
    } catch {
      setError("Couldn't determine your address — please add it manually.");
    } finally {
      setLocating(false);
    }
  }

  function chooseSaved(a: SavedAddress) {
    onChange({ addressLine: a.addressLine, city: a.city, postcode: a.postcode ?? undefined, lat: Number(a.lat), lng: Number(a.lng) });
    setResolved(true);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.tabRow, { borderColor: colors.border, borderRadius: radius.full }]}>
        <ModeTab icon={Search} label="Add new" active={mode === 'search'} onPress={() => setMode('search')} />
        <ModeTab icon={Navigation} label="Current location" active={mode === 'current'} onPress={() => setMode('current')} />
        <ModeTab icon={MapPin} label="Saved" active={mode === 'saved'} onPress={() => setMode('saved')} />
      </View>

      {mode === 'search' && !resolved && (
        <View style={styles.searchBlock}>
          <TextField placeholder="Start typing your postcode or address…" value={query} onChangeText={runAutocomplete} />
          {searching && <ActivityIndicator style={styles.spinner} color={colors.brand[600]} />}
          {predictions.map((p) => (
            <Pressable key={p.placeId} onPress={() => choosePrediction(p)} style={[styles.predictionRow, { borderColor: colors.border }]}>
              <Text variant="small">{p.description}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setResolved(true)}>
            <Text variant="smallMedium" color="brand" style={styles.manualLink}>
              Can't find it? Enter manually
            </Text>
          </Pressable>
        </View>
      )}

      {mode === 'current' && (
        <Pressable onPress={useCurrentLocation} disabled={locating} style={{ marginTop: spacing.two }}>
          <Card style={styles.currentCard}>
            {locating ? <ActivityIndicator color={colors.brand[600]} /> : <Navigation size={18} color={colors.brand[600]} />}
            <Text variant="smallMedium" color="brand">
              {locating ? 'Getting location…' : 'Use my current location'}
            </Text>
          </Card>
        </Pressable>
      )}

      {mode === 'saved' &&
        (savedLoading ? (
          <Text variant="small" color="muted" style={styles.helper}>
            Loading your addresses…
          </Text>
        ) : savedAddresses.length === 0 ? (
          <Text variant="small" color="muted" style={styles.helper}>
            No saved addresses yet — add one below.
          </Text>
        ) : (
          savedAddresses.map((a) => (
            <Pressable key={a.id} onPress={() => chooseSaved(a)} style={[styles.savedRow, { borderColor: colors.border }]}>
              <MapPin size={16} color={colors.mutedForeground} />
              <View style={styles.savedInfo}>
                <Text variant="small">{a.addressLine}</Text>
                <Text variant="caption" color="muted">
                  {a.city}
                  {a.postcode ? `, ${a.postcode}` : ''}
                </Text>
              </View>
            </Pressable>
          ))
        ))}

      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}

      {(resolved || mode !== 'search') && (
        <View style={styles.fields}>
          <TextField
            placeholder="Address line"
            value={value.addressLine}
            onChangeText={(addressLine) => onChange({ ...value, addressLine })}
          />
          <TextField style={styles.spacedInput} placeholder="City" value={value.city} onChangeText={(city) => onChange({ ...value, city })} />
          <TextField
            style={styles.spacedInput}
            placeholder="Postcode (optional)"
            value={value.postcode ?? ''}
            onChangeText={(postcode) => onChange({ ...value, postcode })}
          />
        </View>
      )}
    </View>
  );
}

function ModeTab({ icon: Icon, label, active, onPress }: { icon: typeof Search; label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.tab, { borderRadius: radius.full, backgroundColor: active ? colors.brand[600] : 'transparent' }]}>
      <Icon size={14} color={active ? '#fff' : colors.mutedForeground} />
      <Text variant="caption" style={{ color: active ? '#fff' : colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  tabRow: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, padding: 3, gap: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  searchBlock: { gap: 6 },
  spinner: { marginTop: 4 },
  predictionRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  manualLink: { marginTop: 4 },
  currentCard: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  helper: { paddingVertical: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  savedInfo: { flex: 1 },
  fields: { gap: 8, marginTop: 4 },
  spacedInput: {},
  error: { color: '#dc2626' },
});
