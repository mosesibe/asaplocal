import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface NearbyLead {
  id: string;
  title: string;
  description: string;
  city: string;
  categoryName: string;
  distanceMiles: number;
  budgetMinPence: number | null;
  budgetMaxPence: number | null;
  leadPricePence: number;
  salesCount: number;
  maxLeadSales: number;
  alreadyAcquired: boolean;
}

interface LeadsResponse {
  leads: NearbyLead[];
  allowanceRemaining: number;
  creditBalance: number;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export default function LeadsInboxScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acquiringId, setAcquiringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<LeadsResponse>('/api/leads/nearby');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leads.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAcquire = useCallback(
    async (leadId: string) => {
      setAcquiringId(leadId);
      try {
        await api.request(`/api/leads/${leadId}/acquire`, { method: 'POST' });
        await load();
        router.push(`/leads/${leadId}`);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not acquire this lead.');
      } finally {
        setAcquiringId(null);
      }
    },
    [load, router]
  );

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: spacing.four }]}>
          <Text variant="title" style={{ fontSize: 28, lineHeight: 34 }}>
            Lead marketplace
          </Text>
          {data && (
            <Text variant="small" color="muted">
              {data.allowanceRemaining > 0 ? `${data.allowanceRemaining} plan leads left` : 'No plan allowance left'} · {data.creditBalance} credits
            </Text>
          )}
        </View>

        {error && (
          <Text variant="small" style={[styles.error, { paddingHorizontal: spacing.four }]}>
            {error}
          </Text>
        )}

        <FlatList
          data={data?.leads ?? []}
          keyExtractor={(l) => l.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <Text variant="small" color="muted" style={styles.empty}>
                No open leads in your category/area right now — check back soon.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => (item.alreadyAcquired ? router.push(`/leads/${item.id}`) : undefined)} disabled={acquiringId === item.id}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text variant="bodyMedium" style={styles.cardTitle}>
                    {item.title}
                  </Text>
                  <Text variant="small" color="muted">
                    {formatPence(item.leadPricePence)}
                  </Text>
                </View>
                <Text variant="small" color="muted">
                  {item.categoryName} · {item.city} · {item.distanceMiles.toFixed(1)} mi
                </Text>
                <Text variant="small" style={styles.description}>
                  {item.alreadyAcquired ? item.description : `${item.description.slice(0, 90)}… (full details after acquiring)`}
                </Text>
                <Text variant="small" color="muted">
                  Budget: {item.budgetMinPence ? formatPence(item.budgetMinPence) : '?'}–{item.budgetMaxPence ? formatPence(item.budgetMaxPence) : '?'} · {item.salesCount}/{item.maxLeadSales} providers
                </Text>
                {item.alreadyAcquired ? (
                  <Text variant="link" color="brand">
                    View & send quote →
                  </Text>
                ) : (
                  <Button size="sm" onPress={() => handleAcquire(item.id)} loading={acquiringId === item.id} style={styles.acquireButton}>
                    Acquire lead
                  </Button>
                )}
              </Card>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
  },
  list: { gap: 12 },
  card: { gap: 4, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { flexShrink: 1 },
  description: { marginVertical: 4 },
  acquireButton: { marginTop: 8 },
  error: { color: '#dc2626', paddingBottom: 8 },
  empty: {
    textAlign: 'center',
    marginTop: 64,
  },
});
