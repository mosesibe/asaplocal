import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Badge, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';

// Presets for the env switcher below — only ever shown in dev/preview
// builds (__DEV__), never in a production release.
const PRESETS = [
  { label: 'Local dev', url: 'http://localhost:3001' },
  { label: 'Production', url: 'https://provider.asaplocal.pro' },
];

// Mirrors the web account page (apps/provider/app/account/page.tsx and its
// AccountIdentityCard) so the same details appear in the same order on both
// platforms: photo, name, email, phone, member since.
interface Account {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  memberSince: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

function formatMemberSince(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AccountScreen() {
  const { logout } = useSession();
  const { colors, spacing, radius } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const { pick, sheet } = usePhotoPicker();

  const [account, setAccount] = useState<Account | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [currentUrl, setCurrentUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .request<Account>('/api/mobile/account')
      .then(setAccount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.getBaseUrl().then((url) => {
      setCurrentUrl(url);
      setDraftUrl(url);
    });
  }, [load]);

  async function onChangePhoto() {
    const assets = await pick({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    const asset = assets[0];
    if (!asset || !account) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const url = await uploadImage(asset.uri, 'user-avatar', asset.mimeType ?? 'image/jpeg');
      // PATCH validates the whole profile object, so the existing names go
      // back with it — this only ever changes the photo.
      await api.request('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: account.firstName, lastName: account.lastName, avatarUrl: url }),
      });
      setAccount({ ...account, avatarUrl: url });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function applyUrl(url: string) {
    setSaving(true);
    try {
      // Switching backends means any stored session belongs to a different
      // database — clearing it and bouncing to login avoids the confusing
      // state of "logged in" against a user id that doesn't exist over there.
      await api.setBaseUrlOverride(url === api.defaultBaseUrl ? null : url);
      await logout();
      setCurrentUrl(url);
      setDraftUrl(url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.four, paddingBottom: bottomInset }]}>
          <View style={styles.header}>
            <Text variant="title" style={{ fontSize: 28, lineHeight: 34 }}>
              Account settings
            </Text>
            <Text variant="small" color="muted">
              Your personal account details — separate from your public business profile.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={[styles.row, styles.photoRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.brand[100], borderRadius: radius.full }]}>
                {account?.avatarUrl ? (
                  <Image source={{ uri: account.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text variant="bodyMedium" style={{ color: colors.brand[800] }}>
                    {initials(account?.name ?? '') || '?'}
                  </Text>
                )}
              </View>
              <View style={styles.photoText}>
                <Text variant="small" color="muted">
                  Photo
                </Text>
                <Button size="sm" variant="outline" onPress={onChangePhoto} loading={uploading} disabled={!account}>
                  {account?.avatarUrl ? 'Replace' : 'Upload'}
                </Button>
                {photoError && (
                  <Text variant="small" style={styles.errorText}>
                    {photoError}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowText}>
                <Text variant="small" color="muted">
                  Name
                </Text>
                <Text variant="bodyMedium">{account?.name || '—'}</Text>
              </View>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowText}>
                <Text variant="small" color="muted">
                  Email
                </Text>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {account?.email ?? '—'}
                </Text>
              </View>
              {account && <Badge variant={account.isEmailVerified ? 'success' : 'warning'}>{account.isEmailVerified ? 'Verified' : 'Unverified'}</Badge>}
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowText}>
                <Text variant="small" color="muted">
                  Phone
                </Text>
                <Text variant="bodyMedium">{account?.phone ?? '—'}</Text>
              </View>
              {account?.phone && <Badge variant={account.isPhoneVerified ? 'success' : 'warning'}>{account.isPhoneVerified ? 'Verified' : 'Unverified'}</Badge>}
            </View>

            <View style={styles.lastRow}>
              <View style={styles.rowText}>
                <Text variant="small" color="muted">
                  Member since
                </Text>
                <Text variant="bodyMedium">{formatMemberSince(account?.memberSince ?? null)}</Text>
              </View>
            </View>
          </Card>

          <Button variant="destructive" onPress={logout}>
            Log out
          </Button>
          <DeleteAccountSection />

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
        {sheet}
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { gap: 24 },
  header: { marginTop: 12, gap: 4 },
  card: { padding: 0, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { padding: 16 },
  rowText: { flexShrink: 1, gap: 2 },
  photoRow: { justifyContent: 'flex-start' },
  photoText: { gap: 6, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  devCard: { gap: 8 },
  // Matches the error colour other screens use (reviews, referrals) —
  // the native palette has no destructive token.
  errorText: { color: '#dc2626' },
});
