import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
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
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: spacing.four }]}>
          <Text variant="title" style={{ fontSize: 28, lineHeight: 34 }}>
            My jobs
          </Text>
          <Button size="sm" onPress={() => router.push('/jobs/new')}>
            + Post a job
          </Button>
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <Text variant="small" color="muted" style={styles.empty}>
                No jobs yet — post one to get quotes from local pros.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/jobs/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text variant="bodyMedium" style={styles.cardTitle}>
                    {item.title}
                  </Text>
                  <Badge variant="outline">{item.status.replace(/_/g, ' ')}</Badge>
                </View>
                <Text variant="small" color="muted">
                  {item.categoryName} · {item.city}
                </Text>
                <Text variant="small" color="muted">
                  {item.budgetMinPence ? formatPence(item.budgetMinPence) : '?'}–{item.budgetMaxPence ? formatPence(item.budgetMaxPence) : '?'} · {item.quoteCount} quote{item.quoteCount === 1 ? '' : 's'}
                </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: { gap: 12 },
  card: { gap: 4, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flexShrink: 1 },
  empty: { textAlign: 'center', marginTop: 64 },
});
