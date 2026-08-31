import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, TextField } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

// Ports apps/provider/app/forgot-password/page.tsx's request step only. The
// actual reset happens by tapping the emailed link, which opens a real
// browser to /reset-password?token=... — no app deep-link is wired to that
// URL, so the token-consuming step intentionally stays a web-only flow.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email address.');
    setSubmitting(true);
    try {
      await api.request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setDone(true);
    } catch {
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  if (done) {
    return (
      <Screen style={styles.centered}>
        <View style={styles.doneBlock}>
          <Text variant="title" style={styles.center}>
            Check your inbox
          </Text>
          <Text variant="body" color="muted" style={styles.center}>
            If an account exists for {email}, we've sent a link to reset your password. The link expires in 1 hour.
          </Text>
          <Pressable onPress={() => router.replace('/login')}>
            <Text variant="smallMedium" color="brand">
              Back to log in
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.centered}>
      <View style={styles.block}>
        <Text variant="title" style={styles.h1}>
          Forgot your password?
        </Text>
        <Text variant="body" color="muted">
          Enter your email and we'll send you a link to reset it.
        </Text>
        <Card style={styles.card}>
          <TextField placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={handleSubmit} loading={submitting}>
            Send reset link
          </Button>
        </Card>
        <Pressable style={styles.footerLink} onPress={() => router.replace('/login')}>
          <Text variant="small" color="muted">
            Back to log in
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  block: { width: '100%', maxWidth: 400, paddingHorizontal: 24, gap: 12 },
  h1: { fontSize: 22, lineHeight: 28 },
  card: { gap: 12, marginTop: 8 },
  error: { color: '#dc2626' },
  footerLink: { alignItems: 'center' },
  doneBlock: { maxWidth: 340, alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  center: { textAlign: 'center' },
});
