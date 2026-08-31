import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Badge, Button, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface BankingStatus {
  payoutsEnabled: boolean;
  stripeAccountId: boolean;
  balance: { settledPence: number; paidOutPence: number; availablePence: number };
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

// Ports apps/provider/app/verification/banking/page.tsx.
export default function BankingScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<BankingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<BankingStatus>('/api/verification/banking');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load banking status.');
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

  const handleStart = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const { url } = await api.request<{ url: string }>('/api/verification/banking/start', { method: 'POST' });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start bank setup.');
    } finally {
      setStarting(false);
    }
  }, []);

  const handleWithdraw = useCallback(async () => {
    setWithdrawing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.request<{ transferredPence: number }>('/api/payouts/withdraw', { method: 'POST' });
      setNotice(`${formatPence(res.transferredPence)} sent to your bank.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send your payout.");
    } finally {
      setWithdrawing(false);
    }
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
      <ScrollView contentContainerStyle={{ padding: spacing.four, gap: 12 }}>
        <Card style={styles.card}>
          <Text variant="small" color="muted">
            Connect your business bank account via Stripe to receive payouts. Your account and sort code are entered directly on
            Stripe's secure page — we never see or store them.
          </Text>
          <View style={styles.statusRow}>
            <Text variant="small">Status:</Text>
            <Badge variant={data.payoutsEnabled ? 'success' : 'outline'}>{data.payoutsEnabled ? 'Connected' : 'Not connected'}</Badge>
          </View>
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          {!data.payoutsEnabled && (
            <Button onPress={handleStart} loading={starting} style={styles.button}>
              {data.stripeAccountId ? 'Continue setup' : 'Connect bank account'}
            </Button>
          )}
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Earnings</Text>
          <View style={styles.row}>
            <Text variant="small" color="muted">
              Earned (after commission)
            </Text>
            <Text variant="small">{formatPence(balance.settledPence)}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="small" color="muted">
              Paid out
            </Text>
            <Text variant="small">−{formatPence(balance.paidOutPence)}</Text>
          </View>
          <View style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text variant="bodyMedium">Available</Text>
            <Text variant="bodyMedium">{formatPence(balance.availablePence)}</Text>
          </View>

          {notice && (
            <Text variant="small" style={styles.success}>
              {notice}
            </Text>
          )}

          {balance.availablePence > 0 ? (
            data.payoutsEnabled ? (
              <>
                <Text variant="small" color="muted">
                  Completed jobs are normally paid out automatically. Anything still sitting here can be sent now.
                </Text>
                <Button onPress={handleWithdraw} loading={withdrawing} disabled={balance.availablePence === 0} style={styles.button}>
                  {`Withdraw ${formatPence(balance.availablePence)}`}
                </Button>
              </>
            ) : (
              <Text variant="small" color="muted">
                Connect your bank above and this balance will be sent automatically — nothing is lost while you're not set up.
              </Text>
            )
          ) : (
            <Text variant="small" color="muted">
              Nothing waiting. Earnings appear here once a job is completed and paid in full.
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  card: { gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 2 },
  button: { marginTop: 4 },
  error: { color: '#dc2626' },
  success: { color: '#16a34a' },
});
