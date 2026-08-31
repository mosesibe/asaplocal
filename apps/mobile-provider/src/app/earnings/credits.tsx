import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  transactions: CreditTransaction[];
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Ports apps/provider/app/earnings/credits/page.tsx.
export default function CreditsScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKind, setBusyKind] = useState<'CREDITS_SMALL' | 'CREDITS_LARGE' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<CreditsData>('/api/earnings/credits');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load lead credits.');
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

  const handleTopUp = useCallback(async (kind: 'CREDITS_SMALL' | 'CREDITS_LARGE') => {
    setBusyKind(kind);
    setError(null);
    try {
      const { url } = await api.request<{ url: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ kind }) });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
    } finally {
      setBusyKind(null);
    }
  }, []);

  if (loading || !data) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

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

        <Card style={styles.balanceCard}>
          <Text variant="caption" color="muted">
            Current balance
          </Text>
          <Text variant="title" style={styles.balanceValue}>
            {data.balance}
          </Text>
          <Text variant="caption" color="muted">
            credit{data.balance === 1 ? '' : 's'}
          </Text>
        </Card>

        <Text variant="subtitle" style={styles.sectionHeading}>
          Top up
        </Text>
        <Card style={styles.packCard}>
          <Text variant="bodyMedium">5 credits</Text>
          <Text variant="small" color="muted">
            {formatPence(400)}/credit — for occasional purchases
          </Text>
          <Button onPress={() => handleTopUp('CREDITS_SMALL')} loading={busyKind === 'CREDITS_SMALL'} style={styles.buyButton}>
            Buy credits
          </Button>
        </Card>
        <Card style={styles.packCard}>
          <Text variant="bodyMedium">20 credits</Text>
          <Text variant="small" color="muted">
            {formatPence(325)}/credit — best value
          </Text>
          <Button onPress={() => handleTopUp('CREDITS_LARGE')} loading={busyKind === 'CREDITS_LARGE'} style={styles.buyButton}>
            Buy credits
          </Button>
        </Card>

        <Text variant="subtitle" style={styles.sectionHeading}>
          History
        </Text>
        {data.transactions.length === 0 ? (
          <Text variant="small" color="muted">
            No credit activity yet.
          </Text>
        ) : (
          data.transactions.map((t) => (
            <Card key={t.id} style={styles.txRow}>
              <View style={styles.flexShrink}>
                <Text variant="small">{t.description ?? t.type.replace(/_/g, ' ')}</Text>
                <Text variant="caption" color="muted">
                  {formatDate(t.createdAt)}
                </Text>
              </View>
              <Text variant="smallMedium" style={{ color: t.amount >= 0 ? '#16a34a' : colors.mutedForeground }}>
                {t.amount >= 0 ? '+' : ''}
                {t.amount}
              </Text>
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
  balanceCard: { gap: 2 },
  balanceValue: { fontSize: 32, lineHeight: 38 },
  sectionHeading: { marginTop: 24, marginBottom: 8 },
  packCard: { gap: 4, marginBottom: 12 },
  buyButton: { marginTop: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  flexShrink: { flexShrink: 1, gap: 2 },
});
