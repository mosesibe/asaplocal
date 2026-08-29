import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { BottomTabInset } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';

// Presets for the env switcher below — only ever shown in dev/preview
// builds (__DEV__), never in a production release.
const PRESETS = [
  { label: 'Local dev', url: 'http://localhost:3000' },
  { label: 'Production', url: 'https://app.asaplocal.pro' },
];

export default function AccountScreen() {
  const { user, logout } = useSession();
  const { spacing } = useAppTheme();
  const [currentUrl, setCurrentUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getBaseUrl().then((url) => {
      setCurrentUrl(url);
      setDraftUrl(url);
    });
  }, []);

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
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.four, paddingBottom: BottomTabInset + spacing.four }]}>
          <Text variant="title" style={[styles.heading, { fontSize: 28, lineHeight: 34 }]}>
            Account
          </Text>
          <Card style={styles.card}>
            <Text variant="bodyMedium">{user?.email}</Text>
            <Text variant="small" color="muted">
              {user?.status}
            </Text>
          </Card>
          <Button variant="destructive" onPress={logout}>
            Log out
          </Button>

          {__DEV__ && (
            <Card style={styles.card}>
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
  safeArea: { flex: 1 },
  scroll: { gap: 24 },
  heading: { marginTop: 12 },
  card: { gap: 8 },
});
