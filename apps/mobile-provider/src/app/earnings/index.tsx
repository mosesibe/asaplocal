import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface EarningsOverview {
  balance: { settledPence: number; paidOutPence: number; availablePence: number };
  settledCount: number;
  lastPayoutAt: string | null;
  payoutCount: number;
  payoutsEnabled: boolean;
  plan: string;
  leadAllowanceRemaining: number;
  leadCreditBalance: number;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

// Ports apps/provider/app/earnings/page.tsx.
export default function EarningsOverviewScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<EarningsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<EarningsOverview>('/api/earnings');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load earnings.');
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
            <Text variant="caption" color="muted">
              {data.settledCount} settled job{data.settledCount === 1 ? '' : 's'}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Paid out
            </Text>
            <Text variant="bodyMedium">{formatPence(balance.paidOutPence)}</Text>
            <Text variant="caption" color="muted">
              {data.lastPayoutAt
                ? `Last ${new Date(data.lastPayoutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : 'No payouts yet'}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Available
            </Text>
            <Text variant="bodyMedium">{formatPence(balance.availablePence)}</Text>
            <Text variant="caption" color="muted">
              {data.payoutsEnabled ? 'Paid out automatically' : 'Connect a bank to release'}
            </Text>
          </Card>
        </View>

        {balance.availablePence > 0 && !data.payoutsEnabled && (
          <Pressable onPress={() => router.push('/verification/banking')}>
            <Card style={[styles.nudgeCard, { borderColor: colors.brand[600] }]}>
              <Text variant="bodyMedium">You have {formatPence(balance.availablePence)} waiting</Text>
              <Text variant="small" color="muted">
                Connect your bank account and we'll send it straight away — nothing is lost while you're not set up.
              </Text>
              <Text variant="link" color="brand">
                Connect bank account →
              </Text>
            </Card>
          </Pressable>
        )}

        <View style={styles.navList}>
          <Pressable onPress={() => router.push('/earnings/invoices')}>
            <Card style={styles.navRow}>
              <View style={styles.flexShrink}>
                <Text variant="bodyMedium">Invoices & payouts</Text>
                <Text variant="caption" color="muted">
                  Per-job breakdown of what you earned and were paid
                </Text>
              </View>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push('/earnings/subscription')}>
            <Card style={styles.navRow}>
              <View style={styles.flexShrink}>
                <Text variant="bodyMedium">Subscription</Text>
                <Text variant="caption" color="muted">
                  {data.leadAllowanceRemaining} plan lead{data.leadAllowanceRemaining === 1 ? '' : 's'} left this month
                </Text>
              </View>
              <Badge variant={data.plan === 'FREE' ? 'outline' : 'secondary'}>{data.plan}</Badge>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push('/earnings/credits')}>
            <Card style={styles.navRow}>
              <View style={styles.flexShrink}>
                <Text variant="bodyMedium">Lead credits</Text>
                <Text variant="caption" color="muted">
                  Top up to buy leads outside your plan allowance
                </Text>
              </View>
              <Badge variant="outline">{String(data.leadCreditBalance)}</Badge>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push('/verification/banking')}>
            <Card style={styles.navRow}>
              <View style={styles.flexShrink}>
                <Text variant="bodyMedium">Bank account</Text>
                <Text variant="caption" color="muted">
                  Where your payouts are sent
                </Text>
              </View>
              <Badge variant={data.payoutsEnabled ? 'success' : 'outline'}>{data.payoutsEnabled ? 'Connected' : 'Not connected'}</Badge>
            </Card>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', marginBottom: 8 },
  statGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, gap: 2, padding: 12 },
  nudgeCard: { marginTop: 12, gap: 4, borderWidth: 1 },
  navList: { marginTop: 16, gap: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flexShrink: 1, gap: 2 },
});
