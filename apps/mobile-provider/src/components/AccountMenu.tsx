import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  User,
  Building2,
  Wrench,
  Package,
  Users,
  ShieldCheck,
  Star,
  Wallet,
  Receipt,
  CreditCard,
  Gift,
  BarChart3,
  Images,
  ClipboardCheck,
  HelpCircle,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';

interface MenuItem {
  icon: typeof User;
  label: string;
  subtitle?: string;
  href: Href;
}
interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Ports apps/provider/components/account-drawer.tsx's ACCOUNT_DRAWER_SECTIONS
// grouping as a modal menu (opened from the hamburger button in
// ProviderTopBar) rather than a true swipe-open drawer navigator — same
// destinations, without pulling in a separate drawer-navigation dependency.
// Web's "help-center"/"preferences" items open in-drawer panels; here they
// push real screens instead, matching how "Account settings" already works.
const SECTIONS: MenuSection[] = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Account settings', href: '/account' },
      { icon: HelpCircle, label: 'Help center', subtitle: 'FAQ', href: '/help' },
      { icon: SlidersHorizontal, label: 'Preferences', subtitle: 'Contents', href: '/preferences' },
    ],
  },
  {
    title: 'Business',
    items: [
      { icon: Building2, label: 'Business profile', href: '/profile' },
      { icon: Wrench, label: 'Services', href: '/services' },
      { icon: Images, label: 'Portfolio', href: '/portfolio' },
      { icon: Package, label: 'Supplies', href: '/supplies' },
      { icon: Users, label: 'Staff', href: '/staff' },
      { icon: ShieldCheck, label: 'Verification centre', href: '/verification' },
      { icon: Star, label: 'Reviews', href: '/reviews' },
      { icon: ClipboardCheck, label: 'References', href: '/references' },
    ],
  },
  {
    title: 'Earnings',
    items: [
      { icon: Wallet, label: 'Overview', href: '/earnings' },
      { icon: Receipt, label: 'Invoices & payouts', href: '/earnings/invoices' },
      { icon: CreditCard, label: 'Subscription', href: '/earnings/subscription' },
      { icon: CreditCard, label: 'Lead credits', href: '/earnings/credits' },
      { icon: Gift, label: 'Referrals', href: '/referrals' },
    ],
  },
  { title: 'Analytics', items: [{ icon: BarChart3, label: 'Lead analytics', href: '/analytics' }] },
];

export function AccountMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors, radius } = useAppTheme();
  const { logout } = useSession();

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text variant="smallMedium" color="muted" style={styles.sectionTitle}>
                  {section.title}
                </Text>
                {section.items.map((item) => (
                  <Pressable key={item.href.toString()} style={[styles.row, { borderColor: colors.border }]} onPress={() => go(item.href)}>
                    <item.icon size={18} color={colors.mutedForeground} />
                    <View style={styles.itemTextWrap}>
                      <Text variant="small">{item.label}</Text>
                      {item.subtitle && (
                        <Text variant="caption" color="muted">
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}

            <Pressable
              style={[styles.row, styles.signOutRow, { borderColor: colors.border }]}
              onPress={() => {
                onClose();
                logout();
              }}
            >
              <LogOut size={18} color="#dc2626" />
              <Text variant="small" style={styles.signOutText}>
                Sign out
              </Text>
            </Pressable>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '80%', padding: 0, gap: 0 },
  section: { paddingTop: 16 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  itemTextWrap: { gap: 1 },
  signOutRow: { marginTop: 8, marginBottom: 8 },
  signOutText: { color: '#dc2626' },
});
