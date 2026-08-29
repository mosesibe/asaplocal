import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';

export default function LoginScreen() {
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
      // Stack.Protected in the root layout swaps to (tabs) automatically
      // once useSession()'s user becomes non-null — no navigation call here.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login]);

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
        </Card>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  error: { color: '#dc2626' },
});
