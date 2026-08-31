import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
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
      <View style={styles.safeArea}>
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}
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
                  <Text variant={item.unread ? 'bodyMedium' : 'body'}>{item.customerName}</Text>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { gap: 8, paddingTop: 12 },
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
