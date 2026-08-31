import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Menu, Bell } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { AccountMenu } from '@/components/AccountMenu';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

// Ports apps/provider/components/provider-top-bar.tsx: a hamburger button
// (opens AccountMenu, standing in for the desktop sidebar's nav tree),
// a dynamic page title, and a notification bell — global chrome rendered
// once in the root layout on every authenticated screen (mirrors web's
// ProviderShell wrapping every route the same way).
const TITLES: { prefix: string; title: string }[] = [
  { prefix: '/leads', title: 'Lead marketplace' },
  { prefix: '/calendar', title: 'Calendar' },
  { prefix: '/messages', title: 'Messages' },
  { prefix: '/account', title: 'Account' },
  { prefix: '/profile', title: 'Business profile' },
  { prefix: '/services', title: 'Services' },
  { prefix: '/portfolio', title: 'Portfolio' },
  { prefix: '/supplies', title: 'Supplies' },
  { prefix: '/staff', title: 'Staff' },
  { prefix: '/verification', title: 'Verification centre' },
  { prefix: '/reviews', title: 'Reviews' },
  { prefix: '/references', title: 'References' },
  { prefix: '/help', title: 'Help center' },
  { prefix: '/preferences', title: 'Preferences' },
  { prefix: '/earnings', title: 'Earnings' },
  { prefix: '/referrals', title: 'Referrals' },
  { prefix: '/analytics', title: 'Analytics' },
];

function titleFor(pathname: string): string {
  const match = TITLES.filter((t) => pathname.startsWith(t.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.title ?? 'AsapLocal Business';
}

export function ProviderTopBar() {
  const pathname = usePathname();
  const { colors } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.iconButton} onPress={() => setMenuOpen(true)}>
        <Menu size={22} color={colors.foreground} />
      </Pressable>
      <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
        {titleFor(pathname)}
      </Text>
      <Pressable style={styles.iconButton} onPress={() => setNotificationsOpen(true)}>
        <Bell size={20} color={colors.foreground} />
      </Pressable>

      <AccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationsDropdown visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 8 },
  title: { flex: 1, textAlign: 'center' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
