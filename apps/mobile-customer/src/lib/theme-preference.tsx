import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'asaplocal:themePreference';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

// Ports apps/web/components/account/preferences.tsx's theme control —
// web persists to localStorage via @asaplocal/ui's useTheme(); this is the
// same idea via AsyncStorage, kept mobile-customer-local (see the
// schemeOverride prop comment on UiNativeThemeProvider) rather than adding
// AsyncStorage as a hard dependency of the shared ui-native package.
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  return ctx;
}
