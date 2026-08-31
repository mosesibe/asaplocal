import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare, Bell } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { useRequireAuth } from '@/lib/auth-guard';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

// Ports apps/web/components/site-header.tsx as *global* chrome — present on
// every page on web (root layout.tsx), not just Home, which is why the
// notifications dropdown was reachable from the Messages screen too. Search
// is public; Messages and the bell's contents require a session, so both
// gate through useRequireAuth. The bell opens a dropdown in place (matching
// web's NotificationBell) rather than navigating to a page.
export function HomeHeader() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const requireAuth = useRequireAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.logo} onPress={() => router.navigate('/')}>
        <Image source={require('@/assets/images/android-icon-foreground.png')} style={styles.mark} contentFit="contain" />
        <Text variant="title" style={styles.wordmark}>
          Asap<Text variant="title" style={{ color: colors.brand[500] }}>Local</Text>
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/search')}>
          <Search size={20} color={colors.foreground} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => requireAuth('/messages', () => router.push('/messages'))}>
          <MessageSquare size={20} color={colors.foreground} />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => requireAuth('/', () => setNotificationsOpen(true))}
        >
          <Bell size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <NotificationsDropdown visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 28, height: 28 },
  wordmark: { fontSize: 20, lineHeight: 24 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
