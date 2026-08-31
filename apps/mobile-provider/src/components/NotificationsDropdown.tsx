import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Ports apps/provider/components/notification-bell.tsx's dropdown — a panel
// anchored under the bell in ProviderTopBar, not a routed page.
export function NotificationsDropdown({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, radius } = useAppTheme();
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
    if (visible) load().finally(() => setLoading(false));
  }, [visible, load]);

  useFocusEffect(
    useCallback(() => {
      if (visible) load();
    }, [visible, load])
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

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Card style={[styles.panel, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.header}>
              <Text variant="bodyMedium">Notifications</Text>
              {hasUnread && (
                <Button variant="ghost" size="sm" onPress={markAllRead}>
                  Mark all read
                </Button>
              )}
            </View>
            <ScrollView style={styles.list}>
              {!loading && items.length === 0 && (
                <Text variant="small" color="muted" style={styles.empty}>
                  No notifications yet.
                </Text>
              )}
              {items.map((item) => (
                <Pressable key={item.id} onPress={() => !item.isRead && markRead(item.id)} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={styles.rowTop}>
                    <Text variant={item.isRead ? 'small' : 'smallMedium'} style={styles.rowTitle}>
                      {item.title}
                    </Text>
                    <Text variant="caption" color="muted">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  {item.body && (
                    <Text variant="small" color="muted" numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                  {!item.isRead && <View style={[styles.dot, { backgroundColor: colors.brand[600] }]} />}
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'flex-end', paddingTop: 64, paddingRight: 12 },
  panel: { width: 300, maxHeight: 420, padding: 0, gap: 0, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 8 },
  list: { maxHeight: 380 },
  empty: { textAlign: 'center', paddingVertical: 32 },
  row: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowTitle: { flexShrink: 1 },
  dot: { position: 'absolute', top: 16, right: 16, width: 6, height: 6, borderRadius: 3 },
});
