import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from './api';
import { registerForPushNotifications } from './push';
import type { MobileUser } from '@asaplocal/api-client';

interface SessionContextValue {
  user: MobileUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches the current user — e.g. after onboarding creates a Business,
   * so `user.hasBusiness` flips without requiring a fresh login. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await api.me();
    setUser(current);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  // Best-effort: a push token failing to register shouldn't block sign-in —
  // the provider just won't get native lead notifications on that device.
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then((registration) => {
        if (!registration) return;
        return api.request('/api/mobile/push/register', {
          method: 'POST',
          body: JSON.stringify(registration),
        });
      })
      .catch(() => {});
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await api.login(email, password);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout, refresh }), [user, isLoading, login, logout, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
