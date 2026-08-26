import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Lead marketplace</ThemedText>
          {data && (
            <ThemedText type="small" themeColor="textSecondary">
              {data.allowanceRemaining > 0 ? `${data.allowanceRemaining} plan leads left` : 'No plan allowance left'} · {data.creditBalance} credits
            </ThemedText>
          )}
        </View>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <FlatList
          data={data?.leads ?? []}
          keyExtractor={(l) => l.id}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No open leads in your category/area right now — check back soon.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => (item.alreadyAcquired ? router.push(`/leads/${item.id}`) : undefined)}
              disabled={acquiringId === item.id}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatPence(item.leadPricePence)}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.categoryName} · {item.city} · {item.distanceMiles.toFixed(1)} mi
                </ThemedText>
                <ThemedText type="small" style={styles.description}>
                  {item.alreadyAcquired ? item.description : `${item.description.slice(0, 90)}… (full details after acquiring)`}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Budget: {item.budgetMinPence ? formatPence(item.budgetMinPence) : '?'}–{item.budgetMaxPence ? formatPence(item.budgetMaxPence) : '?'} · {item.salesCount}/{item.maxLeadSales} providers
                </ThemedText>
                {item.alreadyAcquired ? (
                  <ThemedText type="linkPrimary">View & send quote →</ThemedText>
                ) : (
                  <Pressable
                    style={styles.acquireButton}
                    onPress={() => handleAcquire(item.id)}
                    disabled={acquiringId === item.id}>
                    <ThemedText style={styles.acquireButtonText}>
                      {acquiringId === item.id ? 'Acquiring…' : 'Acquire lead'}
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  list: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { flexShrink: 1 },
  description: { marginVertical: Spacing.one },
  acquireButton: {
    marginTop: Spacing.two,
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  acquireButtonText: { color: '#ffffff', fontWeight: '600' },
  error: {
    color: '#dc2626',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
