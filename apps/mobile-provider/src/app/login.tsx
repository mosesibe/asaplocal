import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';

// Ports apps/provider/app/login/page.tsx exactly: AuthBrand lockup, "Log in
// to your account" heading, top-aligned (not centred) card, forgot-password
// and "List your business" links — the native screen was previously just a
// bare card with none of that, nothing like the web page it's meant to
// match.
export default function LoginScreen() {
  const { login } = useSession();
  const router = useRouter();
  const { colors, radius, spacing, scheme } = useAppTheme();
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
      // Stack.Protected in the root layout swaps to (tabs) automatically
      // once useSession()'s user becomes non-null — no navigation call here.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login]);

  return (
    <Screen>
        <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <Image source={require('@/assets/images/splash-icon.png')} style={styles.mark} resizeMode="contain" />
            <Text variant="bodyMedium" style={styles.wordmark}>
              Asap<Text style={{ color: scheme === 'dark' ? colors.brand[300] : colors.brand[500] }}>Local</Text>
            </Text>
            <Text variant="small" color="muted">
              Business
            </Text>
          </View>

          <Text variant="title" style={styles.heading}>
            Log in to your account
          </Text>

          <Card style={[styles.card, { borderRadius: radius.xl }]}>
            <TextField placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <View style={styles.passwordWrap}>
              <TextField
                style={styles.passwordField}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton} hitSlop={8}>
                {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
              </Pressable>
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
            <Pressable onPress={() => router.push('/register')}>
              <Text variant="small" color="muted" style={styles.centerText}>
                New provider? <Text variant="smallMedium" color="brand">List your business</Text>
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
  mark: { width: 28, height: 28, alignSelf: 'center' },
  wordmark: { fontSize: 20, fontWeight: '800' },
  heading: { marginTop: 20, fontSize: 22, lineHeight: 28 },
  card: { marginTop: 20, gap: 12 },
  passwordWrap: { justifyContent: 'center' },
  passwordField: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 14, height: '100%', justifyContent: 'center' },
  centerText: { textAlign: 'center', marginTop: 4 },
  error: { color: '#dc2626' },
});
