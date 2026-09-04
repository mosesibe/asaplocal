import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Check } from 'lucide-react-native';
import { Screen, Text } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';
import { AuthHero } from '@/components/AuthHero';
import { authStyles as s } from '@/components/auth-styles';

// Ports Claude Design variant "1a — Dark, cleaned up — live job map":
// stylized map hero + pill-input form, replacing the previous plain light
// card. Auth logic is unchanged (useSession().login() + Stack.Protected
// auto-navigation in the root layout) — only the visuals are new.
export default function LoginScreen() {
  const { login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setDone(true);
      // Stack.Protected in the root layout swaps to (tabs) automatically
      // once useSession()'s user becomes non-null.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login]);

  return (
    <Screen style={s.screen}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <AuthHero />

        <View style={s.body}>
          <Text style={s.h1}>Back to work.</Text>
          <Text style={s.subtitle}>Log in to manage bookings, quotes and your subscription.</Text>

          {!done ? (
            <View style={s.form}>
              <View>
                <Text style={s.label}>Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="you@yourbusiness.co.uk"
                  placeholderTextColor="rgba(249,244,237,.35)"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <View>
                <Text style={s.label}>Password</Text>
                <View style={s.passwordWrap}>
                  <TextInput
                    style={[s.input, s.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(249,244,237,.35)"
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeButton} hitSlop={8}>
                    {showPassword ? <EyeOff size={20} color="rgba(249,244,237,.6)" /> : <Eye size={20} color="rgba(249,244,237,.6)" />}
                  </Pressable>
                </View>
              </View>
              {error && <Text style={s.error}>{error}</Text>}
              <Pressable style={({ pressed }) => [s.submitButton, pressed && s.submitButtonPressed]} onPress={handleLogin} disabled={submitting}>
                {submitting && <ActivityIndicator size="small" color="#fff9f2" />}
                <Text style={s.submitButtonText}>{submitting ? 'Logging in…' : 'Log in'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.doneWrap}>
              <View style={s.doneIcon}>
                <Check size={30} strokeWidth={2.75} color="#f9f4ed" />
              </View>
              <Text style={s.doneTitle}>You&apos;re in</Text>
              <Text style={s.doneSubtitle}>Opening your job board…</Text>
            </View>
          )}

          <View style={s.footer}>
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={s.footerLink}>Forgot password?</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={s.footerText}>
                New provider? <Text style={s.footerLinkAccent}>List your business</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
