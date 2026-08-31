import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { RadarMap } from '@/components/RadarMap';

interface DashboardData {
  bookingsCount: number;
  avgRating: number;
  reviewCount: number;
  profileViews: number;
  plan: string;
  leadCreditBalance: number;
  analytics: { total: number; conversionRate: number };
  earnings: { weekTotalPence: number; allTimePence: number };
  weekBookingDates: string[];
  center: { lat: number; lng: number };
  baseRadiusMiles: number;
  serviceAreas: { lat: number; lng: number; radiusMiles: number }[];
  recentLeads: { id: string; leadId: string; title: string; city: string; acquisitionType: string; status: string }[];
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Ports apps/provider/app/dashboard/page.tsx, including the RadarMap
// (business location, service-area circles, nearby-lead pins) via a native
// react-native-maps port — see src/components/RadarMap.tsx.
export default function DashboardScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<DashboardData>('/api/dashboard');
      setData(res);
    } catch {
      // best-effort
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

  if (loading || !data) {
    return <Screen style={styles.centered} />;
  }

  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.four, paddingBottom: bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Card style={[styles.earningsCard, { borderRadius: radius.xl }]}>
          <Text variant="small" color="muted">
            Earned this week
          </Text>
          <Text variant="title" style={styles.earningsValue}>
            {formatPence(data.earnings.weekTotalPence)}
          </Text>
          <Text variant="caption" color="muted">
            {formatPence(data.earnings.allTimePence)} all-time
          </Text>
        </Card>

        <View style={styles.weekStrip}>
          {weekDays.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            const hasBooking = data.weekBookingDates.includes(iso);
            const isToday = iso === new Date().toISOString().slice(0, 10);
            return (
              <View key={iso} style={styles.weekDay}>
                <Text variant="caption" color="muted">
                  {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                </Text>
                <View
                  style={[
                    styles.weekDot,
                    { borderColor: isToday ? colors.brand[600] : 'transparent' },
                    hasBooking && { backgroundColor: colors.brand[600] },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.mapSection}>
          <RadarMap center={data.center} baseRadiusMiles={data.baseRadiusMiles} serviceAreas={data.serviceAreas} />
        </View>

        <View style={styles.statGrid}>
          <StatCard label="Leads received" value={String(data.analytics.total)} />
          <StatCard label="Bookings" value={String(data.bookingsCount)} />
          <StatCard label="Lead conversion" value={`${Math.round(data.analytics.conversionRate * 100)}%`} />
          <StatCard label="Avg. rating" value={`${data.avgRating.toFixed(1)} ★`} sub={`${data.reviewCount} reviews`} />
          <StatCard label="Profile views" value={String(data.profileViews)} />
          <StatCard label="Plan" value={data.plan} sub="Manage →" onPress={() => router.push('/earnings/subscription')} />
          <StatCard label="Lead credits" value={String(data.leadCreditBalance)} sub="Top up →" onPress={() => router.push('/earnings/credits')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Recent leads</Text>
          <Pressable onPress={() => router.push('/leads')}>
            <Text variant="small" color="brand">
              View marketplace →
            </Text>
          </Pressable>
        </View>
        {data.recentLeads.length === 0 ? (
          <Text variant="small" color="muted">
            No leads yet — check the marketplace for new jobs in your area.
          </Text>
        ) : (
          data.recentLeads.map((l) => (
            <Pressable key={l.id} onPress={() => router.push(`/leads/${l.leadId}`)}>
              <Card style={styles.leadCard}>
                <View style={styles.leadRow}>
                  <View style={styles.flexShrink}>
                    <Text variant="bodyMedium">{l.title}</Text>
                    <Text variant="caption" color="muted">
                      {l.city} · {l.acquisitionType.replace(/_/g, ' ').toLowerCase()}
                    </Text>
                  </View>
                  <Badge variant="outline">{l.status}</Badge>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value, sub, onPress }: { label: string; value: string; sub?: string; onPress?: () => void }) {
  const { radius } = useAppTheme();
  const content = (
    <Card style={[styles.statCard, { borderRadius: radius.lg }]}>
      <Text variant="bodyMedium">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      {sub && (
        <Text variant="caption" color={onPress ? 'brand' : 'muted'}>
          {sub}
        </Text>
      )}
    </Card>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  earningsCard: { gap: 2 },
  earningsValue: { fontSize: 28, lineHeight: 34 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  mapSection: { marginTop: 20 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  statCard: { width: '48%', gap: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  leadCard: { gap: 4, marginBottom: 8 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
});
