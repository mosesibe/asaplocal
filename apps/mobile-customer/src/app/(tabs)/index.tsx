import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

interface JobSummary {
  id: string;
  title: string;
  categoryName: string;
  city: string;
  status: string;
  quoteCount: number;
  budgetMinPence: number | null;
  budgetMaxPence: number | null;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ jobRequests: JobSummary[] }>('/api/jobs');
      setJobs(res.jobRequests);
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">My jobs</ThemedText>
          <Pressable style={styles.postButton} onPress={() => router.push('/jobs/new')}>
            <ThemedText style={styles.postButtonText}>+ Post a job</ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No jobs yet — post one to get quotes from local pros.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/jobs/${item.id}`)}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.status.replace(/_/g, ' ')}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.categoryName} · {item.city}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.budgetMinPence ? formatPence(item.budgetMinPence) : '?'}–{item.budgetMaxPence ? formatPence(item.budgetMaxPence) : '?'} · {item.quoteCount} quote{item.quoteCount === 1 ? '' : 's'}
                </ThemedText>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  postButton: {
    backgroundColor: '#002059',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  postButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flexShrink: 1 },
  empty: { textAlign: 'center', marginTop: Spacing.six },
});
