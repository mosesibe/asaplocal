import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const { colors, spacing } = useAppTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ notifications: NotificationItem[] }>('/api/notifications');
      setItems(res.notifications);
    } catch {
      // best-effort
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

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.request(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      // best-effort
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.request('/api/notifications/read-all', { method: 'POST' });
    } catch {
      // best-effort
    }
  }

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <Screen>
      <FlatList
        style={styles.flatList}
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.four, gap: 8 }}
        ListHeaderComponent={
          hasUnread ? (
            <Button variant="ghost" size="sm" onPress={markAllRead} style={styles.markAll}>
              Mark all as read
            </Button>
          ) : null
        }
        ListEmptyComponent={!loading ? <Text variant="small" color="muted" style={styles.empty}>No notifications yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => !item.isRead && markRead(item.id)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text variant={item.isRead ? 'body' : 'bodyMedium'} style={styles.title}>
                  {item.title}
                </Text>
                {!item.isRead && <View style={[styles.dot, { backgroundColor: colors.brand[600] }]} />}
              </View>
              {item.body && (
                <Text variant="small" color="muted">
                  {item.body}
                </Text>
              )}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  markAll: { alignSelf: 'flex-end', marginBottom: 4 },
  card: { gap: 4, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 64 },
});
