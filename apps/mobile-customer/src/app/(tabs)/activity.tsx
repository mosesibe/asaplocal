import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { formatBudget, formatJobLocation, formatNeededBy, formatPence } from '@/lib/job-format';

interface JobRequest {
  id: string;
  title: string;
  categoryName: string;
  addressLine: string | null;
  city: string;
  postcode: string | null;
  status: string;
  quoteCount: number;
  budgetMinPence: number | null;
  budgetMaxPence: number | null;
  preferredDate: string | null;
  flexibleDate: boolean;
  createdAt: string;
}
interface BookingSummary {
  id: string;
  businessName: string;
  totalAmountPence: number;
  scheduledDate: string;
  status: string;
  depositDuePence: number;
}
interface PaymentSummary {
  id: string;
  bookingId: string | null;
  businessName: string | null;
  type: string;
  amountPence: number;
  createdAt: string;
}
interface ActivityData {
  jobRequests: JobRequest[];
  bookings: BookingSummary[];
  payments: PaymentSummary[];
}

// Ports apps/web/app/activity/page.tsx in full — job requests, bookings,
// AND payments (the original mobile "My jobs" list only ever covered the
// first of these three, via /api/jobs; this now uses the new /api/activity
// route that mirrors the web page's three Prisma queries).
export default function ActivityScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<ActivityData>('/api/activity');
      setData(res);
    } catch {
      // best-effort — leaves the last known list in place
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

  const hasActivity = !!data && (data.jobRequests.length > 0 || data.bookings.length > 0 || data.payments.length > 0);

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <Text variant="title" style={[styles.heading, { paddingHorizontal: spacing.four, fontSize: 28, lineHeight: 34 }]}>
          Activity
        </Text>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.four, paddingBottom: bottomInset }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {!loading && !hasActivity && (
            <Pressable onPress={() => router.push('/jobs/new')}>
              <Text variant="small" color="muted" style={styles.empty}>
                No activity yet — <Text variant="smallMedium" color="brand">post a job</Text> to get started.
              </Text>
            </Pressable>
          )}

          {!!data?.jobRequests.length && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="subtitle">Job requests</Text>
                <Pressable onPress={() => router.push('/jobs/new')}>
                  <Text variant="small" color="brand">
                    Post another →
                  </Text>
                </Pressable>
              </View>
              {data.jobRequests.map((j) => {
                const budget = formatBudget(j.budgetMinPence, j.budgetMaxPence);
                return (
                  <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)}>
                    <Card style={styles.jobCard}>
                      <View style={styles.jobCardTop}>
                        <Text variant="bodyMedium" style={styles.flexShrink}>
                          {j.title}
                        </Text>
                        <Badge variant="outline">{j.status.replace(/_/g, ' ')}</Badge>
                      </View>
                      <Text variant="caption" color="muted">
                        Posted {new Date(j.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatJobLocation(j)}
                      </Text>
                      <Text variant="caption" color="muted">
                        Needed by: {formatNeededBy(j.preferredDate, j.flexibleDate)}
                      </Text>
                      <Text variant="caption" color="muted">
                        {budget ? `Expected cost: ${budget}` : 'No budget set'}
                      </Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!!data?.bookings.length && (
            <View style={styles.section}>
              <Text variant="subtitle" style={styles.sectionTitle}>
                Bookings
              </Text>
              {data.bookings.map((b) => (
                <Pressable key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
                  <Card style={styles.bookingCard}>
                    <View style={styles.bookingInfo}>
                      <Text variant="bodyMedium">{b.businessName}</Text>
                      <Text variant="caption" color="muted">
                        {formatPence(b.totalAmountPence)} ·{' '}
                        {new Date(b.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    {b.depositDuePence > 0 ? (
                      <Badge variant="warning">{`Deposit due · ${formatPence(b.depositDuePence)}`}</Badge>
                    ) : (
                      <Badge variant="outline">{b.status.replace(/_/g, ' ')}</Badge>
                    )}
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

          {!!data?.payments.length && (
            <View style={styles.section}>
              <Text variant="subtitle" style={styles.sectionTitle}>
                Payments
              </Text>
              <Card style={styles.paymentsCard}>
                {data.payments.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => p.bookingId && router.push(`/bookings/${p.bookingId}`)}
                    style={[styles.paymentRow, { borderColor: colors.border }]}
                  >
                    <View style={styles.flexShrink}>
                      <Text variant="small">{p.businessName ?? p.type.replace(/_/g, ' ')}</Text>
                      <Text variant="caption" color="muted">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <Text variant="smallMedium">{formatPence(p.amountPence)}</Text>
                  </Pressable>
                ))}
              </Card>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  heading: { paddingTop: 12, paddingBottom: 8 },
  empty: { textAlign: 'center', marginTop: 64 },
  section: { marginTop: 8, marginBottom: 16, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {},
  jobCard: { gap: 2 },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
  bookingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bookingInfo: { flex: 1, minWidth: 0, gap: 2 },
  paymentsCard: { padding: 0, gap: 0 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
