import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface ConversationSummary {
  id: string;
  name: string;
  jobTitle: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string;
  unread: boolean;
}

// Moved out of the tab group — matches the web app, where Messages is a
// header icon (see HomeHeader) rather than a bottom-nav tab.
export default function MessagesScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
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
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text variant="title" style={[styles.heading, { paddingHorizontal: spacing.four, fontSize: 28, lineHeight: 34 }]}>
          Messages
        </Text>
        <FlatList
          style={styles.flatList}
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: spacing.four, paddingBottom: spacing.four }]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <Text variant="small" color="muted" style={styles.empty}>
                No conversations yet.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/conversations/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text variant={item.unread ? 'bodyMedium' : 'body'}>{item.name}</Text>
                  {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.brand[600] }]} />}
                </View>
                {item.jobTitle && (
                  <Text variant="small" color="muted">
                    {item.jobTitle}
                  </Text>
                )}
                <Text variant="small" color="muted" numberOfLines={1}>
                  {item.lastMessageBody ?? 'No messages yet'}
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
  heading: { paddingTop: 12, paddingBottom: 8 },
  flatList: { flex: 1 },
  list: { gap: 8 },
  card: { gap: 2, marginBottom: 8 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: { textAlign: 'center', marginTop: 64 },
});
