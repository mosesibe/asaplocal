import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Navigation, MapPin, Search, Trash2 } from 'lucide-react-native';
import { Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

export interface LocationValue {
  addressLine: string;
  city: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  source?: 'current' | 'saved' | 'new';
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

type Mode = 'current' | 'saved' | 'new';

// Ports apps/web/components/location-picker.tsx: three input modes (current
// location / saved address / search-and-autocomplete), all funneling into
// the same LocationValue. The geo/* routes take no auth at all (IP-rate-
// limited only), so this works identically signed in or not.
export function LocationPicker({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const { colors, radius } = useAppTheme();
  const [mode, setMode] = useState<Mode>(value.source ?? 'new');
  const [modeTouched, setModeTouched] = useState(false);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualFields, setManualFields] = useState(!!value.addressLine && value.source === 'new');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSavedLoading(true);
    api
      .request<{ addresses: SavedAddress[] }>('/api/addresses')
      .then((res) => {
        setSavedAddresses(res.addresses);
        if (!modeTouched && !value.addressLine && res.addresses.length > 0) setMode('saved');
      })
      .catch(() => {})
      .finally(() => setSavedLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectMode(next: Mode) {
    setMode(next);
    setModeTouched(true);
    if (value.source !== next) onChange({ addressLine: '', city: '' });
    setPredictions([]);
    setQuery('');
    setManualFields(false);
    setError(null);
  }

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
        setManualFields(true);
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
      onChange({ addressLine: place.addressLine, city: place.city, postcode: place.postcode, lat: place.lat, lng: place.lng, source: 'new' });
      setManualFields(true);
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
      onChange({ addressLine: place.addressLine, city: place.city, postcode: place.postcode, lat: place.lat, lng: place.lng, source: 'current' });
    } catch {
      setError("Couldn't determine your address — please add it manually.");
    } finally {
      setLocating(false);
    }
  }

  function chooseSaved(a: SavedAddress) {
    onChange({ addressLine: a.addressLine, city: a.city, postcode: a.postcode ?? undefined, lat: Number(a.lat), lng: Number(a.lng), source: 'saved' });
  }

  async function removeSaved(a: SavedAddress) {
    setSavedAddresses((prev) => prev.filter((addr) => addr.id !== a.id));
    if (value.addressLine === a.addressLine && value.source === 'saved') onChange({ addressLine: '', city: '' });
    await api.request(`/api/addresses/${a.id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <ModeTab icon={Navigation} label="Current location" active={mode === 'current'} onPress={() => selectMode('current')} />
        <ModeTab icon={MapPin} label="Saved address" active={mode === 'saved'} onPress={() => selectMode('saved')} />
        <ModeTab icon={Search} label="Add new" active={mode === 'new'} onPress={() => selectMode('new')} />
      </View>

      <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        {mode === 'current' &&
          (value.source === 'current' && value.addressLine ? (
            <View style={styles.resolvedRow}>
              <MapPin size={16} color={colors.brand[600]} />
              <Text variant="small" style={styles.flex1}>
                {value.addressLine ? `${value.addressLine}, ` : ''}
                {value.city}
                {value.postcode ? `, ${value.postcode}` : ''}
              </Text>
            </View>
          ) : (
            <Pressable onPress={useCurrentLocation} disabled={locating} style={styles.currentRow}>
              {locating ? <ActivityIndicator color={colors.brand[600]} /> : <Navigation size={16} color={colors.brand[600]} />}
              <Text variant="smallMedium" color="brand">
                {locating ? 'Getting location…' : 'Use my current location'}
              </Text>
            </Pressable>
          ))}

        {mode === 'saved' &&
          (savedLoading ? (
            <Text variant="small" color="muted">
              Loading your addresses…
            </Text>
          ) : savedAddresses.length === 0 ? (
            <Text variant="small" color="muted">
              No saved addresses yet — add one below.
            </Text>
          ) : (
            <View style={styles.savedList}>
              {savedAddresses.map((a) => {
                const selected = value.source === 'saved' && value.addressLine === a.addressLine;
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.savedRow,
                      { borderColor: selected ? colors.brand[600] : colors.border, borderRadius: radius.md },
                    ]}
                  >
                    <Pressable onPress={() => chooseSaved(a)} style={styles.savedInfo}>
                      <Text variant="small">
                        {a.addressLine}
                        <Text variant="small" color="muted">
                          , {a.city}
                          {a.postcode ? `, ${a.postcode}` : ''}
                        </Text>
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removeSaved(a)} hitSlop={8}>
                      <Trash2 size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

        {mode === 'new' &&
          (!manualFields ? (
            <View style={styles.searchBlock}>
              <TextField placeholder="Start typing your postcode or address…" value={query} onChangeText={runAutocomplete} />
              {searching && <ActivityIndicator style={styles.spinner} color={colors.brand[600]} />}
              {predictions.map((p) => (
                <Pressable key={p.placeId} onPress={() => choosePrediction(p)} style={[styles.predictionRow, { borderColor: colors.border }]}>
                  <Text variant="small">{p.description}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setManualFields(true)}>
                <Text variant="caption" color="muted" style={styles.manualLink}>
                  Enter address manually instead
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fields}>
              <TextField
                placeholder="Address line"
                value={value.addressLine}
                onChangeText={(addressLine) => onChange({ ...value, addressLine, source: 'new' })}
              />
              <View style={styles.row}>
                <TextField
                  style={styles.flex1}
                  placeholder="City"
                  value={value.city}
                  onChangeText={(city) => onChange({ ...value, city, source: 'new' })}
                />
                <TextField
                  style={styles.flex1}
                  placeholder="Postcode"
                  value={value.postcode ?? ''}
                  onChangeText={(postcode) => onChange({ ...value, postcode, source: 'new' })}
                />
              </View>
              <Pressable
                onPress={() => {
                  setManualFields(false);
                  setQuery('');
                  onChange({ addressLine: '', city: '' });
                }}
              >
                <Text variant="caption" color="muted" style={styles.manualLink}>
                  Search for an address instead
                </Text>
              </Pressable>
            </View>
          ))}

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}

function ModeTab({ icon: Icon, label, active, onPress }: { icon: typeof Search; label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        {
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: active ? colors.brand[600] : colors.border,
          backgroundColor: active ? colors.brand[600] : 'transparent',
        },
      ]}
    >
      <Icon size={14} color={active ? '#fff' : colors.mutedForeground} />
      <Text variant="caption" style={{ color: active ? '#fff' : colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  panel: { borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  resolvedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 4 },
  savedList: { gap: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  savedInfo: { flex: 1 },
  searchBlock: { gap: 6 },
  spinner: { marginTop: 4 },
  predictionRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  manualLink: { marginTop: 2 },
  fields: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  error: { color: '#dc2626' },
});
