import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';

// Ports apps/web/app/login/page.tsx: a plain top-aligned "Log in" heading
// (no logo lockup — the web page doesn't have one either) over a card with
// labeled fields, matching apps/mobile-provider/src/app/login.tsx's already-
// rebuilt structure/style. Web also offers "Continue with Google" — not
// ported here, since native Google Sign-In needs its own OAuth client setup
// this pass didn't touch.
export default function LoginScreen() {
  const router = useRouter();
  const { callbackUrl } = useLocalSearchParams<{ callbackUrl?: string }>();
  const { login } = useSession();
  const { colors, radius, spacing } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace((callbackUrl as Href) ?? '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, callbackUrl, router]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.heading}>
          Log in
        </Text>

        <Card style={[styles.card, { borderRadius: radius.xl }]}>
          <View>
            <Text variant="smallMedium" style={styles.label}>
              Email
            </Text>
            <TextField autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </View>
          <View>
            <Text variant="smallMedium" style={styles.label}>
              Password
            </Text>
            <View style={styles.passwordWrap}>
              <TextField style={styles.passwordField} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton} hitSlop={8}>
                {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
              </Pressable>
            </View>
          </View>
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={handleLogin} loading={submitting}>
            Log in
          </Button>

          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text variant="small" color="muted" style={styles.centerText}>
              Forgot password?
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/register', params: callbackUrl ? { callbackUrl } : undefined })}
          >
            <Text variant="small" color="muted" style={styles.centerText}>
              No account? <Text variant="smallMedium" color="brand">Sign up</Text>
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  heading: { marginTop: 12, fontSize: 22, lineHeight: 28 },
  card: { marginTop: 20, gap: 12 },
  label: { marginBottom: 6 },
  passwordWrap: { justifyContent: 'center' },
  passwordField: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 14, height: '100%', justifyContent: 'center' },
  centerText: { textAlign: 'center', marginTop: 4 },
  error: { color: '#dc2626' },
});
