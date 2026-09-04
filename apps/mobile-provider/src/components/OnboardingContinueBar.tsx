import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Card, Text, Button } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';
import { api } from '@/lib/api';

/**
 * Ports apps/provider/components/onboarding-continue-bar.tsx: shown on the
 * services and verification screens when reached as part of the post-signup
 * wizard (?onboarding=1) — lets the provider move on without hunting for
 * regular nav, which isn't reachable yet at this point.
 */
export function OnboardingContinueBar({
  label,
  hint,
  nextHref,
  markComplete,
}: {
  label: string;
  hint: string;
  nextHref: Href;
  /** Marks the wizard itself as finished (called on the last step only). */
  markComplete?: boolean;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [loading, setLoading] = useState(false);

  async function onPress() {
    setLoading(true);
    try {
      if (markComplete) {
        await api.request('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
        await refresh();
      }
      router.push(nextHref);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text variant="small" color="muted" style={styles.hint}>
        {hint}
      </Text>
      <Button onPress={onPress} loading={loading}>
        {label}
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, marginBottom: 16 },
  hint: { lineHeight: 18 },
});
