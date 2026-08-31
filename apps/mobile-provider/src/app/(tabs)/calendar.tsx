import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset, type BadgeVariant } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface BookingListItem {
  id: string;
  title: string;
  customerName: string;
  scheduledDate: string;
  status: string;
  addressLine: string;
  city: string;
}

interface BookingsResponse {
  bookings: BookingListItem[];
}

interface Section {
  title: string;
  data: BookingListItem[];
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
  PENDING: 'outline',
  CONFIRMED: 'secondary',
  IN_PROGRESS: 'warning',
  AWAITING_APPROVAL: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  DISPUTED: 'destructive',
};

/** Local YYYY-MM-DD — never toISOString(), which would shift evening jobs a day back for users west of UTC. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sectionTitle(key: string, todayKey: string, tomorrowKey: string): string {
  if (key === todayKey) return 'Today';
  if (key === tomorrowKey) return 'Tomorrow';
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Simpler than web's /calendar month grid — a grouped upcoming-jobs list.
// A native month-grid calendar was explicitly out of scope for this port
// (not worth a new native dependency); this list carries the functional
// value of "what's next" without it.
export default function CalendarScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [bookings, setBookings] = useState<BookingListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<BookingsResponse>('/api/bookings');
      setBookings(res.bookings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your calendar.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sections = useMemo<Section[]>(() => {
    if (!bookings) return [];
    const now = new Date();
    const todayKey = dayKey(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dayKey(tomorrow);

    const groups = new Map<string, BookingListItem[]>();
    for (const b of bookings) {
      const key = dayKey(new Date(b.scheduledDate));
      const existing = groups.get(key);
      if (existing) existing.push(b);
      else groups.set(key, [b]);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, data]) => ({ title: sectionTitle(key, todayKey, tomorrowKey), data }));
  }, [bookings]);

  if (loading) {
    return <Screen style={styles.centered} />;
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="subtitle" style={styles.sectionHeading}>
            {section.title}
          </Text>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title" style={styles.title}>
              Calendar
            </Text>
            <Text variant="small" color="muted">
              Every upcoming job you've booked.
            </Text>
            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text variant="small" color="muted" style={styles.empty}>
            Nothing scheduled yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/bookings/${item.id}`)}>
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.flexShrink}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color="muted">
                    {item.customerName} ·{' '}
                    {new Date(item.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {item.addressLine}, {item.city}
                  </Text>
                </View>
                <Badge variant={STATUS_BADGE[item.status] ?? 'outline'}>{item.status.replace(/_/g, ' ')}</Badge>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  list: { gap: 8, paddingTop: 4 },
  header: { gap: 4, paddingBottom: 12 },
  title: { fontSize: 22, lineHeight: 28 },
  sectionHeading: { marginTop: 16, marginBottom: 8 },
  card: { marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flexShrink: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: 64 },
  error: { color: '#dc2626', marginTop: 4 },
});
