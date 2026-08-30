import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Globe, Monitor } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';
import { SectionRow } from './SectionRow';

const LOCALE_STORAGE_KEY = 'asaplocal:locale';
const LOCALES = [
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Ports apps/web/components/account/preferences.tsx — purely local, no API
// calls (language selection is stored but has no effect anywhere else on
// web either; kept equally cosmetic here for parity, not a missing feature).
export function PreferencesRows() {
  const { colors } = useAppTheme();
  const { preference, setPreference } = useThemePreference();
  const [locale, setLocale] = useState('en-GB');

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
      if (stored) setLocale(stored);
    });
  }, []);

  function cycleLocale() {
    const idx = LOCALES.findIndex((l) => l.code === locale);
    const next = LOCALES[(idx + 1) % LOCALES.length];
    setLocale(next.code);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, next.code).catch(() => {});
  }

  function cycleTheme() {
    const idx = THEMES.findIndex((t) => t.value === preference);
    setPreference(THEMES[(idx + 1) % THEMES.length].value);
  }

  return (
    <>
      <SectionRow
        icon={Globe}
        label="Language"
        onPress={cycleLocale}
        right={<PillValue label={LOCALES.find((l) => l.code === locale)?.label ?? locale} />}
      />
      <SectionRow
        icon={Monitor}
        label="Theme"
        onPress={cycleTheme}
        right={<PillValue label={THEMES.find((t) => t.value === preference)?.label ?? preference} />}
      />
    </>
  );
}

function PillValue({ label }: { label: string }) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4 },
});
