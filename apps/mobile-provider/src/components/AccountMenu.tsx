import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  User,
  Store,
  Wrench,
  Package,
  Users,
  ShieldCheck,
  Star,
  Wallet,
  Receipt,
  CreditCard,
  Coins,
  Gift,
  BarChart3,
  HelpCircle,
  SlidersHorizontal,
  LogOut,
  X,
} from 'lucide-react-native';
import { Badge, Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

interface MenuItem {
  icon: typeof User;
  label: string;
  subtitle?: string;
  href: Href;
  staffOnly?: boolean;
}
interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface Account {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  city: string;
  verificationStatus: string;
  trustTier: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  canHaveStaff: boolean;
}

// Ports apps/provider/components/account-drawer.tsx's ACCOUNT_DRAWER_SECTIONS
// (from apps/provider/lib/nav.ts) as a modal menu (opened from the hamburger
// button in ProviderTopBar) rather than a true swipe-open drawer navigator —
// same destinations/order/labels, without pulling in a separate drawer-
// navigation dependency. Web's "help-center"/"preferences" items open
// in-drawer panels; here they push real screens instead, matching how
// "Account settings" already works.
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
      { icon: Store, label: 'Profile', href: '/profile' },
      { icon: Wrench, label: 'Services', href: '/services' },
      { icon: Package, label: 'Supplies', href: '/supplies' },
      { icon: Users, label: 'Staff', href: '/staff', staffOnly: true },
      { icon: ShieldCheck, label: 'Verification Center', href: '/verification' },
      { icon: Star, label: 'Reviews', href: '/reviews' },
    ],
  },
  {
    title: 'Earnings',
    items: [
      { icon: Wallet, label: 'Earnings overview', href: '/earnings' },
      { icon: Receipt, label: 'Invoices & payouts', href: '/earnings/invoices' },
      { icon: CreditCard, label: 'Subscription', href: '/earnings/subscription' },
      { icon: Coins, label: 'Lead credits', href: '/earnings/credits' },
      { icon: Gift, label: 'Referrals', href: '/referrals' },
    ],
  },
  { title: 'Analytics', items: [{ icon: BarChart3, label: 'Analytics', href: '/analytics' }] },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

function verificationBadgeVariant(status: string): 'outline' | 'success' | 'destructive' | 'warning' {
  if (status === 'VERIFIED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'PENDING' || status === 'MORE_INFO_REQUESTED') return 'warning';
  return 'outline';
}
function verificationBadgeLabel(status: string): string {
  if (status === 'VERIFIED') return 'Verified';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'PENDING') return 'Pending review';
  if (status === 'MORE_INFO_REQUESTED') return 'More info needed';
  return 'Not verified';
}

export function AccountMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors, radius } = useAppTheme();
  const { logout } = useSession();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (!visible) return;
    api
      .request<Account>('/api/mobile/account')
      .then(setAccount)
      .catch(() => {});
  }, [visible]);

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.staffOnly || account?.canHaveStaff),
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.closeRow}>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.closeButton, { borderRadius: radius.full }]}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {account && (
            <>
              <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.brand[100] }]}>
                  {account.avatarUrl ? (
                    <Image source={{ uri: account.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text variant="bodyMedium" style={{ color: colors.brand[800] }}>
                      {initials(account.name) || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.profileText}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text variant="small" color="muted" numberOfLines={1}>
                    {account.email}
                  </Text>
                  {account.phone && (
                    <Text variant="small" color="muted" numberOfLines={1}>
                      {account.phone}
                    </Text>
                  )}
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {account.city}
                  </Text>
                </View>
              </View>

              <View style={[styles.badgeRow, { borderBottomColor: colors.border }]}>
                <Badge variant="outline">{`${account.trustTier} tier`}</Badge>
                <Badge variant={account.isEmailVerified ? 'success' : 'warning'}>
                  {`Email ${account.isEmailVerified ? 'verified' : 'unverified'}`}
                </Badge>
                {account.phone && (
                  <Badge variant={account.isPhoneVerified ? 'success' : 'warning'}>
                    {`Phone ${account.isPhoneVerified ? 'verified' : 'unverified'}`}
                  </Badge>
                )}
                <Badge variant={verificationBadgeVariant(account.verificationStatus)}>
                  {verificationBadgeLabel(account.verificationStatus)}
                </Badge>
              </View>
            </>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text variant="smallMedium" color="muted" style={styles.sectionTitle}>
                  {section.title.toUpperCase()}
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
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85%', padding: 0, gap: 0 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 12 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  profileText: { flex: 1, minWidth: 0, gap: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { paddingTop: 16 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 4, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  itemTextWrap: { gap: 1 },
  signOutRow: { marginTop: 8, marginBottom: 8 },
  signOutText: { color: '#dc2626' },
});
