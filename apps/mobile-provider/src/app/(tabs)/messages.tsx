import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

interface ConversationSummary {
  id: string;
  customerName: string;
  jobTitle: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string;
  unread: boolean;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ conversations: ConversationSummary[] }>('/api/conversations');
      setConversations(res.conversations);
    } catch {
      // best-effort — leaves the last known list in place
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Re-fetch whenever this tab regains focus (e.g. coming back from a
  // conversation after reading it, or from starting a new one on a lead).
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
        <ThemedText type="subtitle" style={styles.heading}>
          Messages
        </ThemedText>
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + Spacing.four }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No conversations yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/conversations/${item.id}`)}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type={item.unread ? 'smallBold' : 'small'}>{item.customerName}</ThemedText>
                  {item.unread && <View style={styles.unreadDot} />}
                </View>
                {item.jobTitle && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.jobTitle}
                  </ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.lastMessageBody ?? 'No messages yet'}
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
  heading: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#002059',
  },
  empty: { textAlign: 'center', marginTop: Spacing.six },
});
