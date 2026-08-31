import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Badge, Button, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface IdentityStatus {
  status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  lastError: string | null;
}

function badgeVariant(status: IdentityStatus['status']) {
  if (status === 'VERIFIED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  return 'warning' as const;
}

// Ports apps/provider/app/verification/identity/page.tsx.
export default function IdentityVerificationScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<IdentityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<IdentityStatus>('/api/verification/identity');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load verification status.');
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

  const handleStart = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const { url } = await api.request<{ url: string }>('/api/verification/identity/start', { method: 'POST' });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start verification.');
    } finally {
      setStarting(false);
    }
  }, []);

  if (loading || !data) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four }}>
        <Card style={styles.card}>
          <Text variant="small" color="muted">
            Confirm your identity with a government-issued ID (passport, driving licence, or national ID) and a quick selfie. This happens
            on Stripe's secure verification page — we never see or store your documents.
          </Text>

          <Badge variant={badgeVariant(data.status)}>{data.status}</Badge>

          {data.lastError && (
            <Text variant="small" style={styles.error}>
              {data.lastError}
            </Text>
          )}

          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}

          {data.status !== 'VERIFIED' && (
            <Button onPress={handleStart} loading={starting} style={styles.button}>
              {data.status === 'UNVERIFIED' ? 'Start identity verification' : 'Restart verification'}
            </Button>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  card: { gap: 10 },
  button: { marginTop: 4 },
  error: { color: '#dc2626' },
});
