import { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, View, StyleSheet } from 'react-native';
import { Screen, Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';

// Ports the account drawer's "Preferences" panel
// (apps/provider/components/marketing-preferences.tsx) as its own pushed
// screen, matching this app's pattern of real screens over in-drawer panels.
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function PreferencesScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const { preference, setPreference } = useThemePreference();
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .request<{ email: boolean; sms: boolean }>('/api/account/marketing')
      .then((res) => {
        setEmail(res.email);
        setSms(res.sms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: { email?: boolean; sms?: boolean }) => {
    setError(null);
    if (next.email !== undefined) setEmail(next.email);
    if (next.sms !== undefined) setSms(next.sms);
    try {
      await api.request('/api/account/marketing', { method: 'PATCH', body: JSON.stringify(next) });
    } catch {
      if (next.email !== undefined) setEmail((v) => !v);
      if (next.sms !== undefined) setSms((v) => !v);
      setError("Couldn't save that — please try again.");
    }
  }, []);

  function cycleTheme() {
    const idx = THEMES.findIndex((t) => t.value === preference);
    setPreference(THEMES[(idx + 1) % THEMES.length].value);
  }

  const themeLabel = THEMES.find((t) => t.value === preference)?.label ?? preference;

  if (loading) return <Screen />;

  return (
    <Screen>
      <View style={[styles.container, { padding: spacing.four }]}>
        <Card style={styles.card}>
          <Pressable
            onPress={cycleTheme}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Theme: ${themeLabel}. Tap to change.`}
          >
            <View style={styles.flex1}>
              <Text variant="smallMedium">Theme</Text>
              <Text variant="caption" color="muted">
                Follow your device, or force light or dark.
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
              <Text variant="caption" color="muted">
                {themeLabel}
              </Text>
            </View>
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text variant="smallMedium">Marketing emails</Text>
              <Text variant="caption" color="muted">
                Product news, lead tips and offers.
              </Text>
            </View>
            <Switch value={email} onValueChange={(v) => save({ email: v })} trackColor={{ true: colors.brand[600] }} />
          </View>
          <View style={[styles.row, styles.divider, { borderTopColor: colors.border }]}>
            <View style={styles.flex1}>
              <Text variant="smallMedium">Marketing texts</Text>
              <Text variant="caption" color="muted">
                Occasional SMS offers.
              </Text>
            </View>
            <Switch value={sms} onValueChange={(v) => save({ sms: v })} trackColor={{ true: colors.brand[600] }} />
          </View>
        </Card>
        <Text variant="caption" color="muted" style={styles.footnote}>
          These only affect promotional messages. Job, payment and payout notifications always send.
        </Text>
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  flex1: { flex: 1 },
  footnote: { paddingHorizontal: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4 },
  error: { color: '#dc2626', paddingHorizontal: 4 },
});
