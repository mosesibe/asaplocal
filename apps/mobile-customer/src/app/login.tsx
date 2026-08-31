import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const router = useRouter();
  const { callbackUrl } = useLocalSearchParams<{ callbackUrl?: string }>();
  const { login } = useSession();
  const { spacing } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Home/Search/provider profiles are public, so unlike a hard
      // logged-out/logged-in Stack.Protected swap, there's a specific page
      // to return to — whatever gated action sent the customer here (see
      // lib/auth-guard.ts) — rather than always landing back on Home.
      router.replace((callbackUrl as Href) ?? '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, callbackUrl, router]);

  return (
    <Screen style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Card style={{ width: '100%', maxWidth: 420, gap: spacing.three }}>
          <Text variant="title">AsapLocal</Text>
          <TextField placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={handleLogin} loading={submitting}>
            Log in
          </Button>
          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text variant="small" color="muted" style={styles.center}>
              Forgot your password?
            </Text>
          </Pressable>
        </Card>
        <Pressable
          style={styles.signUpLink}
          onPress={() => router.push({ pathname: '/register', params: callbackUrl ? { callbackUrl } : undefined })}
        >
          <Text variant="small" color="muted">
            New to AsapLocal? <Text variant="smallMedium" color="brand">Sign up</Text>
          </Text>
        </Pressable>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  error: { color: '#dc2626' },
  center: { textAlign: 'center' },
  signUpLink: { marginTop: 20 },
});
