import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, X } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { RadarMap } from '@/components/RadarMap';

interface DailyEarning {
  date: string;
  amountPence: number;
}
interface DashboardData {
  bookingsCount: number;
  avgRating: number;
  reviewCount: number;
  profileViews: number;
  plan: string;
  leadCreditBalance: number;
  analytics: { total: number; conversionRate: number };
  earnings: { weekTotalPence: number; allTimePence: number; dailyBreakdown: DailyEarning[] };
  weekBookingDates: string[];
  center: { lat: number; lng: number };
  baseRadiusMiles: number;
  serviceAreas: { lat: number; lng: number; radiusMiles: number }[];
  recentLeads: { id: string; leadId: string; title: string; city: string; acquisitionType: string; status: string }[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

// A plain `.toISOString().slice(0, 10)` (as apps/provider/app/dashboard's
// own startOfWeek/WeekCalendarStrip use) works fine there because it runs
// server-side, where the process's local time already is UTC — but here on
// a device with a real local timezone, converting a local midnight to UTC
// walks it back a calendar day for any positive offset (e.g. BST, UTC+1),
// which silently highlighted the *next* day as "today" for every UK user.
// This keeps the date key in the device's own local calendar instead.
function localIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);

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

  // Safety net mirroring apps/provider's dashboard redirect: a provider with
  // a business but an unfinished wizard (e.g. app was killed and relaunched
  // mid-onboarding) shouldn't land on the home tab — send them back into it.
  useFocusEffect(
    useCallback(() => {
      if (user?.hasBusiness && !user?.onboardingCompleted) {
        router.replace('/services?onboarding=1');
      }
    }, [user, router])
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
  const todayIso = localIsoDate(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  // Defensive fallback: guards a device that hasn't picked up the backend
  // deploy adding dailyBreakdown yet against a hard crash on this screen.
  const dailyBreakdown = data.earnings.dailyBreakdown ?? [];
  const maxDailyEarning = Math.max(1, ...dailyBreakdown.map((d) => d.amountPence));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.four, paddingBottom: bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Pressable onPress={() => setEarningsModalOpen(true)}>
          <Card style={[styles.earningsCard, { borderRadius: radius.xl }]}>
            <View style={styles.flex1}>
              <Text variant="small" color="muted">
                Earnings this week
              </Text>
              <Text variant="title" style={styles.earningsValue}>
                {formatPence(data.earnings.weekTotalPence)}
              </Text>
              <Text variant="caption" color="muted">
                {formatPence(data.earnings.allTimePence)} all time
              </Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Card>
        </Pressable>

        <Pressable onPress={() => router.navigate('/calendar')}>
          <Card style={[styles.weekCard, { borderRadius: radius.xl }]}>
            <View style={styles.weekStrip}>
              {weekDays.map((d) => {
                const iso = localIsoDate(d);
                const hasBooking = data.weekBookingDates.includes(iso);
                const isToday = iso === todayIso;
                return (
                  <View key={iso} style={styles.weekDay}>
                    <Text variant="caption" color="muted">
                      {DAY_LABELS[(d.getDay() + 6) % 7]}
                    </Text>
                    <View
                      style={[
                        styles.weekNumWrap,
                        { borderRadius: radius.full },
                        isToday && { backgroundColor: colors.brand[500] },
                      ]}
                    >
                      <Text variant="smallMedium" color={isToday ? 'inverse' : 'foreground'}>
                        {d.getDate()}
                      </Text>
                    </View>
                    <View style={[styles.weekDot, hasBooking && { backgroundColor: colors.brand[500] }]} />
                  </View>
                );
              })}
            </View>
          </Card>
        </Pressable>

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

      <Modal visible={earningsModalOpen} transparent animationType="slide" onRequestClose={() => setEarningsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEarningsModalOpen(false)} />
          <Card style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text variant="subtitle">This week's earnings</Text>
              <Pressable onPress={() => setEarningsModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.breakdownList}>
              {dailyBreakdown.map((d, i) => (
                <View key={d.date} style={styles.breakdownRow}>
                  <Text variant="caption" color="muted" style={styles.breakdownLabel}>
                    {DAY_LABELS[i]}
                  </Text>
                  <View style={[styles.breakdownTrack, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${Math.max(4, (d.amountPence / maxDailyEarning) * 100)}%`,
                          backgroundColor: colors.brand[500],
                          borderRadius: radius.full,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="caption" style={styles.breakdownValue}>
                    {formatPence(d.amountPence)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.modalTotalRow, { borderTopColor: colors.border }]}>
              <Text variant="small" color="muted">
                Week total
              </Text>
              <Text variant="smallMedium">{formatPence(data.earnings.weekTotalPence)}</Text>
            </View>
            <View style={styles.modalTotalRow}>
              <Text variant="small" color="muted">
                All time
              </Text>
              <Text variant="smallMedium">{formatPence(data.earnings.allTimePence)}</Text>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function StatCard({ label, value, sub, onPress }: { label: string; value: string; sub?: string; onPress?: () => void }) {
  const { radius } = useAppTheme();
  const content = (
    <Card style={[styles.statCardInner, { borderRadius: radius.lg }]}>
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
  // The Pressable (not just the Card) needs the width: a percentage width on
  // the Card alone resolves against this wrapper, which — left unstyled —
  // has no definite width of its own, so it collapsed to fit-content and
  // wrapped every line one character at a time.
  return onPress ? (
    <Pressable onPress={onPress} style={styles.statCard}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.statCard}>{content}</View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  earningsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  earningsValue: { fontSize: 28, lineHeight: 34, marginTop: 2 },
  weekCard: { marginTop: 12, padding: 12 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  mapSection: { marginTop: 20 },
  weekDay: { alignItems: 'center', gap: 4 },
  weekNumWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  statCard: { width: '48%' },
  statCardInner: { gap: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  leadCard: { gap: 4, marginBottom: 8 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  breakdownList: { gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { width: 32 },
  breakdownTrack: { flex: 1, height: 8, overflow: 'hidden' },
  breakdownFill: { height: '100%' },
  breakdownValue: { width: 64, textAlign: 'right' },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' },
});
