import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Text, Badge, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface JobEarning {
  id: string;
  title: string;
  customerName: string;
  settledAt: string | null;
  grossPence: number;
  commissionPence: number;
  netPence: number;
  paidOut: boolean;
}

interface PayoutRow {
  id: string;
  reference: string | null;
  paidAt: string;
  method: string;
  amountPence: number;
}

interface InvoicesData {
  balance: { settledPence: number; paidOutPence: number; availablePence: number };
  jobs: JobEarning[];
  payouts: PayoutRow[];
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Ports apps/provider/app/earnings/invoices/page.tsx.
export default function InvoicesScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<InvoicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<InvoicesData>('/api/earnings/invoices');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load invoices.');
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
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  const { balance } = data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.four }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.statGrid}>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Earned
            </Text>
            <Text variant="bodyMedium">{formatPence(balance.settledPence)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Paid out
            </Text>
            <Text variant="bodyMedium">{formatPence(balance.paidOutPence)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Available
            </Text>
            <Text variant="bodyMedium">{formatPence(balance.availablePence)}</Text>
          </Card>
        </View>

        <Text variant="subtitle" style={styles.sectionHeading}>
          Job earnings
        </Text>
        {data.jobs.length === 0 ? (
          <Text variant="small" color="muted">
            No settled jobs yet. Earnings appear here once a job is completed and paid in full.
          </Text>
        ) : (
          data.jobs.map((job) => (
            <Card key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.flexShrink}>
                  <Text variant="bodyMedium">{job.title}</Text>
                  <Text variant="caption" color="muted">
                    {job.customerName}
                    {job.settledAt && ` · settled ${formatDate(job.settledAt)}`}
                  </Text>
                </View>
                <Badge variant={job.paidOut ? 'success' : 'warning'}>{job.paidOut ? 'Paid out' : 'Awaiting payout'}</Badge>
              </View>
              <View style={[styles.jobBreakdown, { borderTopColor: colors.border }]}>
                <View style={styles.breakdownCol}>
                  <Text variant="caption" color="muted">
                    Customer paid
                  </Text>
                  <Text variant="small">{formatPence(job.grossPence)}</Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text variant="caption" color="muted">
                    Commission
                  </Text>
                  <Text variant="small" color="muted">
                    −{formatPence(job.commissionPence)}
                  </Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text variant="caption" color="muted">
                    Your earnings
                  </Text>
                  <Text variant="smallMedium">{formatPence(job.netPence)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        <Text variant="subtitle" style={styles.sectionHeading}>
          Payout history
        </Text>
        {data.payouts.length === 0 ? (
          <Text variant="small" color="muted">
            No payouts sent yet.
          </Text>
        ) : (
          data.payouts.map((p) => (
            <Card key={p.id} style={styles.payoutRow}>
              <View style={styles.flexShrink}>
                <Text variant="small">{p.reference ?? 'Payout'}</Text>
                <Text variant="caption" color="muted">
                  {formatDate(p.paidAt)} · {p.method === 'STRIPE_CONNECT' ? 'Bank transfer (automatic)' : 'Bank transfer (manual)'}
                </Text>
              </View>
              <Text variant="smallMedium">{formatPence(p.amountPence)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', marginBottom: 8 },
  statGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, gap: 2, padding: 12 },
  sectionHeading: { marginTop: 20, marginBottom: 8 },
  jobCard: { gap: 8, marginBottom: 8 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  jobBreakdown: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  breakdownCol: { gap: 2 },
  flexShrink: { flexShrink: 1, gap: 2 },
  payoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
});
