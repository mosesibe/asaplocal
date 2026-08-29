import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';

// Presets for the env switcher below — only ever shown in dev/preview
// builds (__DEV__), never in a production release.
const PRESETS = [
  { label: 'Local dev', url: 'http://localhost:3001' },
  { label: 'Production', url: 'https://provider.asaplocal.pro' },
];

export default function AccountScreen() {
  const { user, logout } = useSession();
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: BottomTabInset + Spacing.four }]}>
          <ThemedText type="subtitle" style={styles.heading}>
            Account
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{user?.email}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.status}
            </ThemedText>
          </ThemedView>
          <Pressable style={styles.button} onPress={logout}>
            <ThemedText style={styles.buttonText}>Log out</ThemedText>
          </Pressable>

          {__DEV__ && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">API environment (dev only)</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Currently: {currentUrl}
              </ThemedText>
              <TextInput style={styles.input} value={draftUrl} onChangeText={setDraftUrl} autoCapitalize="none" />
              <Pressable style={styles.envButton} onPress={() => applyUrl(draftUrl)} disabled={saving}>
                {saving ? <ActivityIndicator /> : <ThemedText style={styles.envButtonText}>Switch & log out</ThemedText>}
              </Pressable>
              {PRESETS.map((p) => (
                <Pressable key={p.url} onPress={() => applyUrl(p.url)} disabled={saving}>
                  <ThemedText type="linkPrimary">{p.label}: {p.url}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.four },
  heading: { marginTop: Spacing.three },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dc2626',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#dc2626', fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  envButton: {
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  envButtonText: { color: '#ffffff', fontWeight: '600' },
});
