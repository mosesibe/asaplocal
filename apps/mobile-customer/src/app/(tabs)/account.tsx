import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { HelpCircle, FileText, Shield } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { ProfileCard } from '@/components/account/ProfileCard';
import { SectionCard, SectionRow } from '@/components/account/SectionRow';
import { VerifyEmailRow } from '@/components/account/VerifyEmailRow';
import { VerifyPhoneRow } from '@/components/account/VerifyPhoneRow';
import { PreferencesRows } from '@/components/account/PreferencesRows';
import { MarketingRows } from '@/components/account/MarketingRows';
import { InvoicesSection } from '@/components/account/InvoicesSection';
import { ReferralCard } from '@/components/account/ReferralCard';
import { AddressesSection } from '@/components/account/AddressesSection';
import { SecuritySection } from '@/components/account/SecuritySection';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';

const WEB_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PRESETS = [
  { label: 'Local dev', url: 'http://localhost:3000' },
  { label: 'Production', url: 'https://app.asaplocal.pro' },
];

interface AccountData {
  user: { email: string; phone: string | null; status: string; createdAt: string; emailVerified: boolean; phoneVerified: boolean; marketingEmail: boolean; marketingSms: boolean };
  profile: { firstName: string; lastName: string; avatarUrl: string | null } | null;
  stats: { totalSpentPence: number; servicesRequested: number };
  signInMethods: string[];
  hasPasskey: boolean;
  addresses: { id: string; addressLine: string; city: string; postcode: string | null }[];
  invoices: { id: string; bookingId: string | null; businessName: string | null; type: string; typeLabel: string; amountPence: number; createdAt: string; invoiceRef: string }[];
}

// Ports apps/web/app/dashboard/page.tsx — the full "My account" page,
// composed from the same sub-sections as web, all backed by the new
// GET /api/account composite route (one round trip instead of five).
export default function AccountScreen() {
  const { user, logout } = useSession();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<AccountData>('/api/account');
      setData(res);
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

  useEffect(() => {
    api.getBaseUrl().then((url) => {
      setCurrentUrl(url);
      setDraftUrl(url);
    });
  }, []);

  async function applyUrl(url: string) {
    setSaving(true);
    try {
      await api.setBaseUrlOverride(url === api.defaultBaseUrl ? null : url);
      await logout();
      setCurrentUrl(url);
      setDraftUrl(url);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  const name = data.profile ? `${data.profile.firstName} ${data.profile.lastName}`.trim() : user?.email;
  const contact = data.user.email + (data.user.phone ? ` · ${data.user.phone}` : '');

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}>
          <Text variant="title" style={[styles.heading, { fontSize: 28, lineHeight: 34 }]}>
            My account
          </Text>

          <ProfileCard
            name={name || data.user.email}
            avatarUrl={data.profile?.avatarUrl ?? null}
            contact={contact}
            status={data.user.status}
            memberSince={data.user.createdAt}
            totalSpentPence={data.stats.totalSpentPence}
            servicesRequested={data.stats.servicesRequested}
            onAvatarChanged={(avatarUrl) => setData((d) => (d ? { ...d, profile: d.profile ? { ...d.profile, avatarUrl } : d.profile } : d))}
          />

          <SectionCard title="Account">
            <VerifyEmailRow email={data.user.email} verified={data.user.emailVerified} />
            <VerifyPhoneRow phone={data.user.phone} verified={data.user.phoneVerified} onVerified={load} />
            <PreferencesRows />
            <MarketingRows initialEmail={data.user.marketingEmail} initialSms={data.user.marketingSms} />
            <InvoicesSection invoices={data.invoices} />
            <ReferralCard />
          </SectionCard>

          <AddressesSection initial={data.addresses} />

          <SecuritySection signInMethods={data.signInMethods} hasPasskey={data.hasPasskey} onChanged={load} />

          <SectionCard title="Support">
            <SectionRow icon={HelpCircle} label="Help center" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/help`)} />
            <SectionRow icon={FileText} label="Terms of service" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/terms`)} />
            <SectionRow icon={Shield} label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)} />
          </SectionCard>

          <DeleteAccountSection />

          <Button variant="destructive" onPress={logout} style={styles.signOut}>
            Sign out
          </Button>

          {__DEV__ && (
            <Card style={styles.devCard}>
              <Text variant="bodyMedium">API environment (dev only)</Text>
              <Text variant="small" color="muted">
                Currently: {currentUrl}
              </Text>
              <TextField value={draftUrl} onChangeText={setDraftUrl} autoCapitalize="none" />
              <Button onPress={() => applyUrl(draftUrl)} loading={saving}>
                Switch & log out
              </Button>
              {PRESETS.map((p) => (
                <Pressable key={p.url} onPress={() => applyUrl(p.url)} disabled={saving}>
                  <Text variant="link" color="brand">
                    {p.label}: {p.url}
                  </Text>
                </Pressable>
              ))}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  scroll: { gap: 0 },
  heading: { marginTop: 12, marginBottom: 16 },
  signOut: { marginTop: 24 },
  devCard: { gap: 8, marginTop: 24 },
});
